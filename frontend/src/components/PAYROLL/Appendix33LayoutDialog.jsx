import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Modal,
  Fade,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Chip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Close,
  Save as SaveIcon,
  RestartAlt,
  CloudUpload,
  Download,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import API_BASE_URL from '../../apiConfig';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
  font: '"Poppins", "Segoe UI", sans-serif',
};

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
  fontFamily: T.font,
  letterSpacing: '0.01em',
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.8rem',
    backgroundColor: '#fff',
    fontFamily: T.font,
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root': { fontFamily: T.font },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const emptyMaps = () => ({
  wtax: {},
  pay: {},
  deds: {},
  firstRows: { wtax: 8, pay: 21, deds: 20 },
  departments: {},
  employmentTypes: {},
});

const Appendix33LayoutDialog = ({ open, onClose, getAuthHeaders, onMessage, onBusy, onActiveChange }) => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({ wtax: [], pay: [], deds: [] });
  const [defaults, setDefaults] = useState(emptyMaps());
  const [draft, setDraft] = useState(emptyMaps());
  const [templateDepartments, setTemplateDepartments] = useState([]);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [employmentTypeConfigs, setEmploymentTypeConfigs] = useState([]);
  const [capacity, setCapacity] = useState({});
  const [totalCapacity, setTotalCapacity] = useState(0);
  const [fileName, setFileName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [activateOnUpload, setActivateOnUpload] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/PayrollExportRoute/appendix33-layout`, getAuthHeaders());
      setFields(res.data.fields || { wtax: [], pay: [], deds: [] });
      setDefaults({ ...emptyMaps(), ...(res.data.defaults || {}) });
      setDraft({
        wtax: { ...(res.data.current?.wtax || {}) },
        pay: { ...(res.data.current?.pay || {}) },
        deds: { ...(res.data.current?.deds || {}) },
        firstRows: { ...(res.data.current?.firstRows || {}) },
        departments: { ...(res.data.current?.departments || {}) },
        employmentTypes: { ...(res.data.current?.employmentTypes || {}) },
      });
      setTemplateDepartments(res.data.templateDepartments || []);
      setDbDepartments(res.data.dbDepartments || []);
      setEmploymentTypeConfigs(res.data.employmentTypeConfigs || []);
      setCapacity(res.data.capacity || {});
      setTotalCapacity(res.data.totalCapacity || 0);
      setTemplates(res.data.templates || []);
      setActiveTemplate(res.data.activeTemplate || null);
      if (onActiveChange) onActiveChange(res.data.activeTemplate || null);
    } catch (err) {
      onMessage(err?.response?.data?.error || 'Could not load Appendix 33 layout', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setCol = (sheet, key, value) => {
    setDraft((prev) => ({ ...prev, [sheet]: { ...prev[sheet], [key]: value.toUpperCase() } }));
  };

  const setFirst = (sheet, value) => {
    setDraft((prev) => ({ ...prev, firstRows: { ...prev.firstRows, [sheet]: value } }));
  };

  const setDept = (code, templateKey) => {
    setDraft((prev) => ({ ...prev, departments: { ...prev.departments, [code]: templateKey } }));
  };

  const setEmpType = (typeName, templateKey) => {
    setDraft((prev) => ({
      ...prev,
      employmentTypes: { ...prev.employmentTypes, [typeName]: templateKey },
    }));
  };

  const handleSave = async () => {
    onBusy(true);
    try {
      await axios.put(`${API_BASE_URL}/PayrollExportRoute/appendix33-layout`, draft, getAuthHeaders());
      onMessage('Appendix 33 positions saved. The next export will use them.', 'success');
      onClose();
    } catch (err) {
      onMessage(err?.response?.data?.error || 'Could not save positions', 'error');
    } finally {
      onBusy(false);
    }
  };

  const handleReset = async () => {
    onBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/PayrollExportRoute/appendix33-layout/reset`, {}, getAuthHeaders());
      await load();
      onMessage('Positions restored to the default Appendix 33 layout.', 'success');
    } catch (err) {
      onMessage(err?.response?.data?.error || 'Could not reset positions', 'error');
    } finally {
      onBusy(false);
    }
  };

  const applyLibrary = (data) => {
    if (data.templates) setTemplates(data.templates);
    if (data.active !== undefined) {
      setActiveTemplate(data.active || null);
      if (onActiveChange) onActiveChange(data.active || null);
    }
    if (data.activeTemplate) {
      setActiveTemplate(data.activeTemplate);
      if (onActiveChange) onActiveChange(data.activeTemplate);
    }
  };

  const handleDownload = async (id) => {
    onBusy(true);
    try {
      const urlPath = id
        ? `${API_BASE_URL}/PayrollExportRoute/appendix33-templates/${id}/download`
        : `${API_BASE_URL}/PayrollExportRoute/appendix33-template`;
      const res = await axios.get(urlPath, { ...getAuthHeaders(), responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = match ? match[1] : 'EARIST_Appendix33.xlsm';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      onMessage(err?.response?.data?.error || 'Could not download the template', 'error');
    } finally {
      onBusy(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileName(file.name);
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name.replace(/\.xlsm$/i, ''));
    form.append('activate', activateOnUpload ? 'true' : 'false');
    onBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/PayrollExportRoute/appendix33-template`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      applyLibrary(res.data);
      await load();
      onMessage(res.data.message || 'Template uploaded.', 'success');
    } catch (err) {
      const data = err?.response?.data;
      onMessage(data?.error || 'Could not upload that template', 'error');
    } finally {
      onBusy(false);
    }
  };

  const handleActivate = async (id) => {
    onBusy(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/PayrollExportRoute/appendix33-templates/${id}/activate`, {}, getAuthHeaders());
      applyLibrary(res.data);
      await load();
      onMessage(res.data.message || 'Template is now in use.', 'success');
    } catch (err) {
      onMessage(err?.response?.data?.error || 'Could not activate that template', 'error');
    } finally {
      onBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inactive template? This cannot be undone.')) return;
    onBusy(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/PayrollExportRoute/appendix33-templates/${id}`, getAuthHeaders());
      applyLibrary(res.data);
      onMessage('Template deleted.', 'success');
    } catch (err) {
      onMessage(err?.response?.data?.error || 'Could not delete that template', 'error');
    } finally {
      onBusy(false);
    }
  };

  const formatWhen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const sheetBlock = (sheetKey, title) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, mb: 1, fontFamily: T.font }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
        {(fields[sheetKey] || []).map((field) => (
          <FieldInput
            key={field.key}
            size="small"
            label={field.label}
            value={draft[sheetKey]?.[field.key] || ''}
            onChange={(e) => setCol(sheetKey, field.key, e.target.value)}
            inputProps={{ maxLength: 3, style: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' } }}
            helperText={`Default ${defaults[sheetKey]?.[field.key] || '—'}`}
          />
        ))}
      </Box>
    </Box>
  );

  const knownCodes = new Set((dbDepartments || []).map((d) => d.code));
  const extraMapped = Object.keys(draft.departments || {}).filter((code) => !knownCodes.has(code));

  const knownTypeNames = new Set((employmentTypeConfigs || []).map((t) => t.typeName));
  const extraEmpMapped = Object.keys(draft.employmentTypes || {}).filter((name) => !knownTypeNames.has(name));

  const empTypesByGroup = {};
  (employmentTypeConfigs || []).forEach((row) => {
    const group = row.parentGroup || 'Other';
    if (!empTypesByGroup[group]) empTypesByGroup[group] = [];
    empTypesByGroup[group].push(row);
  });
  // Dedupe by typeName (same subcategory can appear under multiple classifications)
  const uniqueEmpTypes = [];
  const seenTypeName = new Set();
  Object.keys(empTypesByGroup).sort().forEach((group) => {
    empTypesByGroup[group].forEach((row) => {
      if (seenTypeName.has(row.typeName)) return;
      seenTypeName.add(row.typeName);
      uniqueEmpTypes.push(row);
    });
  });
  extraEmpMapped.forEach((typeName) => {
    uniqueEmpTypes.push({ id: `extra-${typeName}`, parentGroup: 'Mapped only', typeName });
  });

  const templateSelectItems = (
    <>
      <MenuItem value=""><em>Not mapped</em></MenuItem>
      {templateDepartments.map((t) => (
        <MenuItem key={t.key} value={t.key}>{t.key} — {t.title}</MenuItem>
      ))}
    </>
  );

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '94%', sm: 720 },
          maxHeight: '88vh',
          bgcolor: T.surface,
          borderRadius: 3,
          boxShadow: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: T.font,
        }}>
          <Box sx={{ px: 2.5, py: 1.75, bgcolor: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: T.font }}>Appendix 33 layout</Typography>
              <Typography sx={{ fontSize: '0.7rem', opacity: 0.85, fontFamily: T.font }}>
                Technical only — change field positions and which workbook export uses
              </Typography>
            </Box>
            <IconButton onClick={onClose} sx={{ color: '#fff' }}><Close /></IconButton>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
            px: 2,
            borderBottom: `1px solid ${T.divider}`,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', fontFamily: T.font },
            '& .Mui-selected': { color: `${T.accent} !important` },
            '& .MuiTabs-indicator': { bgcolor: T.accent },
          }}>
            <Tab label="Field positions" />
            <Tab label="Departments" />
            <Tab label="Employment categories" />
            <Tab label="Template file" />
          </Tabs>

          <Box sx={{ px: 2.5, py: 2, overflowY: 'auto', flex: 1 }}>
            {activeTemplate && (
              <Alert severity="success" sx={{ mb: 2, fontSize: '0.75rem', fontFamily: T.font }}>
                <strong>Currently in use:</strong> {activeTemplate.name}
                {activeTemplate.uploadedAt ? ` · uploaded ${formatWhen(activeTemplate.uploadedAt)}` : ''}
                {activeTemplate.totalCapacity ? ` · ${activeTemplate.totalCapacity} employee rows` : ''}
              </Alert>
            )}
            {loading && (
              <Typography sx={{ fontSize: '0.8rem', color: T.muted, fontFamily: T.font }}>Loading current layout…</Typography>
            )}

            {tab === 0 && !loading && (
              <>
                <Alert severity="warning" sx={{ mb: 2, fontSize: '0.75rem', fontFamily: T.font }}>
                  These letters are where the system writes values. If you move a column here, the same column must already exist in the Excel template — the workbook formulas are not rewritten.
                </Alert>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1, mb: 2.5 }}>
                  {['wtax', 'pay', 'deds'].map((key) => (
                    <FieldInput
                      key={key}
                      size="small"
                      type="number"
                      label={`${key.toUpperCase()} first row`}
                      value={draft.firstRows?.[key] ?? ''}
                      onChange={(e) => setFirst(key, e.target.value)}
                    />
                  ))}
                </Box>
                {sheetBlock('wtax', 'WTAX sheet')}
                {sheetBlock('pay', 'PAY sheet')}
                {sheetBlock('deds', 'DEDUCTIONS sheet')}
              </>
            )}

            {tab === 1 && !loading && (
              <>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem', fontFamily: T.font }}>
                  College / office codes from the department table. Blocks like GEN.AD and TEMPO are mapped under Employment categories instead.
                </Alert>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[...dbDepartments, ...extraMapped.map((code) => ({ code, description: 'Not in department table' }))].map((dept) => (
                    <Box key={dept.code} sx={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 1, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontFamily: T.font, color: T.text }}>
                        <strong>{dept.code}</strong>
                        <Box component="span" sx={{ color: T.muted, display: 'block', fontSize: '0.68rem' }}>{dept.description}</Box>
                      </Typography>
                      <FormControl size="small">
                        <Select
                          value={draft.departments?.[dept.code] || ''}
                          onChange={(e) => setDept(dept.code, e.target.value)}
                          displayEmpty
                          sx={{ fontSize: '0.78rem', fontFamily: T.font, borderRadius: 2 }}
                        >
                          {templateSelectItems}
                        </Select>
                      </FormControl>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {tab === 2 && !loading && (
              <>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem', fontFamily: T.font }}>
                  Map Employment Category subcategories (for example General Administration, Temporary, Contractual) to Appendix 33 blocks. These are not department codes — export uses the employee&apos;s employment category first when mapped.
                </Alert>
                {uniqueEmpTypes.length === 0 ? (
                  <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}>
                    No active employment categories found. Add them under Employment Category first.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {uniqueEmpTypes.map((row) => (
                      <Box key={`${row.parentGroup}-${row.typeName}`} sx={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 1, alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '0.78rem', fontFamily: T.font, color: T.text }}>
                          <strong>{row.typeName}</strong>
                          <Box component="span" sx={{ color: T.muted, display: 'block', fontSize: '0.68rem' }}>
                            {row.parentGroup}
                            {defaults.employmentTypes?.[row.typeName] ? ` · default ${defaults.employmentTypes[row.typeName]}` : ''}
                          </Box>
                        </Typography>
                        <FormControl size="small">
                          <Select
                            value={draft.employmentTypes?.[row.typeName] || ''}
                            onChange={(e) => setEmpType(row.typeName, e.target.value)}
                            displayEmpty
                            sx={{ fontSize: '0.78rem', fontFamily: T.font, borderRadius: 2 }}
                          >
                            {templateSelectItems}
                          </Select>
                        </FormControl>
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}

            {tab === 3 && !loading && (
              <>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem', fontFamily: T.font }}>
                  Upload as Inactive to keep the current payroll file, or tick “Set as Active” so the next export uses the new workbook immediately. Only the Active template is in use.
                </Alert>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <AccentButton variant="contained" component="label" startIcon={<CloudUpload />} sx={{ bgcolor: T.accent, '&:hover': { bgcolor: T.accentDark } }}>
                    Upload new .xlsm
                    <input hidden type="file" accept=".xlsm,.xlsx" onChange={handleUpload} />
                  </AccentButton>
                  <FormControlLabel
                    control={<Checkbox checked={activateOnUpload} onChange={(e) => setActivateOnUpload(e.target.checked)} sx={{ color: T.accent, '&.Mui-checked': { color: T.accent } }} />}
                    label={<Typography sx={{ fontSize: '0.75rem', fontFamily: T.font }}>Set as Active (in use) after upload</Typography>}
                  />
                  {fileName && (
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontFamily: T.font }}>{fileName}</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {templates.map((tpl) => {
                    const inUse = tpl.status === 'active';
                    return (
                      <Box
                        key={tpl.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: `1px solid ${inUse ? T.accent : T.divider}`,
                          bgcolor: inUse ? T.accentFaint : '#fff',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: T.font, color: T.text }}>
                              {tpl.name}
                            </Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: T.muted, fontFamily: T.font }}>
                              {tpl.originalName}
                              {tpl.uploadedAt ? ` · ${formatWhen(tpl.uploadedAt)}` : ''}
                              {tpl.uploadedBy ? ` · ${tpl.uploadedBy}` : ''}
                              {tpl.totalCapacity ? ` · ${tpl.totalCapacity} rows` : ''}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={inUse ? 'Active · in use' : 'Inactive'}
                            sx={{
                              height: 22,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              fontFamily: T.font,
                              bgcolor: inUse ? T.accent : '#eee',
                              color: inUse ? '#fff' : T.muted,
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
                          <AccentButton size="small" startIcon={<Download sx={{ fontSize: 14 }} />} onClick={() => handleDownload(tpl.id)} sx={{ color: T.accent, fontSize: '0.72rem' }}>
                            Download
                          </AccentButton>
                          {!inUse && (
                            <AccentButton size="small" onClick={() => handleActivate(tpl.id)} sx={{ color: T.accent, fontSize: '0.72rem' }}>
                              Set Active
                            </AccentButton>
                          )}
                          {inUse && (
                            <Typography sx={{ fontSize: '0.68rem', color: T.accent, fontWeight: 700, alignSelf: 'center', fontFamily: T.font }}>
                              Payroll export is using this file
                            </Typography>
                          )}
                          {!inUse && (
                            <AccentButton size="small" startIcon={<DeleteIcon sx={{ fontSize: 14 }} />} onClick={() => handleDelete(tpl.id)} sx={{ color: '#b71c1c', fontSize: '0.72rem' }}>
                              Delete
                            </AccentButton>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                  {templates.length === 0 && (
                    <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}>No templates uploaded yet.</Typography>
                  )}
                </Box>
              </>
            )}
          </Box>

          <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.divider}`, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Tooltip title="Restore the original column letters and department map">
              <span>
                <AccentButton startIcon={<RestartAlt />} onClick={handleReset} sx={{ color: T.muted }}>
                  Reset defaults
                </AccentButton>
              </span>
            </Tooltip>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <AccentButton onClick={onClose} sx={{ color: T.muted }}>Cancel</AccentButton>
              <AccentButton variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={{ bgcolor: T.accent, '&:hover': { bgcolor: T.accentDark } }}>
                Save positions
              </AccentButton>
            </Box>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default Appendix33LayoutDialog;
