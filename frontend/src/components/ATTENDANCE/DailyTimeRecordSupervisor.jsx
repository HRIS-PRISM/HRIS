/**
 * Supervisor DTR — standalone page (same pattern as LeaveRequestSupervisor).
 * Reuses DTR table/print helpers from DailyTimeRecordOverall via shared modules.
 */

import API_BASE_URL from '../../apiConfig';
import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import axios from 'axios';
import {
  Box, Grid, Card, Typography, Checkbox, Button, Paper, Fade,
  IconButton, Tooltip, List, ListItemButton, CircularProgress, Alert,
  Dialog, DialogContent, Snackbar, Avatar, Chip,
} from '@mui/material';
import {
  AccessTime, CalendarToday, Refresh,
  SupervisorAccount as SupervisorIcon, Domain as DomainIcon,
  Group as GroupIcon, ArrowBack, ArrowForward, Close,
} from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { styled, alpha } from '@mui/material/styles';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import AccessDenied from '../AccessDenied';
import {
  AttendanceFilterHeader,
  AttendanceFilterSectionLabel,
  AttendanceFilterDateControls,
  applyQuickDateRange,
  filterPanelScrollSx,
  filterSidebarCardSx,
  MONTHS_SHORT,
} from './attendanceFilterLayout';
import LoadingOverlay from '../LoadingOverlay';
import usePageAccess from '../../hooks/usePageAccess';
import { normalizeRole } from '../../utils/pageAccessUtils';
import { getUserInfo, getAuthHeaders as buildAuthHeaders } from '../../utils/auth';
import {
  formatFullName, filterByDtrType,
  formatDtrPdfFileName, formatDtrBulkPdfFileName,
} from '../../utils/dtrFormatHelpers';
import {
  fetchDailyLateUndertimeBatch, parseHalfDayDatesSet,
} from '../../utils/dtrLateUndertimeFromOverall';
import { fetchOfficialTimesBatch } from '../../utils/fetchOfficialTimesBatch';
import { MODULE_TYPES } from '../../utils/halfDayReview';
import DTRTemplate from './DTRTemplate';
import { DtrTableContainer } from './DtrTablePairView';
import {
  printDtrHtmlPages,
  downloadDtrHtmlPages,
} from './DailyTimeRecordPrintable';

const getAuthHeaders = () => buildAuthHeaders();

const getSupervisorEmployeeNumber = () => {
  const resolved = getUserInfo()?.employeeNumber || localStorage.getItem('employeeNumber');
  return resolved ? String(resolved).trim() : null;
};

const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).role || null;
  } catch { return null; }
};

const scopeForModuleType = (mod) => {
  if (mod === MODULE_TYPES.NON_TEACHING) return 'non_teaching';
  if (
    mod === MODULE_TYPES.FACULTY_30HRS ||
    mod === MODULE_TYPES.DESIGNATED_40HRS
  ) {
    return 'academic';
  }
  return null;
};

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven: '#ffffff',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const getEmployeeInitials = (user) => {
  const last = user?.lastName?.[0];
  const first = user?.firstName?.[0];
  if (last || first) {
    return `${last || ''}${first || ''}`.toUpperCase() || '?';
  }
  const nm = String(user?.fullName || '').trim();
  if (!nm) return '?';
  const parts = nm.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return nm[0]?.toUpperCase() || '?';
};

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
};

const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DailyTimeRecordSupervisor = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess('daily-time-record-supervisor');
  const supervisorEmpNum = getSupervisorEmployeeNumber();
  const userRole = getUserRole();

  const [supervisorCtx, setSupervisorCtx] = useState(null);
  const [ctxLoading, setCtxLoading] = useState(true);

  const [dtrType, setDtrType] = useState('regular');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showOfficialTimeOnDtr, setShowOfficialTimeOnDtr] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewId, setPreviewId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadPhase, setLoadPhase] = useState('');

  const [holidays, setHolidays] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [batchOfficialTimesMap, setBatchOfficialTimesMap] = useState({});
  const [computedLateByEmployee, setComputedLateByEmployee] = useState({});
  const [halfDayDatesByEmployee, setHalfDayDatesByEmployee] = useState({});
  const [halfDayReviewByEmployee, setHalfDayReviewByEmployee] = useState({});
  const [computationModuleTypeByEmployee, setComputationModuleTypeByEmployee] = useState({});
  const [approvedLeavesByEmployee, setApprovedLeavesByEmployee] = useState({});

  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const abortRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const fetchContext = useCallback(async () => {
    setCtxLoading(true);
    const empty = { isSupervisor: false, departments: [] };
    const endpoints = [
      `${API_BASE_URL}/api/supervisor-dtr/context/me`,
      `${API_BASE_URL}/api/supervisor-leave/context/me`,
    ];
    try {
      let data = empty;
      for (const url of endpoints) {
        try {
          const r = await axios.get(url, getAuthHeaders());
          data = r.data || empty;
          if (data.isSupervisor || data.departments?.length > 0) break;
        } catch {
          /* try next endpoint */
        }
      }
      setSupervisorCtx(data);
      return data;
    } catch {
      setSupervisorCtx(empty);
      return null;
    } finally {
      setCtxLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = await fetchContext();
      if (cancelled) return;
      if (ctx?.isSupervisor || ctx?.departments?.length > 0) {
        window.dispatchEvent(new CustomEvent('pageAccessUpdated', {
          detail: { employeeNumber: ctx.supervisorEmployeeNumber || supervisorEmpNum },
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [fetchContext, supervisorEmpNum]);

  useEffect(() => {
    const loadStatic = async () => {
      try {
        const [hRes, sRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders()),
        ]);
        setHolidays(Array.isArray(hRes.data) ? hRes.data : []);
        setSuspensions(Array.isArray(sRes.data) ? sRes.data : []);
      } catch { /* ignore */ }
    };
    loadStatic();
  }, []);

  const deptOptions = useMemo(
    () => (supervisorCtx?.departments || []).map((d) => ({
      code: d.code,
      description: d.description || d.code,
    })),
    [supervisorCtx],
  );

  const fetchBatchOfficialTimes = useCallback(async (employeeNumbers, periodStart, periodEnd) => {
    if (!employeeNumbers?.length) return {};
    return fetchOfficialTimesBatch(
      employeeNumbers,
      periodStart,
      periodEnd,
      getAuthHeaders,
    );
  }, []);

  const loadEmployeesDtr = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setLoadPhase('Loading employees…');
    setEmployees([]);
    setSelectedIds(new Set());
    setPreviewId(null);

    const cfg = () => ({ ...getAuthHeaders(), signal });

    try {
      const params = {};
      if (deptFilter !== 'all') params.departmentCode = deptFilter;

      const empRes = await axios.get(
        `${API_BASE_URL}/api/supervisor-dtr/employees/me`,
        { params, ...cfg() },
      );
      const empList = empRes.data || [];
      if (!empList.length) {
        setSnackbar({ open: true, message: 'No employees found in your assigned department(s).', severity: 'warning' });
        return;
      }

      const skeleton = empList.map((emp) => {
        const empNum = emp.personID;
        const displayName = emp.firstName && emp.lastName
          ? formatFullName({ firstName: emp.firstName, lastName: emp.lastName, middleName: emp.middleName })
          : emp.devicePersonName || String(empNum);
        return {
          employeeNumber: empNum,
          fullName: displayName,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          middleName: emp.middleName || '',
          departmentCode: emp.departmentCode || '',
          employmentCategory: emp.employmentCategory ?? null,
          branch: emp.branch ?? null,
          records: [],
          _loading: true,
        };
      });
      setEmployees(skeleton);
      // Unblock UI with names; hydrate punches by employeeNumbers (no global re-rank).
      setLoading(false);
      setLoadPhase(`Loading attendance (0 / ${empList.length})…`);

      const ATTENDANCE_CHUNK = 60;
      const ATTENDANCE_CONCURRENCY = 6;
      const empNums = skeleton.map((u) => u.employeeNumber);
      const chunks = [];
      for (let i = 0; i < empNums.length; i += ATTENDANCE_CHUNK) {
        chunks.push(empNums.slice(i, i + ATTENDANCE_CHUNK));
      }

      let hydrated = 0;
      for (let i = 0; i < chunks.length; i += ATTENDANCE_CONCURRENCY) {
        if (signal.aborted) break;
        const batch = chunks.slice(i, i + ATTENDANCE_CONCURRENCY);
        const batchRows = await Promise.all(
          batch.map(async (chunk) => {
            if (signal.aborted) return [];
            try {
              const pageRes = await axios.post(
                `${API_BASE_URL}/attendance/api/view-attendance-all-users-paged`,
                {
                  startDate,
                  endDate,
                  employeeNumbers: chunk,
                  skipCount: true,
                  skipAudit: true,
                },
                cfg(),
              );
              return pageRes.data?.data || [];
            } catch {
              return [];
            }
          }),
        );
        if (signal.aborted) return;

        const pageMap = new Map();
        batchRows.flat().forEach((record) => {
          const id = String(record.personID || record.agencyEmployeeNum || '').trim();
          if (!id) return;
          if (!pageMap.has(id)) pageMap.set(id, []);
          pageMap.get(id).push(record);
        });

        hydrated += batch.reduce((n, c) => n + c.length, 0);
        setLoadPhase(
          `Loading attendance (${Math.min(hydrated, empList.length)} / ${empList.length})…`,
        );

        setEmployees((prev) =>
          prev.map((user) => {
            const key = String(user.employeeNumber);
            if (!pageMap.has(key)) return user;
            const rows = pageMap.get(key);
            const filtered = filterByDtrType(rows, dtrType);
            return { ...user, records: filtered, _loading: false };
          }),
        );
      }

      if (signal.aborted) return;

      setEmployees((prev) =>
        prev.map((u) => (u._loading ? { ...u, _loading: false } : u)),
      );
      if (skeleton.length) setPreviewId(skeleton[0].employeeNumber);

      if (!signal.aborted) {
        setLoading(false);
        setLoadPhase('');
      }

      Promise.all([
        fetchBatchOfficialTimes(empNums, startDate, endDate),
        dtrType === 'regular'
          ? fetchDailyLateUndertimeBatch(empNums, startDate, endDate)
          : Promise.resolve(null),
        axios
          .get(`${API_BASE_URL}/leaveRoute/leave_request`, {
            ...cfg(),
            params: {
              status: '2',
              employeeNumbers: empNums.join(','),
            },
          })
          .catch(() => ({ data: [] })),
      ])
        .then(([timesMap, lateBatch, leaveRes]) => {
          if (signal.aborted) return;
          setBatchOfficialTimesMap(timesMap || {});

          if (lateBatch) {
            const halfSets = {};
            Object.entries(lateBatch.halfDayDatesByEmployee || {}).forEach(([emp, str]) => {
              halfSets[emp] = parseHalfDayDatesSet(str);
            });
            setComputedLateByEmployee(lateBatch.byEmployee || {});
            setHalfDayDatesByEmployee(halfSets);
            setHalfDayReviewByEmployee(lateBatch.halfDayReviewByEmployee || {});
            setComputationModuleTypeByEmployee(lateBatch.computationModuleTypeByEmployee || {});
          }

          const leavesByEmp = {};
          (leaveRes?.data || []).forEach((req) => {
            const key = String(req.employeeNumber);
            if (!leavesByEmp[key]) leavesByEmp[key] = [];
            leavesByEmp[key].push(req);
          });
          setApprovedLeavesByEmployee(leavesByEmp);
        })
        .catch(() => {});
    } catch (e) {
      if (e?.code !== 'ERR_CANCELED' && !signal.aborted) {
        setSnackbar({ open: true, message: e.response?.data?.error || 'Failed to load DTR data.', severity: 'error' });
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setLoadPhase('');
      }
    }
  }, [startDate, endDate, dtrType, deptFilter, fetchBatchOfficialTimes]);

  useEffect(() => {
    if (selectedMonth !== null && startDate && endDate) loadEmployeesDtr();
  }, [selectedMonth, startDate, endDate, dtrType, deptFilter, loadEmployeesDtr]);

  const handleMonthClick = (idx) => {
    const start = new Date(Date.UTC(selectedYear, idx, 1));
    const end = new Date(Date.UTC(selectedYear, idx + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(idx);
  };

  const handleQuickDateSelect = (value) => {
    applyQuickDateRange(value, setStartDate, setEndDate, setSelectedMonth);
  };

  const toggleSelect = (empNum) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(empNum) ? next.delete(empNum) : next.add(empNum);
      return next;
    });
  };

  const selectableEmployees = useMemo(
    () => employees.filter((u) => !u._loading),
    [employees],
  );

  const selectAllChecked =
    selectableEmployees.length > 0 &&
    selectableEmployees.every((u) => selectedIds.has(u.employeeNumber));

  const selectAllIndeterminate =
    selectedIds.size > 0 && !selectAllChecked;

  const handleSelectAll = (checked) => {
    if (checked) {
      const limited = selectableEmployees.slice(0, 50);
      setSelectedIds(new Set(limited.map((u) => u.employeeNumber)));
      if (selectableEmployees.length > 50) {
        setSnackbar({
          open: true,
          message: 'Only first 50 selected. Bulk print limit is 50 per batch.',
          severity: 'warning',
        });
      }
    } else {
      setSelectedIds(new Set());
    }
  };

  const previewUser = useMemo(
    () => employees.find((u) => String(u.employeeNumber) === String(previewId)) || null,
    [employees, previewId],
  );

  const handlePrintSelected = () => {
    const toPrint = employees.filter((u) => selectedIds.has(u.employeeNumber));
    if (!toPrint.length) {
      setSnackbar({ open: true, message: 'Select at least one employee to print.', severity: 'warning' });
      return;
    }
    if (toPrint.length > 50) {
      setSnackbar({ open: true, message: 'Maximum 50 employees per print batch.', severity: 'warning' });
      return;
    }
    // Preview only — do not mount all DTRs yet (one-at-a-time during Print All)
    setPreviewUsers(toPrint);
    setPreviewIndex(0);
    setPreviewModalOpen(true);
  };

  const resolvePdfFileName = (users) => {
    if (users.length === 1) {
      return formatDtrPdfFileName(users[0], startDate);
    }
    return formatDtrBulkPdfFileName(startDate, {
      department: deptFilter !== 'all' ? deptFilter : '',
    });
  };

  const buildDtrPrintPages = (users) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const pages = [];
    try {
      users.forEach((user) => {
        flushSync(() => {
          root.render(renderEmployeeDtr(user));
        });
        const html = container.firstElementChild?.outerHTML;
        if (html) pages.push(html);
      });
    } finally {
      root.unmount();
    }
    return pages;
  };

  const handlePrintAll = async () => {
    if (!previewUsers.length) return;
    try {
      setPrinting(true);
      setPrintStatus(
        previewUsers.length === 1
          ? 'Preparing DTR…'
          : `Preparing ${previewUsers.length} DTRs…`,
      );
      setPreviewModalOpen(false);
      await new Promise((r) => requestAnimationFrame(r));
      const pages = buildDtrPrintPages(previewUsers);
      if (!pages.length) throw new Error('No DTRs could be prepared.');
      await printDtrHtmlPages(pages, {
        title: resolvePdfFileName(previewUsers).replace(/\.pdf$/i, ''),
      });

      const year = new Date(startDate).getFullYear();
      const month = new Date(startDate).getMonth() + 1;
      await axios.post(
        `${API_BASE_URL}/attendance/api/mark-dtr-printed`,
        {
          employeeNumbers: previewUsers.map((u) => u.employeeNumber),
          year, month, startDate, endDate,
        },
        getAuthHeaders(),
      );
      setSnackbar({
        open: true,
        message: `Printed ${previewUsers.length} DTR(s).`,
        severity: 'success',
      });
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Print failed.', severity: 'error' });
    } finally {
      setPrinting(false);
      setPrintStatus('');
    }
  };

  const handleDownloadAll = async () => {
    if (!previewUsers.length) return;
    try {
      setPrinting(true);
      setPrintStatus(
        previewUsers.length === 1
          ? 'Preparing PDF download…'
          : `Preparing PDF ${previewUsers.length} DTRs…`,
      );
      setPreviewModalOpen(false);
      await new Promise((r) => requestAnimationFrame(r));
      const pages = buildDtrPrintPages(previewUsers);
      if (!pages.length) throw new Error('No DTRs could be prepared.');
      const fileName = resolvePdfFileName(previewUsers);
      await downloadDtrHtmlPages(pages, fileName, {
        title: fileName.replace(/\.pdf$/i, ''),
        onProgress: (done, total) => {
          if (done === 1 || done === total || done % 5 === 0) {
            setPrintStatus(`Building PDF ${done} of ${total}…`);
          }
        },
      });
      setSnackbar({
        open: true,
        message: `Downloaded ${previewUsers.length} DTR(s).`,
        severity: 'success',
      });
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Download failed.', severity: 'error' });
    } finally {
      setPrinting(false);
      setPrintStatus('');
    }
  };

  const renderEmployeeDtr = (user) => {
    const empKey = String(user.employeeNumber);
    const knownModuleType = computationModuleTypeByEmployee[empKey] || null;
    return (
      <DtrTableContainer>
        <DTRTemplate
          employeeName={user.fullName}
          records={user.records}
          officialTime={batchOfficialTimesMap[user.employeeNumber] || {}}
          showOfficialTimeOnDtr={showOfficialTimeOnDtr}
          startDate={startDate}
          endDate={endDate}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          holidays={holidays}
          suspensions={suspensions}
          approvedLeaves={approvedLeavesByEmployee[empKey] || []}
          computedLateByDate={computedLateByEmployee[empKey] || {}}
          suggestedHalfDayDatesSet={halfDayDatesByEmployee[empKey] || new Set()}
          halfDayReviewByDate={halfDayReviewByEmployee[empKey] || {}}
          computationModuleType={knownModuleType || MODULE_TYPES.NON_TEACHING}
          employeeScope={scopeForModuleType(knownModuleType)}
          employmentCategory={user.employmentCategory ?? null}
          employeeBranch={user.branch ?? null}
          dtrType={dtrType}
        />
      </DtrTableContainer>
    );
  };

  const renderLeftPanelContent = () => (
    <Box sx={filterPanelScrollSx}>
      {deptOptions.length > 1 && (
        <>
          <AttendanceFilterSectionLabel icon={DomainIcon}>Department</AttendanceFilterSectionLabel>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.25 }}>
            <Chip
              size="small"
              label="All Departments"
              onClick={() => setDeptFilter('all')}
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: deptFilter === 'all' ? T.accent : 'transparent',
                color: deptFilter === 'all' ? '#fff' : T.accent,
                border: `1px solid ${deptFilter === 'all' ? T.accent : T.accentBorder}`,
                '&:hover': { bgcolor: deptFilter === 'all' ? T.accentDark : T.accentFaint },
              }}
            />
            {deptOptions.map((d) => (
              <Chip
                key={d.code}
                size="small"
                icon={<DomainIcon sx={{ fontSize: '14px !important' }} />}
                label={d.description}
                onClick={() => setDeptFilter(d.code)}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  bgcolor: deptFilter === d.code ? T.accent : 'transparent',
                  color: deptFilter === d.code ? '#fff' : T.accent,
                  border: `1px solid ${deptFilter === d.code ? T.accent : T.accentBorder}`,
                  '&:hover': { bgcolor: deptFilter === d.code ? T.accentDark : T.accentFaint },
                  '& .MuiChip-icon': { color: deptFilter === d.code ? '#fff' : T.accent },
                }}
              />
            ))}
          </Box>
        </>
      )}

      <AttendanceFilterSectionLabel icon={PrintIcon}>DTR Type</AttendanceFilterSectionLabel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '3px',
          mb: 1.25,
        }}
      >
        {[
          { val: 'regular', label: 'Regular' },
          { val: 'honorarium', label: 'Honorarium' },
          { val: 'service-credit', label: 'Service Credit' },
          { val: 'overtime', label: 'Overtime' },
        ].map(({ val, label }) => {
          const isActive = dtrType === val;
          return (
            <Box
              key={val}
              onClick={() => setDtrType(val)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1,
                py: 0.45,
                borderRadius: '6px',
                cursor: 'pointer',
                border: `1px solid ${isActive ? T.accent : 'transparent'}`,
                bgcolor: isActive ? T.accent : 'transparent',
                transition: 'all 0.14s ease',
                minHeight: 26,
                '&:hover': isActive
                  ? {}
                  : { bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : T.text,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </Typography>
              {isActive && (
                <Box
                  sx={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.7)',
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      <AttendanceFilterDateControls
        selectedYear={selectedYear}
        onYearChange={(e) => { setSelectedYear(+e.target.value); setSelectedMonth(null); }}
        yearOptions={yearOptions}
        selectedMonth={selectedMonth}
        onMonthClick={handleMonthClick}
        onMonthClear={() => { setSelectedMonth(null); setStartDate(''); setEndDate(''); }}
        onQuickDate={handleQuickDateSelect}
        months={MONTHS_SHORT}
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mt: 2,
          mb: 0.5,
          px: 1,
          py: 0.75,
          borderRadius: '8px',
          border: `1px solid ${showOfficialTimeOnDtr ? T.accent : T.accentBorder}`,
          bgcolor: showOfficialTimeOnDtr ? alpha(T.accent, 0.06) : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: alpha(T.accent, 0.05),
            border: `1px solid ${T.accent}`,
          },
        }}
        onClick={() => setShowOfficialTimeOnDtr((v) => !v)}
        className="no-print"
      >
        <Checkbox
          size="small"
          checked={showOfficialTimeOnDtr}
          onChange={(e) => {
            e.stopPropagation();
            setShowOfficialTimeOnDtr(e.target.checked);
          }}
          sx={{
            p: 0,
            color: alpha(T.accent, 0.5),
            '&.Mui-checked': { color: T.accent },
          }}
        />
        <Typography
          sx={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: showOfficialTimeOnDtr ? T.accent : T.text,
            lineHeight: 1.3,
            userSelect: 'none',
          }}
        >
          Show official time on DTR
        </Typography>
      </Box>

      {selectedMonth !== null && employees.length > 0 && (
        <Box
          sx={{
            mt: 2,
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: T.accentFaint,
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: alpha(T.accent, 0.6),
              mb: 0.5,
            }}
          >
            Department Summary
          </Typography>
          <Typography
            sx={{ fontSize: '0.9rem', fontWeight: 800, color: T.text, lineHeight: 1.3 }}
          >
            {loading ? '—' : `${employees.length} ${employees.length === 1 ? 'employee' : 'employees'} found`}
          </Typography>
          {!loading && (
            <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.4 }}>
              Select employees below, then print selected DTRs.
            </Typography>
          )}
        </Box>
      )}

      {selectedMonth !== null && (
        <>
          <AttendanceFilterSectionLabel icon={GroupIcon}>
            Department Employees {employees.length > 0 && `(${employees.length})`}
          </AttendanceFilterSectionLabel>
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${T.accentBorder}`,
              borderRadius: 2,
              bgcolor: T.surface,
              mb: 1.5,
              minHeight: 160,
              overflow: 'hidden',
            }}
          >
            {employees.length === 0 ? (
              loading ? null : (
                <Typography sx={{ p: 2, fontSize: '0.78rem', color: T.muted, textAlign: 'center' }}>
                  No employees in your department(s).
                </Typography>
              )
            ) : (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.65,
                    borderBottom: `1px solid ${T.divider}`,
                    bgcolor: '#faf7f7',
                    flexShrink: 0,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectAllChecked}
                    indeterminate={selectAllIndeterminate}
                    disabled={!selectableEmployees.length || loading}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    sx={{
                      p: 0.35,
                      '&.Mui-checked': { color: T.accent },
                      '&.MuiCheckbox-indeterminate': { color: T.accent },
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: T.accent,
                      userSelect: 'none',
                      cursor: selectableEmployees.length && !loading ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (!selectableEmployees.length || loading) return;
                      handleSelectAll(!selectAllChecked);
                    }}
                  >
                    Select all
                    {selectedIds.size > 0 && (
                      <Box component="span" sx={{ fontWeight: 600, color: T.muted, ml: 0.5 }}>
                        ({selectedIds.size})
                      </Box>
                    )}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    minHeight: 0,
                    ...scrollbarSx,
                  }}
                >
                  <List dense disablePadding>
                    {employees.map((user, idx) => {
                      const empNum = user.employeeNumber;
                      const isPreview = String(previewId) === String(empNum);
                      const isSelected = selectedIds.has(empNum);
                      return (
                        <ListItemButton
                          key={empNum}
                          selected={isPreview}
                          onClick={() => setPreviewId(empNum)}
                          sx={{
                            py: 0.85,
                            px: 1.25,
                            borderBottom: `1px solid ${T.divider}`,
                            bgcolor: isPreview
                              ? alpha(T.accent, 0.08)
                              : idx % 2 === 0
                                ? T.rowEven
                                : T.rowOdd,
                            '&:hover': { bgcolor: T.rowHover },
                            '&.Mui-selected': {
                              bgcolor: alpha(T.accent, 0.1),
                              '&:hover': { bgcolor: alpha(T.accent, 0.12) },
                            },
                            transition: 'background 0.1s',
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            disabled={user._loading}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelect(empNum)}
                            sx={{
                              p: 0.5,
                              mr: 0.75,
                              '&.Mui-checked': { color: T.accent },
                            }}
                          />
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: T.accent,
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              borderRadius: '4px',
                              flexShrink: 0,
                              mr: 1,
                            }}
                          >
                            {user._loading ? '…' : getEmployeeInitials(user)}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: '0.78rem',
                                fontWeight: isPreview ? 700 : 600,
                                color: T.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                lineHeight: 1.2,
                              }}
                            >
                              {user._loading ? 'Loading…' : user.fullName}
                            </Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: T.muted, fontWeight: 600, mt: 0.15 }}>
                              #{empNum}{user.departmentCode ? ` · ${user.departmentCode}` : ''}
                            </Typography>
                          </Box>
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Box>
              </>
            )}
          </Box>

          <Tooltip title={selectedIds.size === 0 ? 'Select employees to print' : ''}>
            <span style={{ display: 'block' }}>
              <AccentButton
                variant="contained"
                fullWidth
                disabled={selectedIds.size === 0 || loading}
                onClick={handlePrintSelected}
                startIcon={<PrintIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  bgcolor: selectedIds.size > 0 ? T.accent : alpha(T.accent, 0.35),
                  color: '#fff',
                  boxShadow: selectedIds.size > 0 ? `0 2px 10px ${alpha(T.accent, 0.32)}` : 'none',
                  '&:hover': { bgcolor: T.accentDark },
                }}
              >
                Print Selected
                {selectedIds.size > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      bgcolor: 'rgba(255,255,255,0.25)',
                      borderRadius: '20px',
                      px: 1,
                      py: 0.2,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {selectedIds.size}
                  </Box>
                )}
              </AccentButton>
            </span>
          </Tooltip>
        </>
      )}
    </Box>
  );

  if (accessLoading || ctxLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
        <CircularProgress sx={{ color: T.accent, mb: 2 }} />
        <Typography sx={{ fontSize: '0.88rem', color: T.muted }}>Loading supervisor DTR…</Typography>
      </Box>
    );
  }

  const normalizedRole = normalizeRole(userRole);
  const isTechAdmin = ['superadmin', 'technical', 'administrator'].includes(normalizedRole);
  const isAssignedSupervisor = supervisorCtx?.isSupervisor === true
    || (Array.isArray(supervisorCtx?.departments) && supervisorCtx.departments.length > 0);
  const hasPermission = isTechAdmin || isAssignedSupervisor || hasAccess === true;

  if (!hasPermission) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Supervisor Daily Time Record. You must be assigned as a supervisor in Supervisor Assignment."
        returnPath="/home"
        returnButtonText="Return to Home"
      />
    );
  }

  return (
    <>
      <LoadingOverlay open={loading || printing} message={printing ? printStatus : (loadPhase || 'Loading…')} />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Fade in timeout={500}>
        <Box>
          <style>{`
            html { overflow-y: scroll; }
            table td .dtr-cell-watermark {
              position: absolute !important;
              left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              pointer-events: none !important; z-index: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              .no-print { display: none !important; }
            }
          `}</style>

          <Box
            sx={{
              py: { xs: 1, md: 2 },
              mt: { xs: 0, md: -2 },
              mb: { xs: 1, md: 2 },
              width: '100vw',
              maxWidth: '100%',
              position: 'relative',
              left: '63%',
              transform: 'translateX(-61%)',
              px: { xs: 2, sm: 3, md: 6 },
            }}
          >
            {/* Page Header */}
            <SectionCard className="no-print" sx={{ mb: 2, overflow: 'hidden' }}>
              <Box
                sx={{
                  px: 4,
                  py: 3,
                  background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
                  <SupervisorIcon sx={{ fontSize: 32, color: T.accent }} />
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: T.accent,
                        lineHeight: 1.2,
                        mb: 0.3,
                      }}
                    >
                      Supervisor Daily Time Record
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.82rem',
                        color: T.accentMid,
                        fontWeight: 700,
                        opacity: 0.9,
                      }}
                    >
                      {deptOptions.map((d) => d.description).join(' · ') || 'Department DTR'}
                      {' · View and print team DTR records'}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {employees.length > 0 && (
                    <Box
                      sx={{
                        px: 2.5,
                        py: 0.75,
                        borderRadius: 6,
                        bgcolor: alpha(T.accent, 0.1),
                        border: `1px solid ${alpha(T.accent, 0.2)}`,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                        {employees.length} employees
                      </Typography>
                    </Box>
                  )}
                  <Tooltip title="Refresh data">
                    <span>
                      <IconButton
                        onClick={loadEmployeesDtr}
                        disabled={!startDate || loading}
                        sx={{
                          bgcolor: alpha(T.accent, 0.08),
                          color: T.accent,
                          width: 36,
                          height: 36,
                          '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                        }}
                      >
                        <Refresh sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </SectionCard>

            <Grid container spacing={2}>
              {/* LEFT: Filters + employee list */}
              <Grid item xs={12} lg={3} className="no-print">
                <SectionCard sx={filterSidebarCardSx}>
                  <AttendanceFilterHeader />
                  {renderLeftPanelContent()}
                </SectionCard>
              </Grid>

              {/* RIGHT: DTR preview */}
              <Grid item xs={12} lg={9}>
                <SectionCard
                  sx={{
                    height: { xs: 'auto', lg: 'calc(100vh - 280px)' },
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      px: 3.5,
                      py: 2,
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: T.accentFaint,
                      flexShrink: 0,
                    }}
                    className="no-print"
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AccessTime sx={{ fontSize: 15, color: T.accent }} />
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                          DTR Preview
                        </Typography>
                        {previewUser && selectedMonth !== null && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box
                              sx={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: T.faint,
                              }}
                            />
                            <Typography
                              sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}
                            >
                              {previewUser.fullName}
                            </Typography>
                            <Box
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: T.accent,
                                bgcolor: alpha(T.accent, 0.08),
                                border: `1px solid ${T.accentBorder}`,
                                borderRadius: '5px',
                                px: '6px',
                                py: '2px',
                              }}
                            >
                              {monthsShort[selectedMonth]}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: 'auto',
                      position: 'relative',
                      ...scrollbarSx,
                    }}
                  >
                    {selectedMonth === null ? (
                      <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Box
                          sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            bgcolor: T.accentFaint,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2,
                          }}
                        >
                          <CalendarToday sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography
                          sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}
                        >
                          Select a DTR Period
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                          Choose a month from the left panel to load department DTR records.
                        </Typography>
                      </Box>
                    ) : previewUser && !previewUser._loading ? (
                      <Fade in timeout={250}>
                        <Box
                          sx={{
                            bgcolor: '#f4f0f0',
                            p: 2.5,
                            display: 'flex',
                            justifyContent: 'center',
                            position: 'relative',
                            minHeight: '100%',
                          }}
                        >
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              bgcolor: 'white',
                              borderRadius: 2,
                              width: 'fit-content',
                              maxWidth: '100%',
                              border: `1px solid ${T.accentBorder}`,
                              overflowX: 'auto',
                            }}
                          >
                            {renderEmployeeDtr(previewUser)}
                          </Paper>
                        </Box>
                      </Fade>
                    ) : null}
                  </Box>
                </SectionCard>
              </Grid>
            </Grid>

            {/* Print preview modal */}
            <Dialog
              open={previewModalOpen}
              onClose={() => !printing && setPreviewModalOpen(false)}
              maxWidth="lg"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '90vh',
                },
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  background: T.headerGrad,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                    DTR Preview
                  </Typography>
                  {previewUsers[previewIndex] && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                      {previewUsers[previewIndex].fullName}
                      {startDate && ` · ${monthsShort[new Date(startDate).getMonth()]} ${new Date(startDate).getFullYear()}`}
                      {previewUsers.length > 1 && ` · ${previewIndex + 1} of ${previewUsers.length}`}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {previewUsers.length > 1 && !printing && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        bgcolor: 'rgba(255,255,255,0.15)',
                        borderRadius: '20px',
                        px: 1.5,
                        py: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                        disabled={previewIndex === 0 || printing}
                        sx={{ color: '#fff', p: 0.25 }}
                      >
                        <ArrowBack sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography
                        sx={{
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          minWidth: 48,
                          textAlign: 'center',
                        }}
                      >
                        {previewIndex + 1} of {previewUsers.length}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setPreviewIndex((p) => Math.min(previewUsers.length - 1, p + 1))}
                        disabled={previewIndex === previewUsers.length - 1 || printing}
                        sx={{ color: '#fff', p: 0.25 }}
                      >
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  )}
                  <IconButton
                    onClick={() => setPreviewModalOpen(false)}
                    disabled={printing}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      width: 28,
                      height: 28,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <Close sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              </Box>
              <DialogContent
                sx={{
                  p: 0,
                  flex: 1,
                  overflow: 'hidden',
                  bgcolor: '#f0f0f0',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {!printing && previewUsers[previewIndex] && (
                  <Box
                    sx={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      p: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                      ...scrollbarSx,
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 2,
                        width: 'fit-content',
                        maxWidth: '100%',
                        border: `1px solid ${T.accentBorder}`,
                      }}
                    >
                      {renderEmployeeDtr(previewUsers[previewIndex])}
                    </Paper>
                  </Box>
                )}
              </DialogContent>
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  bgcolor: '#fff',
                  borderTop: `1px solid ${T.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <AccentButton
                    variant="contained"
                    onClick={handlePrintAll}
                    disabled={printing}
                    startIcon={
                      printing
                        ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                        : <PrintIcon sx={{ fontSize: '16px !important' }} />
                    }
                    sx={{
                      bgcolor: T.accent,
                      color: '#fff',
                      boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                      '&:hover': { bgcolor: T.accentDark },
                    }}
                  >
                    {printing ? 'Printing…' : 'Print All'}
                    {!printing && (
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          bgcolor: 'rgba(255,255,255,0.25)',
                          borderRadius: '20px',
                          px: 1,
                          py: 0.2,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {previewUsers.length}
                      </Box>
                    )}
                  </AccentButton>
                  <AccentButton
                    variant="outlined"
                    onClick={handleDownloadAll}
                    disabled={printing}
                    startIcon={
                      <PictureAsPdfIcon sx={{ fontSize: '16px !important' }} />
                    }
                    sx={{
                      borderColor: T.accentBorder,
                      color: T.accent,
                      '&:hover': {
                        bgcolor: T.accentFaint,
                        borderColor: T.accent,
                      },
                    }}
                  >
                    Download PDF
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        bgcolor: T.accentFaint,
                        borderRadius: '20px',
                        px: 1,
                        py: 0.2,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: T.accent,
                      }}
                    >
                      {previewUsers.length}
                    </Box>
                  </AccentButton>
                </Box>
                <AccentButton
                  variant="text"
                  onClick={() => setPreviewModalOpen(false)}
                  disabled={printing}
                  sx={{
                    color: T.muted,
                    '&:hover': { bgcolor: alpha('#000', 0.04), transform: 'none' },
                    '&:active': { transform: 'none' },
                  }}
                >
                  Close
                </AccentButton>
              </Box>
            </Dialog>
          </Box>
        </Box>
      </Fade>
    </>
  );
};

export default DailyTimeRecordSupervisor;
