import API_BASE_URL from "../../apiConfig";
import React, { forwardRef, useRef, useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Chip,
  Divider,
  Fade,
  Backdrop,
  styled,
  alpha,
  IconButton,
  Tooltip,
  Grid,
  InputAdornment,
  Alert,
  Stack,
  LinearProgress,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import Search from "@mui/icons-material/Search";
import Refresh from "@mui/icons-material/Refresh";
import Send from "@mui/icons-material/Send";
import Download from "@mui/icons-material/Download";
import Person from "@mui/icons-material/Person";
import CalendarToday from "@mui/icons-material/CalendarToday";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Visibility from "@mui/icons-material/Visibility";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import usePayrollRealtimeRefresh from "../../hooks/usePayrollRealtimeRefresh";

// ── Helpers ────────────────────────────────────────────────────────────────
const hexToRgb = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
    : "109, 35, 35";
};

// ── Styled Components ──────────────────────────────────────────────────────
const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: "blur(10px)",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": { transform: "translateY(-4px)" },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: "12px 24px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  textTransform: "none",
  fontSize: "0.95rem",
  letterSpacing: "0.025em",
  boxShadow:
    variant === "contained" ? "0 4px 14px rgba(254,249,225,0.25)" : "none",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow:
      variant === "contained" ? "0 6px 20px rgba(254,249,225,0.35)" : "none",
  },
  "&:active": { transform: "translateY(0)" },
}));

const ModernTextField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    "&:hover": {
      transform: "translateY(-1px)",
      backgroundColor: "rgba(255,255,255,0.95)",
    },
    "&.Mui-focused": {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 20px rgba(254,249,225,0.25)",
      backgroundColor: "#fff",
    },
  },
  "& .MuiInputLabel-root": { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 4px 24px rgba(109,35,35,0.06)",
  border: "1px solid rgba(109,35,35,0.08)",
}));

const PremiumTableCell = styled(TableCell)(({ isHeader }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: "18px 20px",
  borderBottom: isHeader
    ? "2px solid rgba(254,249,225,0.5)"
    : "1px solid rgba(109,35,35,0.06)",
  fontSize: "0.95rem",
  letterSpacing: "0.025em",
}));

// ── Payslip layout sub-components ─────────────────────────────────────────
const MoneyCell = ({ label, value }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      px: 3,
      py: 2,
      borderBottom: "1.5px solid #ddd",
    }}
  >
    <Typography
      sx={{
        fontSize: "18px",
        fontWeight: 700,
        color: "#333",
        fontFamily: '"Poppins",sans-serif',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: "20px",
        fontWeight: 900,
        color: "#111",
        fontFamily: '"Poppins",sans-serif',
        minWidth: "140px",
        textAlign: "right",
      }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

const DeductionRow = ({ items, isEven }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      backgroundColor: isEven ? "#fdf6f6" : "#fff",
      borderBottom: "1.5px solid #c9a8a8",
    }}
  >
    {items.map(([label, value], i) => (
      <Box
        key={i}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 1.5,
          py: 0.5,
          borderRight: i < 2 ? "1.5px solid #c9a8a8" : "none",
          minHeight: "38px",
          gap: 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: "20px",
            color: "#1a1a1a",
            fontFamily: '"Poppins",sans-serif',
            fontWeight: 700,
            lineHeight: 1.1,
            flex: 1,
          }}
        >
          {label || ""}
        </Typography>
        <Typography
          sx={{
            fontSize: "20px",
            fontWeight: 900,
            color: value ? "#6d2323" : "#aaa",
            fontFamily: '"Poppins",sans-serif',
            minWidth: "100px",
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {value || "—"}
        </Typography>
      </Box>
    ))}
  </Box>
);

const SummaryCard = ({ label, value, accent = false }) => (
  <Box
    sx={{
      flex: 1,
      borderRadius: 2,
      p: 1.5,
      background: accent
        ? "linear-gradient(135deg,#f5ede8 0%,#ede0d8 100%)"
        : "#fff",
      border: accent ? "2.5px solid #6d2323" : "2.5px solid #c9a8a8",
      boxShadow: accent ? "0 4px 16px rgba(109,35,35,0.25)" : "none",
      display: "flex",
      flexDirection: "column",
      gap: 0.8,
    }}
  >
    <Typography
      sx={{
        fontSize: "17px",
        fontWeight: 800,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "#6d2323",
        fontFamily: '"Poppins",sans-serif',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: "34px",
        fontWeight: 900,
        color: accent ? "#6d2323" : "#1a1a1a",
        fontFamily: '"Poppins",sans-serif',
        lineHeight: 1.1,
        letterSpacing: "-0.01em",
      }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

// ── Shimmer skeleton ───────────────────────────────────────────────────────
const pdKeyframes = `
@keyframes pdShimmer { 0%{background-position:-800px 0} 100%{background-position:800px 0} }
@keyframes pdPulse   { 0%,100%{opacity:1} 50%{opacity:0.55} }
`;
const Shim = ({ w = "100%", h = 16, r = 8, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: `${r}px`,
      flexShrink: 0,
      background:
        "linear-gradient(90deg,rgba(137,68,68,0.07) 25%,rgba(137,68,68,0.18) 50%,rgba(137,68,68,0.07) 75%)",
      backgroundSize: "800px 100%",
      animation: "pdShimmer 1.6s infinite linear",
      ...sx,
    }}
  />
);
const TableRowShim = ({ delay = 0 }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      px: 3,
      py: 2.5,
      gap: 3,
      borderBottom: "1px solid rgba(137,68,68,0.06)",
      animation: `pdPulse 2.2s ease-in-out ${delay}s infinite`,
    }}
  >
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: 1,
        border: "1.5px solid rgba(137,68,68,0.22)",
        flexShrink: 0,
      }}
    />
    <Shim w="35%" h={14} r={4} />
    <Shim w="18%" h={14} r={4} />
    <Box
      sx={{
        width: 80,
        height: 24,
        borderRadius: 12,
        bgcolor: "rgba(76,175,80,0.12)",
        flexShrink: 0,
      }}
    />
  </Box>
);
const PayslipDistributionWireframe = () => (
  <>
    <style>{pdKeyframes}</style>
    <Box sx={{ py: 4, width: "1200px", mx: "auto", overflow: "hidden" }}>
      <Box sx={{ px: 6 }}>
        {[0, 0.07, 0.13].map((delay, idx) => (
          <Box
            key={idx}
            sx={{
              mb: 4,
              borderRadius: "20px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(137,68,68,0.10)",
              boxShadow: "0 8px 40px rgba(137,68,68,0.06)",
              animation: `pdPulse 2.2s ease-in-out ${delay}s infinite`,
            }}
          >
            <Box
              sx={{
                p: idx === 0 ? 5 : 4,
                background:
                  "linear-gradient(135deg,rgba(137,68,68,0.13) 0%,rgba(109,35,35,0.19) 100%)",
              }}
            >
              {idx === 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      bgcolor: "rgba(255,255,255,0.18)",
                    }}
                  />
                  <Box>
                    <Shim w={300} h={28} r={6} sx={{ mb: 1.5 }} />
                    <Shim w={340} h={14} r={4} />
                  </Box>
                </Box>
              )}
              {idx === 1 && (
                <>
                  <Shim w="40%" h={13} r={4} sx={{ mb: 1 }} />
                  <Shim w="100%" h={40} r={12} />
                </>
              )}
              {idx === 2 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Shim w={110} h={11} r={3} sx={{ mb: 1.5 }} />
                    <Shim w={180} h={28} r={6} />
                  </Box>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      bgcolor: "rgba(137,68,68,0.12)",
                    }}
                  />
                </Box>
              )}
            </Box>
            {idx === 2 &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowShim key={i} delay={i * 0.05} />
              ))}
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ══════════════════════════════════════════════════════════════════════════
const PayslipDistribution = forwardRef(({ employee }, ref) => {
  // ── Refs ──────────────────────────────────────────────────────────────
  const payslipRef = useRef();

  // ── Shared data ───────────────────────────────────────────────────────
  const [allPayroll, setAllPayroll] = useState([]);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState("");

  // ── View mode: 'bulk' | 'individual' ──────────────────────────────────
  const [viewMode, setViewMode] = useState("bulk");

  // ── Bulk distribution state ───────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [successOverlay, setSuccessOverlay] = useState({
    open: false,
    action: "",
  });
  const [bulkModal, setBulkModal] = useState({
    open: false,
    type: "error",
    message: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredPayroll, setFilteredPayroll] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // ── Payslip view modal (opened from bulk table row) ───────────────────
  const [payslipModal, setPayslipModal] = useState({ open: false, emp: null });
  const [modalSending, setModalSending] = useState(false);
  const [modalActionModal, setModalActionModal] = useState({
    open: false,
    type: "",
    action: "",
    message: "",
  });

  // ── Individual view state (from PayslipOverall) ───────────────────────
  const [indivSearch, setIndivSearch] = useState("");
  const [indivHasSearched, setIndivHasSearched] = useState(false);
  const [indivMonth, setIndivMonth] = useState("");
  const [displayEmployee, setDisplayEmployee] = useState(null);
  const [indivSending, setIndivSending] = useState(false);
  const [indivModal, setIndivModal] = useState({
    open: false,
    type: "",
    action: "",
    message: "",
  });

  // ── System settings ───────────────────────────────────────────────────
  const { settings } = useSystemSettings();
  const primaryColor = settings.accentColor || "#FEF9E1";
  const secondaryColor = settings.backgroundColor || "#FFF8E7";
  const accentColor = settings.primaryColor || "#6d2323";
  const accentDark = settings.secondaryColor || "#8B3333";
  const textPrimaryColor = settings.textPrimaryColor || "#6d2323";
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";
  const grayColor = "#6c757d";
  const blackColor = "#1a1a1a";
  const institutionLogo = settings.institutionLogo || "";
  const hrisLogo = settings.hrisLogo || "";
  const institutionName =
    settings.institutionName ||
    'EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY';
  const institutionAddress =
    settings.institutionAddress || "Nagtahan, Sampaloc Manila";
  const certifierName = settings.certifierName || "GIOVANNI L. AHUNIN";
  const certifierPosition =
    settings.certifierPosition || "Director, Administrative Services";

  const { hasAccess, loading: accessLoading } = usePageAccess(
    "distribution-payslip",
  );

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  };

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
        getAuthHeaders(),
      );
      setAllPayroll(res.data);
    } catch {
      setError("Failed to fetch payroll data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => {
    if (!employee) fetchPayrollData();
  });
  useEffect(() => {
    if (!employee) fetchPayrollData();
  }, [employee]);

  // ── Bulk filter ───────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...allPayroll];
    if (selectedMonth) {
      const monthIndex = months.indexOf(selectedMonth);
      result = result.filter((emp) => {
        if (!emp.startDate) return false;
        const d = new Date(emp.startDate);
        return d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeNumber.toString().includes(q),
      );
    }
    setFilteredPayroll(result);
    setSelectedEmployees([]);
  }, [selectedMonth, selectedYear, searchQuery, allPayroll]);

  // ── Bulk handlers ─────────────────────────────────────────────────────
  const allSelected =
    filteredPayroll.length > 0 &&
    selectedEmployees.length === filteredPayroll.length;
  const someSelected =
    selectedEmployees.length > 0 &&
    selectedEmployees.length < filteredPayroll.length;
  const handleSelectAll = (e) =>
    setSelectedEmployees(
      e.target.checked ? filteredPayroll.map((e) => e.employeeNumber) : [],
    );
  const handleSelectOne = (id) =>
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // ── Individual handlers ───────────────────────────────────────────────
  const handleIndivSearch = () => {
    if (!indivSearch.trim()) return;
    const result = allPayroll.filter(
      (e) =>
        e.employeeNumber.toString().includes(indivSearch.trim()) ||
        e.name.toLowerCase().includes(indivSearch.trim().toLowerCase()),
    );
    setDisplayEmployee(null);
    setIndivMonth("");
    setIndivHasSearched(true);
  };

  const handleIndivClear = () => {
    setIndivSearch("");
    setIndivHasSearched(false);
    setIndivMonth("");
    setDisplayEmployee(null);
  };

  const handleIndivMonthSelect = (month) => {
    setIndivMonth(month);
    const monthIndex = months.indexOf(month);
    const result = allPayroll.filter(
      (e) =>
        (indivHasSearched
          ? e.employeeNumber.toString().includes(indivSearch.trim()) ||
            e.name.toLowerCase().includes(indivSearch.trim().toLowerCase())
          : true) && new Date(e.startDate).getMonth() === monthIndex,
    );
    setDisplayEmployee(result.length > 0 ? result[0] : null);
  };

  // ── Open payslip modal from table row ────────────────────────────────
  const openPayslipModal = (emp) => setPayslipModal({ open: true, emp });

  // ── Modal: Download PDF ───────────────────────────────────────────────
  const handleModalDownload = async () => {
    if (!payslipModal.emp) return;
    setModalSending(true);
    try {
      const pdf = await generate3MonthPDF(payslipModal.emp);
      pdf.save(
        `${getSurname(payslipModal.emp.name)}_${formatPeriod(payslipModal.emp.startDate)}.pdf`,
      );
      // Audit log for print
      try {
        await axios.post(
          `${API_BASE_URL}/PayrollReleasedRoute/log-print`,
          { employeeNumber: payslipModal.emp.employeeNumber },
          getAuthHeaders(),
        );
      } catch (e) {
        console.error('Print audit log error:', e);
      }
      setModalActionModal({ open: true, type: "success", action: "download" });
    } catch {
      setModalActionModal({
        open: true,
        type: "error",
        message: "Failed to generate PDF.",
      });
    } finally {
      setModalSending(false);
    }
  };

  // ── Modal: Send via Gmail ─────────────────────────────────────────────
  const handleModalSendGmail = async () => {
    if (!payslipModal.emp) return;
    setModalSending(true);
    try {
      const emp = payslipModal.emp;
      const pdf = await generate3MonthPDF(emp);
      const filename = `${getSurname(emp.name)}_${formatPeriod(emp.startDate)}.pdf`;
      const blob = pdf.output("blob");
      const fd = new FormData();
      fd.append("pdf", blob, filename);
      fd.append("name", emp.name);
      fd.append("employeeNumber", emp.employeeNumber);
      const res = await axios.post(
        `${API_BASE_URL}/SendPayslipRoute/send-payslip`,
        fd,
        {
          ...getAuthHeaders(),
          headers: {
            ...getAuthHeaders().headers,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      if (res.data.success)
        setModalActionModal({ open: true, type: "success", action: "gmail" });
      else
        setModalActionModal({
          open: true,
          type: "error",
          message: res.data.error || "Failed to send payslip.",
        });
    } catch {
      setModalActionModal({
        open: true,
        type: "error",
        message: "An error occurred while sending payslip.",
      });
    } finally {
      setModalSending(false);
    }
  };

  // ── Formatters ────────────────────────────────────────────────────────
  const formatCurrency = (v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n !== 0 ? `₱${n.toLocaleString()}` : "";
  };
  const formatRenderedDays = (v) => {
    const h = Number(v);
    if (!isNaN(h) && h > 0) {
      const d = Math.floor(h / 8),
        r = h % 8;
      return `${d} days${r > 0 ? ` & ${r} hrs` : ""}`;
    }
    return "";
  };
  const getSurname = (name) => {
    if (!name) return "EARIST";
    const p = name.trim().split(" ");
    return p[p.length - 1] || "EARIST";
  };
  const formatPeriod = (sd) => {
    if (!sd) return "Unknown";
    const d = new Date(sd);
    return `${d.toLocaleString("en-US", { month: "long" })}_${d.getFullYear()}`;
  };
  const formatAbs = (v) => formatCurrency(v) || "Deducted from VL";
  const computeNetPay = (emp) => {
    const n =
      (parseFloat(emp.netSalary) || 0) - (parseFloat(emp.totalDeductions) || 0);
    return n !== 0 ? `₱${n.toLocaleString()}` : "—";
  };

  // ── HTML payslip builder (used for all PDF generation) ────────────────
  const buildPayslipHTML = (emp, logoSrc, hrisLogoSrc) => {
    const fc = (v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n !== 0 ? `&#8369;${n.toLocaleString()}` : "";
    };
    const fcAbs = (v) => fc(v) || "Deducted from VL";
    const frd = (v) => {
      const h = Number(v);
      if (!isNaN(h) && h > 0) {
        const d = Math.floor(h / 8),
          r = h % 8;
        return `${d} days${r > 0 ? ` & ${r} hrs` : ""}`;
      }
      return "";
    };
    const period = (() => {
      if (!emp.startDate || !emp.endDate) return "&mdash;";
      const s = new Date(emp.startDate),
        e = new Date(emp.endDate);
      return `${s.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${s.getDate()}&ndash;${e.getDate()} ${e.getFullYear()}`;
    })();
    const isJO = (emp.employmentCategory ?? -1) === 0;
    const netPayCalc = (() => {
      const n =
        (parseFloat(emp.netSalary) || 0) -
        (parseFloat(emp.totalDeductions) || 0);
      return n !== 0 ? `&#8369;${n.toLocaleString()}` : "&mdash;";
    })();

    const headerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#6d2323 0%,#a31d1d 100%);border-radius:6px;padding:20px 28px;margin-bottom:18px;box-shadow:0 4px 20px rgba(109,35,35,0.3);">
        ${logoSrc ? `<img src="${logoSrc}" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin-left:8px;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);margin-left:8px;flex-shrink:0;"></div>`}
        <div style="flex:1;text-align:center;color:white;padding:0 16px;">
          <div style="font-style:italic;font-size:18px;opacity:0.9;font-family:Poppins,sans-serif;">Republic of the Philippines</div>
          <div style="font-weight:900;font-size:22px;line-height:1.4;font-family:Poppins,sans-serif;letter-spacing:0.02em;margin-top:4px;">${institutionName}</div>
          <div style="font-size:17px;opacity:0.85;font-family:Poppins,sans-serif;margin-top:4px;">${institutionAddress}</div>
        </div>
        ${hrisLogoSrc ? `<img src="${hrisLogoSrc}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);flex-shrink:0;"></div>`}
      </div>`;

    const secHead = (t) =>
      `<div style="background:#6D2323;color:white;padding:8px 16px;"><span style="font-weight:800;font-size:20px;letter-spacing:0.07em;font-family:Poppins,sans-serif;">${t}</span></div>`;
    const infoCell = (lbl, content, br = false, bb = false, fw = false) => `
      <div style="padding:12px 16px;${br ? "border-right:2px solid #e0c8c8;" : ""}${bb ? "border-bottom:2px solid #e0c8c8;" : ""}min-height:60px;${fw ? "grid-column:1/-1;" : ""}">
        <div style="font-size:18px;font-weight:800;letter-spacing:0.06em;color:#6d2323;margin-bottom:4px;font-family:Poppins,sans-serif;text-transform:uppercase;">${lbl}</div>
        ${content}
      </div>`;
    const summaryCards = (netSal, totalDed, netPay) => `
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        ${[
          ["Net Salary", netSal, false],
          ["Total Deductions", totalDed, false],
          ["Net Pay", netPay, true],
        ]
          .map(
            ([lbl, val, acc]) => `
          <div style="flex:1;border-radius:8px;padding:12px;background:${acc ? "linear-gradient(135deg,#f5ede8 0%,#ede0d8 100%)" : "#fff"};border:${acc ? "2.5px solid #6d2323" : "2.5px solid #c9a8a8"};${acc ? "box-shadow:0 4px 16px rgba(109,35,35,0.25);" : ""}">
            <div style="font-size:17px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#6d2323;font-family:Poppins,sans-serif;">${lbl}</div>
            <div style="font-size:34px;font-weight:900;color:${acc ? "#6d2323" : "#1a1a1a"};font-family:Poppins,sans-serif;line-height:1.1;">${val || "&mdash;"}</div>
          </div>`,
          )
          .join("")}
      </div>`;
    const footer = `
      <div style="margin-top:40px;padding-top:24px;text-align:center;">
        <div style="font-size:18px;color:#555;margin-bottom:8px;font-family:Poppins,sans-serif;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Certified Correct</div>
        <div style="font-size:24px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;">${certifierName}</div>
        <div style="font-size:20px;color:#444;font-family:Poppins,sans-serif;font-weight:600;margin-top:4px;">${certifierPosition}</div>
      </div>`;

    let bodyHTML = "";
    if (isJO) {
      bodyHTML = `
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead("EMPLOYEE INFORMATION")}
          <div style="display:grid;grid-template-columns:1fr 1fr;">
            ${infoCell("Employee Number", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : "&mdash;"}</div>`, true, true)}
            ${infoCell("Name", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.name || "&mdash;"}</div>`, false, true)}
            ${infoCell("Period", `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, false)}
            ${infoCell("Rendered Days", `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${frd(emp.rh) || "&mdash;"}</div>`, false, false)}
          </div>
        </div>
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead("DEDUCTIONS")}
          ${[
            ["SSS", fc(emp.sss)],
            ["Pag-IBIG", fc(emp.pagibigFundCont)],
          ]
            .map(
              ([lbl, val]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1.5px solid #ddd;">
              <span style="font-size:18px;font-weight:700;color:#333;font-family:Poppins,sans-serif;">${lbl}</span>
              <span style="font-size:20px;font-weight:900;color:#111;font-family:Poppins,sans-serif;min-width:140px;text-align:right;">${val || "&mdash;"}</span>
            </div>`,
            )
            .join("")}
        </div>
        ${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}
        ${footer}`;
    } else {
      const rows = [
        [
          ["Withholding Tax", fc(emp.withholdingTax)],
          ["GSIS Salary Loan", fc(emp.gsisSalaryLoan)],
          ["Life & Retirement", fc(emp.personalLifeRetIns)],
        ],
        [
          ["PhilHealth", fc(emp.PhilHealthContribution)],
          ["GSIS Policy Loan", fc(emp.gsisPolicyLoan)],
          ["PhilHealth Diff", fc(emp.philhealthDiff)],
        ],
        [
          ["Pag-IBIG", fc(emp.pagibigFundCont)],
          ["GSIS Housing Loan", fc(emp.gsisHousingLoan)],
          ["Pag-IBIG 2", fc(emp.pagibig2)],
        ],
        [
          ["SSS", fc(emp.sss)],
          ["GSIS Arrears", fc(emp.gsisArrears)],
          ["LBP Loan", fc(emp.lbpLoan)],
        ],
        [
          ["ECC", fc(emp.ecc)],
          ["GFAL", fc(emp.gfal)],
          ["MTSLAI", fc(emp.mtslai)],
        ],
        [
          ["To Be Refunded", fc(emp.toBeRefunded)],
          ["CPL", fc(emp.cpl)],
          ["ESLAI", fc(emp.eslai)],
        ],
        [
          ["FEU", fc(emp.feu)],
          ["MPL", fc(emp.mpl)],
          ["ABS", fcAbs(emp.abs)],
        ],
        [
          ["", ""],
          ["MPL Lite", fc(emp.mplLite)],
          ["ELA", fc(emp.ela)],
        ],
      ];
      bodyHTML = `
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead("EMPLOYEE INFORMATION")}
          <div style="display:grid;grid-template-columns:1fr 1fr;">
            ${infoCell("Period", `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, true)}
            ${infoCell("Employee Number", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : "&mdash;"}</div>`, false, true)}
            ${infoCell("Name", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.name || "&mdash;"}</div>`, false, false, true)}
          </div>
        </div>
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead("DEDUCTIONS BREAKDOWN")}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);background:#f5eaea;border-bottom:2px solid #c9a8a8;">
            ${["Government & Tax", "GSIS Loans", "Other Deductions"].map((h, i) => `<div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.06em;text-transform:uppercase;padding:8px 16px;font-family:Poppins,sans-serif;${i < 2 ? "border-right:2px solid #c9a8a8;" : ""}">${h}</div>`).join("")}
          </div>
          ${rows
            .map(
              (row, ri) => `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);background:${ri % 2 === 0 ? "#fdf6f6" : "#fff"};border-bottom:1.5px solid #c9a8a8;">
              ${row
                .map(
                  ([lbl, val], ci) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;${ci < 2 ? "border-right:1.5px solid #c9a8a8;" : ""}min-height:38px;gap:4px;">
                  <span style="font-size:20px;color:#1a1a1a;font-family:Poppins,sans-serif;font-weight:700;flex:1;">${lbl || ""}</span>
                  <span style="font-size:20px;font-weight:900;color:${val ? "#6d2323" : "#aaa"};font-family:Poppins,sans-serif;min-width:100px;text-align:right;">${val || "&mdash;"}</span>
                </div>`,
                )
                .join("")}
            </div>`,
            )
            .join("")}
        </div>
        ${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead("PAYMENT BREAKDOWN")}
          <div style="display:grid;grid-template-columns:1fr 1fr;">
            ${[
              ["1ST QUINCENA", fc(emp.pay1st)],
              ["2ND QUINCENA", fc(emp.pay2nd)],
            ]
              .map(
                ([lbl, val], i) => `
              <div style="padding:16px;${i === 0 ? "border-right:2px solid #e0c8c8;" : ""}min-height:70px;">
                <div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.1em;text-transform:uppercase;font-family:Poppins,sans-serif;margin-bottom:4px;">${lbl}</div>
                <div style="font-size:26px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;line-height:1.1;">${val || "&mdash;"}</div>
              </div>`,
              )
              .join("")}
          </div>
        </div>
        ${footer}`;
    }

    return `
      <div style="font-family:Poppins,sans-serif;background:#fff;width:1100px;padding:24px 24px 32px;box-sizing:border-box;position:relative;">
        <div style="position:relative;z-index:1;">${headerHTML}${bodyHTML}</div>
        ${hrisLogoSrc ? `<img data-watermark="1" src="${hrisLogoSrc}" crossorigin="anonymous" style="position:absolute;left:50%;width:70%;opacity:0.08;pointer-events:none;z-index:2;mix-blend-mode:multiply;top:50%;transform:translate(-50%,-50%);"/>` : ""}
      </div>`;
  };

  // ── Core PDF generator (used by both bulk & individual) ───────────────
  const generate3MonthPDF = async (emp) => {
    const s = new Date(emp.startDate);
    const monthsToGet = [0, 1, 2].map((i) => {
      const d = new Date(s.getFullYear(), s.getMonth() - i, 1);
      return {
        month: d.getMonth(),
        year: d.getFullYear(),
        label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
      };
    });
    const records = monthsToGet.map(({ month, year, label }) => ({
      label,
      payroll: allPayroll.find(
        (p) =>
          p.employeeNumber === emp.employeeNumber &&
          new Date(p.startDate).getMonth() === month &&
          new Date(p.startDate).getFullYear() === year,
      ),
    }));

    const containers = records.map((_, i) => {
      const div = document.createElement("div");
      div.style.cssText = `position:absolute;left:${-9999 - i * 1200}px;top:-9999px;width:1100px;background:#fff;`;
      document.body.appendChild(div);
      return div;
    });

    records.forEach(({ payroll, label }, i) => {
      containers[i].innerHTML = payroll
        ? buildPayslipHTML(payroll, institutionLogo, hrisLogo)
        : `<div style="width:1100px;height:1700px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;">
             <div style="font-size:28px;font-weight:bold;color:#6D2323;font-family:Poppins,sans-serif;">No Data</div>
             <div style="font-size:20px;color:#6D2323;font-family:Poppins,sans-serif;margin-top:8px;">for ${label}</div>
           </div>`;
    });

    await new Promise((r) => requestAnimationFrame(r));
    containers.forEach((container) => {
      const root = container.firstElementChild;
      if (!root) return;
      const totalH = root.scrollHeight || root.offsetHeight;
      const wm = root.querySelector('img[data-watermark="1"]');
      if (wm) {
        const wmH =
          wm.naturalHeight && wm.naturalWidth
            ? (wm.offsetWidth || 770) * (wm.naturalHeight / wm.naturalWidth)
            : 400;
        wm.style.transform = "none";
        wm.style.top = `${totalH / 2 - wmH / 2}px`;
        wm.style.left = `${(1100 - (wm.offsetWidth || 770)) / 2}px`;
      }
    });

    const images = await Promise.all(
      containers.map((container) => {
        const root = container.firstElementChild || container;
        const h = root.scrollHeight || root.offsetHeight || 1700;
        return html2canvas(root, {
          scale: 1.0,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          imageTimeout: 15000,
          windowWidth: 1100,
          windowHeight: h,
          height: h,
          foreignObjectRendering: false,
        }).then((c) => c.toDataURL("image/jpeg", 0.82));
      }),
    );

    containers.forEach((c) => document.body.removeChild(c));

    const pdf = new jsPDF("l", "in", "a4");
    const cw = 3.5,
      ch = 7.1,
      gap = 0.2;
    const pw = pdf.internal.pageSize.getWidth(),
      ph = pdf.internal.pageSize.getHeight();
    const tw = cw * 3 + gap * 2;
    const yo = (ph - ch) / 2;
    const pos = [
      (pw - tw) / 2,
      (pw - tw) / 2 + cw + gap,
      (pw - tw) / 2 + (cw + gap) * 2,
    ];
    images.forEach((img, i) => pdf.addImage(img, "JPEG", pos[i], yo, cw, ch));
    return pdf;
  };

  // ── Individual: Download ──────────────────────────────────────────────
  const handleDownload = async () => {
    if (!displayEmployee) return;
    setIndivSending(true);
    try {
      const pdf = await generate3MonthPDF(displayEmployee);
      pdf.save(
        `${getSurname(displayEmployee.name)}_${formatPeriod(displayEmployee.startDate)}.pdf`,
      );
      // Audit log for print
      try {
        await axios.post(
          `${API_BASE_URL}/PayrollReleasedRoute/log-print`,
          { employeeNumber: displayEmployee.employeeNumber },
          getAuthHeaders(),
        );
      } catch (e) {
        console.error('Print audit log error:', e);
      }
      setIndivModal({ open: true, type: "success", action: "download" });
    } catch {
      setIndivModal({
        open: true,
        type: "error",
        message: "Failed to generate PDF.",
      });
    } finally {
      setIndivSending(false);
    }
  };

  // ── Individual: Send via Gmail ────────────────────────────────────────
  const handleSendGmail = async () => {
    if (!displayEmployee) return;
    setIndivSending(true);
    try {
      const pdf = await generate3MonthPDF(displayEmployee);
      const filename = `${getSurname(displayEmployee.name)}_${formatPeriod(displayEmployee.startDate)}.pdf`;
      const blob = pdf.output("blob");
      const fd = new FormData();
      fd.append("pdf", blob, filename);
      fd.append("name", displayEmployee.name);
      fd.append("employeeNumber", displayEmployee.employeeNumber);
      const res = await axios.post(
        `${API_BASE_URL}/SendPayslipRoute/send-payslip`,
        fd,
        {
          ...getAuthHeaders(),
          headers: {
            ...getAuthHeaders().headers,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      if (res.data.success)
        setIndivModal({ open: true, type: "success", action: "gmail" });
      else
        setIndivModal({
          open: true,
          type: "error",
          message: res.data.error || "Failed to send payslip.",
        });
    } catch {
      setIndivModal({
        open: true,
        type: "error",
        message: "An error occurred while sending payslip.",
      });
    } finally {
      setIndivSending(false);
    }
  };

  // ── Bulk: Send selected ───────────────────────────────────────────────
  const sendSelectedPayslips = async () => {
    if (!selectedEmployees.length) return;
    setSending(true);
    setLoadingMessage("Generating payslips and sending via Gmail...");
    try {
      const emps = filteredPayroll.filter((e) =>
        selectedEmployees.includes(e.employeeNumber),
      );
      const batchSize = 3;
      const batches = [];
      for (let i = 0; i < emps.length; i += batchSize)
        batches.push(emps.slice(i, i + batchSize));

      const fd = new FormData();
      const meta = [];

      for (let bi = 0; bi < batches.length; bi++) {
        setLoadingMessage(`Processing batch ${bi + 1}/${batches.length}...`);
        const results = await Promise.all(
          batches[bi].map(async (emp) => {
            setLoadingMessage(
              `Batch ${bi + 1}/${batches.length}: Generating for ${emp.name}...`,
            );
            const pdf = await generate3MonthPDF(emp);
            return { blob: pdf.output("blob"), emp };
          }),
        );
        results.forEach(({ blob, emp }) => {
          fd.append(
            "pdfs",
            blob,
            `${getSurname(emp.name)}_${formatPeriod(emp.startDate)}.pdf`,
          );
          meta.push({ name: emp.name, employeeNumber: emp.employeeNumber });
        });
      }

      setLoadingMessage("Sending payslips via Gmail...");
      fd.append("payslips", JSON.stringify(meta));
      await axios.post(`${API_BASE_URL}/SendPayslipRoute/send-bulk`, fd, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccessOverlay({ open: true, action: "gmail" });
    } catch {
      setBulkModal({
        open: true,
        type: "error",
        message: "An error occurred while sending bulk payslips.",
      });
    } finally {
      setSending(false);
    }
  };

  // ── Payslip React preview renderer ────────────────────────────────────
  const renderPayslipPreview = (emp) => {
    const isJO = (emp.employmentCategory ?? -1) === 0;
    const period = (() => {
      if (!emp.startDate || !emp.endDate) return "—";
      const s = new Date(emp.startDate),
        e = new Date(emp.endDate);
      return `${s.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${s.getDate()}–${e.getDate()} ${e.getFullYear()}`;
    })();

    const SecHead = ({ title, icon }) => (
      <Box
        sx={{
          backgroundColor: "#6D2323",
          color: "white",
          px: 2,
          py: 0.8,
          display: "flex",
          alignItems: "center",
          gap: 1.2,
        }}
      >
        {icon}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "20px",
            letterSpacing: "0.07em",
            fontFamily: '"Poppins",sans-serif',
          }}
        >
          {title}
        </Typography>
      </Box>
    );

    if (isJO)
      return (
        <>
          <Box
            sx={{
              border: "2.5px solid #6d2323",
              borderRadius: "6px",
              mb: 2,
              overflow: "hidden",
            }}
          >
            <SecHead title="EMPLOYEE INFORMATION" />
            <Grid container>
              {[
                [
                  "EMPLOYEE NUMBER",
                  <Typography
                    sx={{
                      fontSize: "26px",
                      color: "#c0392b",
                      fontWeight: 900,
                      fontFamily: '"Poppins",sans-serif',
                    }}
                  >
                    {emp.employeeNumber
                      ? `${parseFloat(emp.employeeNumber)}`
                      : "—"}
                  </Typography>,
                ],
                [
                  "NAME",
                  <Typography
                    sx={{
                      fontSize: "26px",
                      color: "#c0392b",
                      fontWeight: 900,
                      fontFamily: '"Poppins",sans-serif',
                    }}
                  >
                    {emp.name || "—"}
                  </Typography>,
                ],
                [
                  "PERIOD",
                  <Typography
                    sx={{
                      fontSize: "21px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      fontFamily: '"Poppins",sans-serif',
                    }}
                  >
                    {period}
                  </Typography>,
                ],
                [
                  "RENDERED DAYS",
                  <Typography
                    sx={{
                      fontSize: "21px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      fontFamily: '"Poppins",sans-serif',
                    }}
                  >
                    {formatRenderedDays(emp.rh) || "—"}
                  </Typography>,
                ],
              ].map(([label, content], i) => (
                <Grid item xs={12} md={6} key={i}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRight: i % 2 === 0 ? "2px solid #e0c8c8" : "none",
                      borderBottom: i < 2 ? "2px solid #e0c8c8" : "none",
                      minHeight: "60px",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "18px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        color: "#6d2323",
                        mb: 0.5,
                        fontFamily: '"Poppins",sans-serif',
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </Typography>
                    {content}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Box
            sx={{
              border: "2.5px solid #6d2323",
              borderRadius: "6px",
              mb: 2,
              overflow: "hidden",
            }}
          >
            <SecHead
              title="DEDUCTIONS"
              icon={<RemoveCircleOutlineIcon sx={{ fontSize: 22 }} />}
            />
            <MoneyCell label="SSS" value={formatCurrency(emp.sss)} />
            <MoneyCell
              label="Pag-IBIG"
              value={formatCurrency(emp.pagibigFundCont)}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
            <SummaryCard
              label="Net Salary"
              value={formatCurrency(emp.netSalary)}
            />
            <SummaryCard
              label="Total Deductions"
              value={formatCurrency(emp.totalDeductions)}
            />
            <SummaryCard label="Net Pay" value={computeNetPay(emp)} accent />
          </Box>
          <Box
            sx={{
              borderTop: "2.5px solid #e0c8c8",
              mt: 5,
              pt: 4,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "18px",
                color: "#555",
                mb: 1.5,
                fontFamily: '"Poppins",sans-serif',
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Certified Correct
            </Typography>
            <Typography
              sx={{
                fontSize: "24px",
                fontWeight: 900,
                color: "#1a1a1a",
                fontFamily: '"Poppins",sans-serif',
              }}
            >
              {certifierName}
            </Typography>
            <Typography
              sx={{
                fontSize: "20px",
                color: "#444",
                fontFamily: '"Poppins",sans-serif',
                fontWeight: 600,
                mt: 0.5,
              }}
            >
              {certifierPosition}
            </Typography>
          </Box>
        </>
      );

    return (
      <>
        <Box
          sx={{
            border: "2.5px solid #6d2323",
            borderRadius: "6px",
            mb: 2,
            overflow: "hidden",
          }}
        >
          <SecHead title="EMPLOYEE INFORMATION" />
          <Grid container>
            {[
              [
                "PERIOD",
                <Typography
                  sx={{
                    fontSize: "21px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                    fontFamily: '"Poppins",sans-serif',
                  }}
                >
                  {period}
                </Typography>,
              ],
              [
                "EMPLOYEE NUMBER",
                <Typography
                  sx={{
                    fontSize: "26px",
                    color: "#c0392b",
                    fontWeight: 900,
                    fontFamily: '"Poppins",sans-serif',
                  }}
                >
                  {emp.employeeNumber
                    ? `${parseFloat(emp.employeeNumber)}`
                    : "—"}
                </Typography>,
              ],
              [
                "NAME",
                <Typography
                  sx={{
                    fontSize: "26px",
                    color: "#c0392b",
                    fontWeight: 900,
                    fontFamily: '"Poppins",sans-serif',
                  }}
                >
                  {emp.name || "—"}
                </Typography>,
              ],
            ].map(([label, content], i) => (
              <Grid item xs={12} md={i === 2 ? 12 : 6} key={i}>
                <Box
                  sx={{
                    p: 2,
                    borderRight: i === 0 ? "2px solid #e0c8c8" : "none",
                    borderBottom: i < 2 ? "2px solid #e0c8c8" : "none",
                    minHeight: "70px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      color: "#6d2323",
                      mb: 0.5,
                      fontFamily: '"Poppins",sans-serif',
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </Typography>
                  {content}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box
          sx={{
            border: "2.5px solid #6d2323",
            borderRadius: "6px",
            mb: 2,
            overflow: "hidden",
          }}
        >
          <SecHead title="DEDUCTIONS BREAKDOWN" />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              backgroundColor: "#f5eaea",
              borderBottom: "2px solid #c9a8a8",
            }}
          >
            {["Government & Tax", "GSIS Loans", "Other Deductions"].map(
              (h, i) => (
                <Typography
                  key={i}
                  sx={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#6d2323",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    px: 2,
                    py: 1,
                    fontFamily: '"Poppins",sans-serif',
                    borderRight: i < 2 ? "2px solid #c9a8a8" : "none",
                  }}
                >
                  {h}
                </Typography>
              ),
            )}
          </Box>
          {[
            [
              ["Withholding Tax", formatCurrency(emp.withholdingTax)],
              ["GSIS Salary Loan", formatCurrency(emp.gsisSalaryLoan)],
              ["Life & Retirement", formatCurrency(emp.personalLifeRetIns)],
            ],
            [
              ["PhilHealth", formatCurrency(emp.PhilHealthContribution)],
              ["GSIS Policy Loan", formatCurrency(emp.gsisPolicyLoan)],
              ["PhilHealth Diff", formatCurrency(emp.philhealthDiff)],
            ],
            [
              ["Pag-IBIG", formatCurrency(emp.pagibigFundCont)],
              ["GSIS Housing Loan", formatCurrency(emp.gsisHousingLoan)],
              ["Pag-IBIG 2", formatCurrency(emp.pagibig2)],
            ],
            [
              ["SSS", formatCurrency(emp.sss)],
              ["GSIS Arrears", formatCurrency(emp.gsisArrears)],
              ["LBP Loan", formatCurrency(emp.lbpLoan)],
            ],
            [
              ["ECC", formatCurrency(emp.ecc)],
              ["GFAL", formatCurrency(emp.gfal)],
              ["MTSLAI", formatCurrency(emp.mtslai)],
            ],
            [
              ["To Be Refunded", formatCurrency(emp.toBeRefunded)],
              ["CPL", formatCurrency(emp.cpl)],
              ["ESLAI", formatCurrency(emp.eslai)],
            ],
            [
              ["FEU", formatCurrency(emp.feu)],
              ["MPL", formatCurrency(emp.mpl)],
              ["ABS", formatAbs(emp.abs)],
            ],
            [
              ["", ""],
              ["MPL Lite", formatCurrency(emp.mplLite)],
              ["ELA", formatCurrency(emp.ela)],
            ],
          ].map((row, i) => (
            <DeductionRow key={i} items={row} isEven={i % 2 === 0} />
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
          <SummaryCard
            label="Net Salary"
            value={formatCurrency(emp.netSalary)}
          />
          <SummaryCard
            label="Total Deductions"
            value={formatCurrency(emp.totalDeductions)}
          />
          <SummaryCard label="Net Pay" value={computeNetPay(emp)} accent />
        </Box>
        <Box
          sx={{
            border: "2.5px solid #6d2323",
            borderRadius: "6px",
            mb: 2,
            overflow: "hidden",
          }}
        >
          <SecHead title="PAYMENT BREAKDOWN" />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)" }}>
            {[
              ["1ST QUINCENA", formatCurrency(emp.pay1st)],
              ["2ND QUINCENA", formatCurrency(emp.pay2nd)],
            ].map(([label, value], i) => (
              <Box
                key={i}
                sx={{
                  p: 2,
                  borderRight: i === 0 ? "2px solid #e0c8c8" : "none",
                  minHeight: "70px",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#6d2323",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontFamily: '"Poppins",sans-serif',
                    mb: 0.5,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#1a1a1a",
                    fontFamily: '"Poppins",sans-serif',
                    lineHeight: 1.1,
                  }}
                >
                  {value || "—"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ mt: 5, pt: 4, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: "18px",
              color: "#555",
              mb: 1.5,
              fontFamily: '"Poppins",sans-serif',
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Certified Correct
          </Typography>
          <Typography
            sx={{
              fontSize: "24px",
              fontWeight: 900,
              color: "#1a1a1a",
              fontFamily: '"Poppins",sans-serif',
            }}
          >
            {certifierName}
          </Typography>
          <Typography
            sx={{
              fontSize: "20px",
              color: "#444",
              fontFamily: '"Poppins",sans-serif',
              fontWeight: 600,
              mt: 0.5,
            }}
          >
            {certifierPosition}
          </Typography>
        </Box>
      </>
    );
  };

  // ── Guards ────────────────────────────────────────────────────────────
  if (loading || accessLoading) return <PayslipDistributionWireframe />;
  if (!accessLoading && hasAccess !== true)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Payslip Distribution. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  // ── Shared page header ────────────────────────────────────────────────
  const PageHeader = () => (
    <Fade in timeout={500}>
      <Box sx={{ mb: 4 }}>
        <GlassCard
          sx={{
            background: `rgba(${hexToRgb(primaryColor)},0.95)`,
            boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
            border: `1px solid ${alpha(accentColor, 0.1)}`,
          }}
        >
          <Box
            sx={{
              p: 5,
              background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: `radial-gradient(circle,${alpha(accentColor, 0.1)} 0%,transparent 70%)`,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -30,
                left: "30%",
                width: 150,
                height: 150,
                background: `radial-gradient(circle,${alpha(accentColor, 0.08)} 0%,transparent 70%)`,
              }}
            />
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              position="relative"
              zIndex={1}
            >
              <Box display="flex" alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: alpha(primaryColor, 0.8),
                    mr: 4,
                    width: 64,
                    height: 64,
                    boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}`,
                  }}
                >
                  <WorkIcon sx={{ color: textPrimaryColor, fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      lineHeight: 1.2,
                      color: textPrimaryColor,
                    }}
                  >
                    Employee Payslip{" "}
                    {viewMode === "individual" ? "Records" : "Distribution"}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ opacity: 0.8, color: textPrimaryColor }}
                  >
                    {viewMode === "individual"
                      ? "Search and view individual employee payslip records"
                      : "Manage and distribute monthly employee payslip records"}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={2}>
                {viewMode === "individual" && (
                  <ProfessionalButton
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => {
                      setViewMode("bulk");
                      handleIndivClear();
                    }}
                    sx={{
                      borderColor: accentColor,
                      color: accentColor,
                      "&:hover": { bgcolor: alpha(accentColor, 0.08) },
                    }}
                  >
                    Back to Distribution
                  </ProfessionalButton>
                )}
                <Chip
                  label={
                    viewMode === "individual"
                      ? "Individual View"
                      : "Bulk Distribution"
                  }
                  size="small"
                  sx={{
                    bgcolor: "rgba(109,35,35,0.15)",
                    color: textPrimaryColor,
                    fontWeight: 500,
                  }}
                />
                <Tooltip title="Refresh Data">
                  <IconButton
                    onClick={() => fetchPayrollData()}
                    sx={{
                      bgcolor: "rgba(109,35,35,0.1)",
                      "&:hover": { bgcolor: "rgba(109,35,35,0.2)" },
                      color: textPrimaryColor,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </GlassCard>
      </Box>
    </Fade>
  );

  // ════════════════════════════════════════════════════════════════════
  // INDIVIDUAL VIEW
  // ════════════════════════════════════════════════════════════════════
  if (viewMode === "individual")
    return (
      <>
        <Box sx={{ py: 4, width: "1200px", mx: "auto", overflow: "hidden" }}>
          <Box sx={{ px: 6 }}>
            <PageHeader />

            {error && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Search + month picker */}
            <Fade in timeout={700}>
              <GlassCard
                sx={{
                  mb: 4,
                  background: `rgba(${hexToRgb(primaryColor)},0.95)`,
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Grid container spacing={3} alignItems="flex-end">
                    <Grid item xs={12} md={8}>
                      <ModernTextField
                        fullWidth
                        label="Search by Name or Employee Number"
                        value={indivSearch}
                        onChange={(e) => setIndivSearch(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleIndivSearch()
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: accentColor }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Stack direction="row" spacing={2}>
                        <ProfessionalButton
                          variant="contained"
                          onClick={handleIndivSearch}
                          disabled={!indivSearch.trim()}
                          sx={{
                            bgcolor: accentColor,
                            color: primaryColor,
                            "&:hover": { bgcolor: accentDark },
                            "&:disabled": { bgcolor: blackColor, color: primaryColor},
                            flex: 1,
                          }}
                        >
                          Search
                        </ProfessionalButton>
                        <ProfessionalButton
                          variant="outlined"
                          onClick={handleIndivClear}
                          sx={{
                            borderColor: accentColor,
                            color: accentColor,
                            "&:hover": { bgcolor: alpha(accentColor, 0.08) },
                          }}
                        >
                          Clear
                        </ProfessionalButton>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3, borderColor: "rgba(109,35,35,0.1)" }} />

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 2,
                    }}
                  >
                    <CalendarToday sx={{ color: accentColor, fontSize: 20 }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: accentColor }}
                    >
                      Select Month
                      {!indivHasSearched && (
                        <span
                          style={{
                            fontWeight: 400,
                            opacity: 0.6,
                            fontSize: "0.85rem",
                            marginLeft: 8,
                          }}
                        >
                          (search first)
                        </span>
                      )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(12,1fr)",
                      gap: 1.5,
                    }}
                  >
                    {months.map((m) => (
                      <ProfessionalButton
                        key={m}
                        variant={m === indivMonth ? "contained" : "outlined"}
                        size="small"
                        disabled={!indivHasSearched}
                        onClick={() => handleIndivMonthSelect(m)}
                        sx={{
                          borderColor: indivHasSearched
                            ? accentColor
                            : grayColor,
                          color:
                            m === indivMonth
                              ? primaryColor
                              : indivHasSearched
                                ? accentColor
                                : grayColor,
                          minWidth: "auto",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          py: 1,
                          backgroundColor:
                            m === indivMonth ? accentColor : "transparent",
                          "&:hover": {
                            backgroundColor: indivHasSearched
                              ? m === indivMonth
                                ? accentDark
                                : alpha(accentColor, 0.1)
                              : "transparent",
                          },
                          "&:disabled": { opacity: 0.45 },
                        }}
                      >
                        {m}
                      </ProfessionalButton>
                    ))}
                  </Box>
                </CardContent>
              </GlassCard>
            </Fade>

            {/* Payslip preview */}
            {displayEmployee ? (
              <Fade in timeout={900}>
                <GlassCard
                  sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}
                >
                  {/* Card header */}
                  <Box
                    sx={{
                      p: 4,
                      background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.7,
                          mb: 1,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: accentDark,
                        }}
                      >
                        Employee Payslip Record
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 600, color: accentColor, mb: 1 }}
                      >
                        {displayEmployee.name}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mt: 1,
                        }}
                      >
                        <Chip
                          icon={<Person sx={{ fontSize: 18 }} />}
                          label={`ID: ${displayEmployee.employeeNumber}`}
                          size="small"
                          sx={{
                            bgcolor: alpha(accentColor, 0.12),
                            color: accentColor,
                            fontWeight: 500,
                          }}
                        />
                        <Chip
                          icon={<CalendarToday sx={{ fontSize: 18 }} />}
                          label={(() => {
                            if (
                              !displayEmployee.startDate ||
                              !displayEmployee.endDate
                            )
                              return "—";
                            const s = new Date(displayEmployee.startDate),
                              e = new Date(displayEmployee.endDate);
                            return `${s.toLocaleString("en-US", { month: "short" }).toUpperCase()} ${s.getDate()}–${e.getDate()}`;
                          })()}
                          size="small"
                          sx={{
                            bgcolor: alpha(accentColor, 0.12),
                            color: accentColor,
                            fontWeight: 500,
                          }}
                        />
                      </Box>
                    </Box>
                    <Avatar
                      sx={{
                        bgcolor: alpha(accentColor, 0.12),
                        width: 80,
                        height: 80,
                        fontSize: "2rem",
                        fontWeight: 600,
                        color: accentColor,
                      }}
                    >
                      {displayEmployee.name
                        ? displayEmployee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "E"}
                    </Avatar>
                  </Box>

                  {/* Payslip paper */}
                  <Paper
                    ref={payslipRef}
                    elevation={0}
                    sx={{
                      p: 3,
                      pb: 4,
                      borderRadius: 0,
                      backgroundColor: "#fff",
                      fontFamily: '"Poppins",sans-serif',
                      position: "relative",
                      width: "1100px",
                      display: "block",
                      margin: "0 auto",
                      boxSizing: "border-box",
                    }}
                  >
                    {hrisLogo && (
                      <Box
                        component="img"
                        src={hrisLogo}
                        alt="Watermark"
                        sx={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                          opacity: 0.08,
                          width: "70%",
                          pointerEvents: "none",
                          userSelect: "none",
                          zIndex: 2,
                          mixBlendMode: "multiply",
                        }}
                      />
                    )}
                    {/* Header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2.5,
                        background:
                          "linear-gradient(135deg,#6d2323 0%,#a31d1d 100%)",
                        borderRadius: "6px",
                        p: "20px 28px",
                        boxShadow: "0 4px 20px rgba(109,35,35,0.3)",
                      }}
                    >
                      {institutionLogo ? (
                        <img
                          src={institutionLogo}
                          alt="Logo"
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: "50%",
                            objectFit: "cover",
                            marginLeft: 8,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 88,
                            height: 88,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.15)",
                            border: "2px solid rgba(255,255,255,0.3)",
                            marginLeft: 8,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box
                        textAlign="center"
                        flex={1}
                        sx={{ color: "white", px: 2 }}
                      >
                        <Typography
                          sx={{
                            fontStyle: "italic",
                            fontSize: "18px",
                            opacity: 0.9,
                            fontFamily: '"Poppins",sans-serif',
                          }}
                        >
                          Republic of the Philippines
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: "22px",
                            lineHeight: 1.4,
                            fontFamily: '"Poppins",sans-serif',
                            letterSpacing: "0.02em",
                            mt: 0.5,
                          }}
                        >
                          {institutionName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "17px",
                            opacity: 0.85,
                            fontFamily: '"Poppins",sans-serif',
                            mt: 0.3,
                          }}
                        >
                          {institutionAddress}
                        </Typography>
                      </Box>
                      {hrisLogo ? (
                        <img
                          src={hrisLogo}
                          alt="HRIS Logo"
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 100,
                            height: 100,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.15)",
                            border: "2px solid rgba(255,255,255,0.3)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                    {/* Body */}
                    <Box sx={{ position: "relative", zIndex: 1 }}>
                      {renderPayslipPreview(displayEmployee)}
                    </Box>
                  </Paper>

                  {/* Action buttons */}
                  <Box
                    sx={{
                      p: 4,
                      background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                      borderTop: `2px solid ${alpha(accentColor, 0.12)}`,
                    }}
                  >
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <ProfessionalButton
                          variant="contained"
                          fullWidth
                          startIcon={
                            indivSending ? (
                              <CircularProgress
                                size={22}
                                sx={{ color: primaryColor }}
                              />
                            ) : (
                              <Download />
                            )
                          }
                          onClick={handleDownload}
                          disabled={indivSending}
                          sx={{
                            py: 2,
                            bgcolor: accentColor,
                            color: primaryColor,
                            fontSize: "1rem",
                            "&:hover": { bgcolor: accentDark },
                          }}
                        >
                          {indivSending ? "Generating..." : "Download PDF"}
                        </ProfessionalButton>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <ProfessionalButton
                          variant="contained"
                          fullWidth
                          startIcon={
                            indivSending ? (
                              <CircularProgress
                                size={22}
                                sx={{ color: primaryColor }}
                              />
                            ) : (
                              <Send />
                            )
                          }
                          onClick={handleSendGmail}
                          disabled={indivSending}
                          sx={{
                            py: 2,
                            bgcolor: blackColor,
                            color: primaryColor,
                            fontSize: "1rem",
                            "&:hover": { bgcolor: "#2f2f2f" },
                          }}
                        >
                          {indivSending ? "Sending..." : "Send via Gmail"}
                        </ProfessionalButton>
                      </Grid>
                    </Grid>
                  </Box>
                </GlassCard>
              </Fade>
            ) : indivMonth ? (
              <Fade in timeout={600}>
                <GlassCard sx={{ mb: 4 }}>
                  <CardContent sx={{ p: 4, textAlign: "center" }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(accentColor, 0.1),
                        mx: "auto",
                        mb: 3,
                        width: 72,
                        height: 72,
                        color: accentColor,
                      }}
                    >
                      <CalendarToday sx={{ fontSize: 36 }} />
                    </Avatar>
                    <Typography
                      variant="h6"
                      color={accentColor}
                      sx={{ fontWeight: 700 }}
                    >
                      No Payslip Found
                    </Typography>
                    <Typography variant="body2" color={grayColor}>
                      No records found for <b>{indivMonth}</b>
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Fade>
            ) : indivHasSearched ? (
              <Fade in timeout={600}>
                <GlassCard sx={{ mb: 4 }}>
                  <CardContent sx={{ p: 4, textAlign: "center" }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(accentColor, 0.1),
                        mx: "auto",
                        mb: 3,
                        width: 72,
                        height: 72,
                        color: accentColor,
                      }}
                    >
                      <CalendarToday sx={{ fontSize: 36 }} />
                    </Avatar>
                    <Typography
                      variant="h6"
                      color={accentColor}
                      sx={{ fontWeight: 700 }}
                    >
                      Select Pay Period
                    </Typography>
                    <Typography variant="body2" color={grayColor}>
                      Please select a month to view the payslip
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Fade>
            ) : null}
          </Box>
        </Box>

        <Dialog
          open={indivModal.open}
          onClose={() => setIndivModal({ ...indivModal, open: false })}
          PaperProps={{ sx: { borderRadius: 4 } }}
        >
          <SuccessfulOverlay
            open={indivModal.open && indivModal.type === "success"}
            action={indivModal.action}
            onClose={() => setIndivModal({ ...indivModal, open: false })}
          />
          {indivModal.type === "error" && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Error
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {indivModal.message}
              </Typography>
              <Button
                onClick={() => setIndivModal({ ...indivModal, open: false })}
                sx={{ mt: 2 }}
              >
                OK
              </Button>
            </Box>
          )}
        </Dialog>
      </>
    );

  // ════════════════════════════════════════════════════════════════════
  // BULK DISTRIBUTION VIEW
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      <Box sx={{ py: 4, width: "1200px", mx: "auto", overflow: "hidden" }}>
        <Box sx={{ px: 6 }}>
          <PageHeader />

          {error && (
            <Fade in>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {error}
              </Alert>
            </Fade>
          )}

          {/* Mode toggle card */}
          <Fade in timeout={600}>
            <GlassCard
              sx={{
                mb: 4,
                background: `rgba(${hexToRgb(primaryColor)},0.95)`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {[
                    {
                      mode: "bulk",
                      icon: (
                        <Send
                          sx={{ fontSize: 28, color: accentColor, mb: 0.5 }}
                        />
                      ),
                      title: "Bulk Distribution",
                      desc: "Select a month and send payslips to multiple employees at once",
                    },
                    {
                      mode: "individual",
                      icon: (
                        <Person
                          sx={{ fontSize: 28, color: accentColor, mb: 0.5 }}
                        />
                      ),
                      title: "Individual View",
                      desc: "Search an employee and view, download, or send their payslip",
                    },
                  ].map(({ mode, icon, title, desc }) => (
                    <Grid item xs={12} md={6} key={mode}>
                      <Box
                        onClick={() => setViewMode(mode)}
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          cursor: "pointer",
                          textAlign: "center",
                          border: `2px solid ${viewMode === mode ? accentColor : alpha(accentColor, 0.2)}`,
                          bgcolor:
                            viewMode === mode
                              ? alpha(accentColor, 0.06)
                              : "transparent",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: accentColor,
                            bgcolor: alpha(accentColor, 0.04),
                          },
                        }}
                      >
                        {icon}
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: accentColor,
                            fontSize: "1rem",
                          }}
                        >
                          {title}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: accentDark, opacity: 0.7, mt: 0.5 }}
                        >
                          {desc}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Bulk filter controls */}
          <Fade in timeout={700}>
            <GlassCard
              sx={{
                mb: 4,
                background: `rgba(${hexToRgb(primaryColor)},0.95)`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={8}>
                    <ModernTextField
                      fullWidth
                      label="Search by Name or Employee Number"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: accentColor }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <ModernTextField
                      fullWidth
                      select
                      label="Year"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      {years.map((y) => (
                        <MenuItem key={y} value={y}>
                          {y}
                        </MenuItem>
                      ))}
                    </ModernTextField>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 3, borderColor: "rgba(109,35,35,0.1)" }} />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <CalendarToday sx={{ color: accentColor, fontSize: 20 }} />
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: accentColor }}
                  >
                    Filter By Month:
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(3,1fr)",
                      sm: "repeat(6,1fr)",
                      md: "repeat(12,1fr)",
                    },
                    gap: 1.5,
                  }}
                >
                  {months.map((m) => (
                    <ProfessionalButton
                      key={m}
                      variant={m === selectedMonth ? "contained" : "outlined"}
                      size="small"
                      onClick={() => setSelectedMonth(m)}
                      sx={{
                        borderColor: accentColor,
                        color: m === selectedMonth ? primaryColor : accentColor,
                        minWidth: "auto",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        py: 1,
                        backgroundColor:
                          m === selectedMonth ? accentColor : "transparent",
                        "&:hover": {
                          backgroundColor:
                            m === selectedMonth
                              ? accentDark
                              : alpha(accentColor, 0.1),
                        },
                      }}
                    >
                      {m}
                    </ProfessionalButton>
                  ))}
                </Box>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Employee table */}
          {selectedMonth && (
            <Fade in timeout={900}>
              <GlassCard
                sx={{
                  mb: 4,
                  background: `rgba(${hexToRgb(primaryColor)},0.95)`,
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.8,
                        mb: 1,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: accentDark,
                      }}
                    >
                      Employee List
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                    >
                      {selectedMonth} {selectedYear}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                      <Chip
                        label={`${filteredPayroll.length} Employees`}
                        size="small"
                        sx={{
                          bgcolor: "rgba(109,35,35,0.15)",
                          color: textPrimaryColor,
                          fontWeight: 500,
                        }}
                      />
                      <Chip
                        label={`${selectedEmployees.length} Selected`}
                        size="small"
                        sx={{
                          bgcolor: "rgba(109,35,35,0.15)",
                          color: textPrimaryColor,
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
                <PremiumTableContainer>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                      <TableRow>
                        <PremiumTableCell
                          isHeader
                          sx={{ color: accentColor, width: 80 }}
                        >
                          <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            onChange={handleSelectAll}
                            sx={{ color: accentColor }}
                          />
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor }}>
                          Name
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor }}>
                          Employee Number
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor }}>
                          Status
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor }}>
                          Actions
                        </PremiumTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPayroll.length > 0 ? (
                        filteredPayroll.map((emp) => (
                          <TableRow
                            key={emp.employeeNumber}
                            sx={{
                              "&:nth-of-type(even)": {
                                bgcolor: alpha(primaryColor, 0.3),
                              },
                              "&:hover": { bgcolor: alpha(accentColor, 0.05) },
                              transition: "all 0.2s",
                            }}
                          >
                            <PremiumTableCell>
                              <Checkbox
                                checked={selectedEmployees.includes(
                                  emp.employeeNumber,
                                )}
                                onChange={() =>
                                  handleSelectOne(emp.employeeNumber)
                                }
                                sx={{ color: accentColor }}
                              />
                            </PremiumTableCell>
                            <PremiumTableCell>{emp.name}</PremiumTableCell>
                            <PremiumTableCell>
                              {emp.employeeNumber}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {emp.startDate ? (
                                <Chip
                                  label="Available"
                                  size="small"
                                  sx={{
                                    bgcolor: "rgba(76,175,80,0.15)",
                                    color: "#2e7d32",
                                    fontWeight: 500,
                                  }}
                                />
                              ) : (
                                <Chip
                                  label="No Data"
                                  size="small"
                                  sx={{
                                    bgcolor: "rgba(244,67,54,0.15)",
                                    color: "#c62828",
                                    fontWeight: 500,
                                  }}
                                />
                              )}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Tooltip title="View Payslip">
                                <Button
                                  size="small"
                                  startIcon={<Visibility fontSize="small" />}
                                  onClick={() => openPayslipModal(emp)}
                                  sx={{
                                    border: `1px solid ${alpha(accentColor, 0.2)}`,
                                    padding: "4px 12px",
                                    bgcolor: alpha(accentColor, 0.08),
                                    color: accentColor,
                                    "&:hover": {
                                      bgcolor: alpha(accentColor, 0.18),
                                    },
                                  }}
                                >
                                  View Payslip
                                </Button>
                              </Tooltip>
                            </PremiumTableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                            <Avatar
                              sx={{
                                bgcolor: "rgba(109,35,35,0.1)",
                                mx: "auto",
                                mb: 2,
                                width: 72,
                                height: 72,
                                color: accentColor,
                              }}
                            >
                              <Search sx={{ fontSize: 36 }} />
                            </Avatar>
                            <Typography
                              variant="h6"
                              color={accentColor}
                              sx={{ fontWeight: 600 }}
                            >
                              No Employee Data Found
                            </Typography>
                            <Typography variant="body2" color={accentDark}>
                              Try adjusting your search filters or selecting a
                              different month/year
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </PremiumTableContainer>
              </GlassCard>
            </Fade>
          )}

          {/* Send button */}
          {selectedMonth && filteredPayroll.length > 0 && (
            <Fade in timeout={1100}>
              <GlassCard
                sx={{
                  background: `rgba(${hexToRgb(primaryColor)},0.95)`,
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(primaryColor, 0.8),
                          color: textPrimaryColor,
                        }}
                      >
                        <Send />
                      </Avatar>
                      <Typography variant="body2" sx={{ color: accentDark }}>
                        Send payslips to selected employees via Gmail
                      </Typography>
                    </Box>
                  }
                  sx={{
                    bgcolor: alpha(primaryColor, 0.5),
                    pb: 2,
                    borderBottom: "1px solid rgba(109,35,35,0.1)",
                  }}
                />
                <CardContent sx={{ p: 4 }}>
                  <ProfessionalButton
                    variant="contained"
                    fullWidth
                    startIcon={<Send />}
                    onClick={sendSelectedPayslips}
                    disabled={sending || !selectedEmployees.length}
                    sx={{
                      py: 2,
                      bgcolor: accentColor,
                      color: primaryColor,
                      fontSize: "1rem",
                      "&:hover": { bgcolor: accentDark },
                    }}
                  >
                    {sending
                      ? "Sending..."
                      : `Distribute Payslips (${selectedEmployees.length} selected)`}
                  </ProfessionalButton>
                </CardContent>
              </GlassCard>
            </Fade>
          )}

          {/* ── Payslip View Modal ───────────────────────────────────── */}
          <Dialog
            open={payslipModal.open}
            onClose={() =>
              !modalSending && setPayslipModal({ open: false, emp: null })
            }
            maxWidth={false}
            PaperProps={{
              sx: {
                borderRadius: 4,
                width: "1160px",
                maxWidth: "95vw",
                maxHeight: "95vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            {payslipModal.emp && (
              <>
                {/* Modal header */}
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `2px solid ${alpha(accentColor, 0.15)}`,
                    flexShrink: 0,
                  }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: accentColor }}
                    >
                      {payslipModal.emp.name}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                      <Chip
                        icon={<Person sx={{ fontSize: 16 }} />}
                        label={`ID: ${payslipModal.emp.employeeNumber}`}
                        size="small"
                        sx={{
                          bgcolor: alpha(accentColor, 0.12),
                          color: accentColor,
                          fontWeight: 500,
                        }}
                      />
                      <Chip
                        icon={<CalendarToday sx={{ fontSize: 16 }} />}
                        label={(() => {
                          if (
                            !payslipModal.emp.startDate ||
                            !payslipModal.emp.endDate
                          )
                            return "—";
                          const s = new Date(payslipModal.emp.startDate),
                            e = new Date(payslipModal.emp.endDate);
                          return `${s.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${s.getDate()}–${e.getDate()} ${e.getFullYear()}`;
                        })()}
                        size="small"
                        sx={{
                          bgcolor: alpha(accentColor, 0.12),
                          color: accentColor,
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <ProfessionalButton
                      variant="contained"
                      startIcon={
                        modalSending ? (
                          <CircularProgress
                            size={18}
                            sx={{ color: primaryColor }}
                          />
                        ) : (
                          <Download />
                        )
                      }
                      onClick={handleModalDownload}
                      disabled={modalSending}
                      sx={{
                        bgcolor: accentColor,
                        color: primaryColor,
                        py: 1.2,
                        "&:hover": { bgcolor: accentDark },
                      }}
                    >
                      {modalSending ? "Generating..." : "Download PDF"}
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="contained"
                      startIcon={
                        modalSending ? (
                          <CircularProgress
                            size={18}
                            sx={{ color: primaryColor }}
                          />
                        ) : (
                          <Send />
                        )
                      }
                      onClick={handleModalSendGmail}
                      disabled={modalSending}
                      sx={{
                        bgcolor: blackColor,
                        color: primaryColor,
                        py: 1.2,
                        "&:hover": { bgcolor: "#2f2f2f" },
                      }}
                    >
                      {modalSending ? "Sending..." : "Send via Gmail"}
                    </ProfessionalButton>
                    <IconButton
                      onClick={() =>
                        !modalSending &&
                        setPayslipModal({ open: false, emp: null })
                      }
                      sx={{
                        bgcolor: alpha(accentColor, 0.1),
                        color: accentColor,
                        "&:hover": { bgcolor: alpha(accentColor, 0.2) },
                      }}
                    >
                      ✕
                    </IconButton>
                  </Box>
                </Box>

                {/* Scrollable payslip body */}
                <Box sx={{ overflowY: "auto", flex: 1 }}>
                  <Box
                    sx={{
                      p: 3,
                      backgroundColor: "#fff",
                      fontFamily: '"Poppins",sans-serif',
                      position: "relative",
                    }}
                  >
                    {hrisLogo && (
                      <Box
                        component="img"
                        src={hrisLogo}
                        alt="Watermark"
                        sx={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                          opacity: 0.08,
                          width: "70%",
                          pointerEvents: "none",
                          userSelect: "none",
                          zIndex: 2,
                          mixBlendMode: "multiply",
                        }}
                      />
                    )}
                    {/* Payslip institution header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2.5,
                        background:
                          "linear-gradient(135deg,#6d2323 0%,#a31d1d 100%)",
                        borderRadius: "6px",
                        p: "20px 28px",
                        boxShadow: "0 4px 20px rgba(109,35,35,0.3)",
                      }}
                    >
                      {institutionLogo ? (
                        <img
                          src={institutionLogo}
                          alt="Logo"
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: "50%",
                            objectFit: "cover",
                            marginLeft: 8,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 88,
                            height: 88,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.15)",
                            border: "2px solid rgba(255,255,255,0.3)",
                            marginLeft: 8,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box
                        textAlign="center"
                        flex={1}
                        sx={{ color: "white", px: 2 }}
                      >
                        <Typography
                          sx={{
                            fontStyle: "italic",
                            fontSize: "18px",
                            opacity: 0.9,
                            fontFamily: '"Poppins",sans-serif',
                          }}
                        >
                          Republic of the Philippines
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: "22px",
                            lineHeight: 1.4,
                            fontFamily: '"Poppins",sans-serif',
                            letterSpacing: "0.02em",
                            mt: 0.5,
                          }}
                        >
                          {institutionName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "17px",
                            opacity: 0.85,
                            fontFamily: '"Poppins",sans-serif',
                            mt: 0.3,
                          }}
                        >
                          {institutionAddress}
                        </Typography>
                      </Box>
                      {hrisLogo ? (
                        <img
                          src={hrisLogo}
                          alt="HRIS Logo"
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 100,
                            height: 100,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.15)",
                            border: "2px solid rgba(255,255,255,0.3)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                    {/* Payslip content */}
                    <Box sx={{ position: "relative", zIndex: 1 }}>
                      {renderPayslipPreview(payslipModal.emp)}
                    </Box>
                  </Box>
                </Box>
              </>
            )}
          </Dialog>

          {/* Modal action result dialog */}
          <Dialog
            open={modalActionModal.open}
            onClose={() =>
              setModalActionModal({ ...modalActionModal, open: false })
            }
            PaperProps={{ sx: { borderRadius: 4 } }}
          >
            <SuccessfulOverlay
              open={
                modalActionModal.open && modalActionModal.type === "success"
              }
              action={modalActionModal.action}
              onClose={() =>
                setModalActionModal({ ...modalActionModal, open: false })
              }
            />
            {modalActionModal.type === "error" && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Error
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {modalActionModal.message}
                </Typography>
                <Button
                  onClick={() =>
                    setModalActionModal({ ...modalActionModal, open: false })
                  }
                  sx={{ mt: 2 }}
                >
                  OK
                </Button>
              </Box>
            )}
          </Dialog>

          <Dialog
            open={bulkModal.open}
            onClose={() => setBulkModal({ ...bulkModal, open: false })}
            PaperProps={{ sx: { borderRadius: 4 } }}
          >
            <SuccessfulOverlay
              open={bulkModal.open && bulkModal.type === "success"}
              action={bulkModal.action}
              onClose={() => setBulkModal({ ...bulkModal, open: false })}
            />
            {bulkModal.type === "error" && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Error
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {bulkModal.message}
                </Typography>
                <Button
                  onClick={() => setBulkModal({ ...bulkModal, open: false })}
                  sx={{ mt: 2 }}
                >
                  OK
                </Button>
              </Box>
            )}
          </Dialog>
        </Box>
      </Box>

      {sending && (
        <LoadingOverlay
          open={sending}
          message={loadingMessage || "Processing..."}
        />
      )}
      {successOverlay.open && (
        <SuccessfulOverlay
          open={successOverlay.open}
          action={successOverlay.action}
          onClose={() => setSuccessOverlay({ open: false, action: "" })}
          showOkButton={true}
        />
      )}
    </>
  );
});

export default PayslipDistribution;
