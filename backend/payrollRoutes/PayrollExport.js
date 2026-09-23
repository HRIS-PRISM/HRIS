const fs = require('fs');
const path = require('path');
const db = require('../db');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken, requireAdmin, requireTechnical } = require('../middleware/auth');
const { buildRun } = require('../services/payrollTemplate/buildRun');
const {
  fillAppendix33,
  Appendix33CapacityError,
  Appendix33MappingError,
  MONTH_NAMES,
} = require('../services/payrollTemplate/fillAppendix33');
const {
  describeLayout,
  saveOverrides,
  resetOverrides,
} = require('../services/payrollTemplate/positionOverrides');
const {
  listTemplates,
  getActiveTemplate,
  addTemplate,
  setActive,
  setInactive,
  removeTemplate,
  readTemplateBuffer,
} = require('../services/payrollTemplate/templateStore');
const { getResolved, resolveScopeTemplate } = require('../services/payrollTemplate/positionOverrides');
const M = require('../services/payrollTemplate/appendix33Map');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const XLSM_MIME = 'application/vnd.ms-excel.sheet.macroEnabled.12';

const PAYROLL_SELECT = `
  SELECT
    pp.*,
    NULLIF(bd.budgetCode, '') AS budgetDepartment,
    etc.typeName AS employmentTypeName,
    etc.id AS employmentTypeId
  FROM payroll_processed pp
  LEFT JOIN (
    SELECT ec1.employeeNumber, ec1.employmentCategory
    FROM employment_category ec1
    INNER JOIN (
      SELECT employeeNumber, MAX(id) AS max_id
      FROM employment_category
      GROUP BY employeeNumber
    ) latest ON latest.max_id = ec1.id
  ) ec ON CAST(ec.employeeNumber AS CHAR) = CAST(pp.employeeNumber AS CHAR)
  LEFT JOIN employment_type_config etc
    ON etc.id = ec.employmentCategory
  LEFT JOIN (
    SELECT da1.employeeNumber, da1.budgetCode
    FROM department_assignment da1
    INNER JOIN (
      SELECT employeeNumber, MAX(id) AS max_id
      FROM department_assignment
      GROUP BY employeeNumber
    ) da_latest ON da_latest.max_id = da1.id
  ) bd ON CAST(bd.employeeNumber AS CHAR) = CAST(pp.employeeNumber AS CHAR)
`;

function parseExportPeriod(source = {}) {
  const month = Number(source.month);
  const year = Number(source.year);
  const department = String(source.department || '').trim();
  const employmentType = String(source.employmentType || '').trim();
  const includeAll = (!department || department.toLowerCase() === 'all')
    && !employmentType;

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: 'A month between 1 and 12 is required' };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: 'A four digit year is required' };
  }
  if (department && employmentType) {
    return { error: 'Choose either a department or an employment category, not both' };
  }

  const maps = getResolved();
  const allowedDepartments = Object.keys(maps.departments || {});
  const allowedEmploymentTypes = Object.keys(maps.employmentTypes || {});

  if (includeAll && !allowedDepartments.length && !allowedEmploymentTypes.length) {
    return {
      error: 'No departments or employment categories are enabled for Appendix 33 download. '
        + 'Configure them under Appendix 33 layout first.',
    };
  }

  const periodPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const periodName = `${MONTH_NAMES[month - 1]} ${year}`;
  const params = [periodPrefix];
  let where = 'LEFT(pp.startDate, 7) = ?';

  if (department && department.toLowerCase() !== 'all') {
    // Route by budget department when set, otherwise the real department.
    where += " AND COALESCE(NULLIF(bd.budgetCode, ''), pp.department) = ?";
    params.push(department);
  } else if (employmentType) {
    where += ' AND etc.typeName = ?';
    params.push(employmentType);
  } else if (includeAll) {
    // Only employees under an enabled department or employment category.
    const parts = [];
    if (allowedDepartments.length) {
      parts.push(`COALESCE(NULLIF(bd.budgetCode, ''), pp.department) IN (${allowedDepartments.map(() => '?').join(',')})`);
      params.push(...allowedDepartments);
    }
    if (allowedEmploymentTypes.length) {
      parts.push(`etc.typeName IN (${allowedEmploymentTypes.map(() => '?').join(',')})`);
      params.push(...allowedEmploymentTypes);
    }
    where += ` AND (${parts.join(' OR ')})`;
  }

  return {
    month,
    year,
    department: department && department.toLowerCase() !== 'all' ? department : '',
    employmentType,
    includeAll,
    periodPrefix,
    periodName,
    params,
    where,
  };
}

function emptyFilterMessage(parsed) {
  if (parsed.employmentType) {
    return `No finalized payroll found for ${parsed.periodName} in employment category "${parsed.employmentType}"`;
  }
  if (parsed.department) {
    return `No finalized payroll found for ${parsed.periodName} in department ${parsed.department}`;
  }
  return `No finalized payroll found for ${parsed.periodName}`;
}

/**
 * Departments / employment categories must be mapped in Appendix 33 settings
 * before they can be downloaded. Unmapped scopes are refused.
 */
function assertExportScopeAllowed(parsed) {
  const maps = getResolved();
  if (parsed.department) {
    if (!maps.departments?.[parsed.department]) {
      return {
        error: `Department ${parsed.department} is not enabled for Appendix 33 download. `
          + 'Map it under Appendix 33 layout → Departments first.',
      };
    }
  }
  if (parsed.employmentType) {
    if (!maps.employmentTypes?.[parsed.employmentType]) {
      return {
        error: `Employment category "${parsed.employmentType}" is not enabled for Appendix 33 download. `
          + 'Map it under Appendix 33 layout → Employment categories first.',
      };
    }
  }
  return null;
}

/**
 * GET /PayrollExportRoute/export-appendix33/scopes
 * Departments and employment categories enabled for download (mapped in settings).
 */
router.get('/export-appendix33/scopes', authenticateToken, requireAdmin, (req, res) => {
  const maps = getResolved();
  const deptCodes = Object.keys(maps.departments || {}).sort();
  const empNames = Object.keys(maps.employmentTypes || {}).sort((a, b) => a.localeCompare(b));

  db.query('SELECT code, description FROM department_table ORDER BY code', (err, deptRows) => {
    if (err) {
      console.error('Appendix 33 scopes: department_table query failed', err);
      return res.status(500).json({ error: 'Could not read departments' });
    }

    const deptMeta = new Map((deptRows || []).map((d) => [d.code, d.description || d.code]));
    const departments = deptCodes.map((code) => {
      const scope = resolveScopeTemplate(maps.departments[code], code);
      return {
        code,
        description: deptMeta.get(code) || code,
        templateKey: scope?.key || '',
        generated: Boolean(scope?.blueprintKey),
      };
    });

    db.query(
      `SELECT id, parentGroup, typeName, isActive
       FROM employment_type_config
       ORDER BY sortOrder ASC, parentGroup ASC, typeName ASC`,
      (empErr, empRows) => {
        if (empErr) {
          console.error('Appendix 33 scopes: employment_type_config query failed', empErr);
          return res.status(500).json({ error: 'Could not read employment categories' });
        }

        const empMeta = new Map();
        (empRows || []).forEach((row) => {
          if (!empMeta.has(row.typeName)) {
            empMeta.set(row.typeName, row.parentGroup || '');
          }
        });

        const employmentTypes = empNames.map((typeName) => {
          const scope = resolveScopeTemplate(maps.employmentTypes[typeName], typeName);
          return {
            typeName,
            parentGroup: empMeta.get(typeName) || '',
            templateKey: scope?.key || '',
            generated: Boolean(scope?.blueprintKey),
          };
        });

        res.json({ departments, employmentTypes });
      },
    );
  });
});

/**
 * GET /PayrollExportRoute/export-appendix33/availability
 * Query: month, year, department?, employmentType?
 */
router.get('/export-appendix33/availability', authenticateToken, requireAdmin, (req, res) => {
  const parsed = parseExportPeriod(req.query);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error, available: false, count: 0 });
  }

  const scopeError = assertExportScopeAllowed(parsed);
  if (scopeError) {
    return res.status(403).json({ error: scopeError.error, available: false, count: 0 });
  }

  db.query(
    `SELECT COUNT(*) AS count FROM (${PAYROLL_SELECT} WHERE ${parsed.where}) AS scoped`,
    parsed.params,
    (err, rows) => {
      if (err) {
        console.error('Appendix 33 availability: query failed', err);
        return res.status(500).json({
          error: 'Could not check finalized payroll',
          available: false,
          count: 0,
        });
      }

      const count = Number(rows?.[0]?.count || 0);
      res.json({
        available: count > 0,
        count,
        month: parsed.month,
        year: parsed.year,
        department: parsed.department || null,
        employmentType: parsed.employmentType || null,
        periodName: parsed.periodName,
      });
    },
  );
});

/**
 * POST /PayrollExportRoute/export-appendix33
 * Body: { month, year, department?, employmentType?, payrollNoSeed?, quincena? }
 *
 * Optional `department` is a department_table.code.
 * Optional `employmentType` is employment_type_config.typeName (subcategory),
 * e.g. "General Administration" — used for Appendix blocks that are not colleges.
 */
router.post('/export-appendix33', authenticateToken, requireAdmin, (req, res) => {
  const parsed = parseExportPeriod(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const scopeError = assertExportScopeAllowed(parsed);
  if (scopeError) return res.status(403).json({ error: scopeError.error });

  const {
    month, year, department, employmentType, includeAll, periodName, params, where,
  } = parsed;
  const query = `${PAYROLL_SELECT} WHERE ${where}`;

  // Scopes with no tab set of their own are exported onto sheets copied from a
  // blueprint block, so allowing a department is enough — no tab mapping needed.
  let scope = null;
  if (!includeAll) {
    const maps = getResolved();
    scope = employmentType
      ? resolveScopeTemplate(maps.employmentTypes?.[employmentType], employmentType)
      : resolveScopeTemplate(maps.departments?.[department], department);

    if (!scope) {
      return res.status(422).json({
        error: employmentType
          ? `Employment category "${employmentType}" is not enabled for Appendix 33 download.`
          : `Department ${department} is not enabled for Appendix 33 download.`,
      });
    }
  }

  db.query(query, params, (err, rows) => {
    if (err) {
      console.error('Appendix 33 export: query failed', err);
      return res.status(500).json({ error: 'Could not read finalized payroll' });
    }

    if (!rows.length) {
      return res.status(404).json({ error: emptyFilterMessage(parsed) });
    }

    let built;
    try {
      built = buildRun(rows, {
        month,
        year,
        payrollNoSeed: req.body?.payrollNoSeed,
        quincena: req.body?.quincena,
        forceScope: scope,
      });
    } catch (buildErr) {
      console.error('Appendix 33 export: could not build run', buildErr);
      return res.status(500).json({ error: 'Could not prepare payroll data for export' });
    }

    if (built.unmapped.length) {
      return res.status(422).json({
        error: 'Some employees have no Appendix 33 sheet mapping (department or '
          + 'employment category), so the export was stopped rather than leaving '
          + 'those employees off the payroll.',
        unmapped: built.unmapped,
      });
    }

    const blueprints = { ...(built.blueprints || {}) };
    const onlyDepartmentKey = scope ? scope.key : null;
    if (scope?.blueprintKey) blueprints[scope.key] = scope.blueprintKey;

    db.query('SELECT code, description FROM department_table', (titleErr, deptRows) => {
      if (titleErr) {
        console.error('Appendix 33 export: department titles query failed', titleErr);
        return res.status(500).json({ error: 'Could not generate the payroll workbook' });
      }

      const departmentTitles = {};
      for (const row of deptRows || []) {
        const code = String(row.code || '').trim();
        if (!code) continue;
        departmentTitles[code] = String(row.description || code).trim().toUpperCase();
      }
      let onlyDepartmentTitle = '';
      if (scope) {
        if (department && departmentTitles[department]) {
          departmentTitles[scope.key] = departmentTitles[department];
        } else {
          const known = M.DEPARTMENTS.find((d) => d.key === scope.key);
          departmentTitles[scope.key] = known
            ? known.title
            : String(employmentType || department).toUpperCase();
        }
        onlyDepartmentTitle = departmentTitles[scope.key];
      }

      let buffer;
      try {
        buffer = fillAppendix33(built.run, {
          onlyDepartmentKey,
          onlyDepartmentTitle,
          departmentTitles,
          blueprints,
        });
      } catch (fillErr) {
        if (fillErr instanceof Appendix33CapacityError) {
          return res.status(422).json({ error: fillErr.message, overflows: fillErr.overflows });
        }
        if (fillErr instanceof Appendix33MappingError) {
          return res.status(422).json({ error: fillErr.message, unmapped: fillErr.unmapped });
        }
        console.error('Appendix 33 export: fill failed', fillErr);
        return res.status(500).json({ error: 'Could not generate the payroll workbook' });
      }

      const scopeSuffix = employmentType
        ? `_${String(employmentType).replace(/[^\w.-]+/g, '_')}`
        : (department ? `_${department}` : '');
      const filename = `EARIST_Payroll_${MONTH_NAMES[month - 1]}_${year}${scopeSuffix}.xlsm`;
      const active = getActiveTemplate();
      res.setHeader('Content-Type', XLSM_MIME);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-Appendix33-Employees', String(rows.length));
      if (active) {
        res.setHeader('X-Appendix33-Template', encodeURIComponent(active.name));
        res.setHeader('X-Appendix33-Template-Id', active.id);
      }
      res.send(buffer);
    });
  });
});

/**
 * GET /PayrollExportRoute/appendix33-layout
 * Current field-to-column map, first rows, department / employment-category routing,
 * and template library. Technical only.
 */
router.get('/appendix33-layout', authenticateToken, requireTechnical, (req, res) => {
  let layoutDoc = {};
  try {
    layoutDoc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'services', 'payrollTemplate', 'layout.json'), 'utf8'));
  } catch {
    layoutDoc = {};
  }

  db.query('SELECT code, description FROM department_table ORDER BY code', (err, rows) => {
    if (err) {
      console.error('Appendix 33 layout: department_table query failed', err);
      return res.status(500).json({ error: 'Could not read departments' });
    }

    db.query(
      `SELECT id, parentGroup, typeName, colorHex, isActive, sortOrder
       FROM employment_type_config
       WHERE isActive = 1
       ORDER BY sortOrder ASC, parentGroup ASC, typeName ASC`,
      (empErr, empRows) => {
        if (empErr) {
          console.error('Appendix 33 layout: employment_type_config query failed', empErr);
          return res.status(500).json({ error: 'Could not read employment categories' });
        }

        const described = describeLayout();
        const library = listTemplates();
        res.json({
          ...described,
          dbDepartments: rows,
          employmentTypeConfigs: empRows || [],
          capacity: layoutDoc.departments || {},
          totalCapacity: layoutDoc.totalCapacity || 0,
          templateShape: layoutDoc.shape || 'multi',
          templates: library.templates,
          activeTemplate: library.active,
        });
      },
    );
  });
});

/**
 * PUT /PayrollExportRoute/appendix33-layout
 * Body: { wtax, pay, deds, firstRows, departments, employmentTypes }
 */
router.put('/appendix33-layout', authenticateToken, requireTechnical, (req, res) => {
  try {
    const current = saveOverrides(req.body || {});
    res.json({ message: 'Appendix 33 positions saved', current, activeTemplate: listTemplates().active });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Could not save positions' });
  }
});

router.post('/appendix33-layout/reset', authenticateToken, requireTechnical, (req, res) => {
  const current = resetOverrides();
  res.json({ message: 'Appendix 33 positions restored to defaults', current, activeTemplate: listTemplates().active });
});

router.get('/appendix33-templates', authenticateToken, requireTechnical, (req, res) => {
  res.json(listTemplates());
});

/**
 * GET /PayrollExportRoute/appendix33-template
 * Downloads the template that is currently in use.
 */
router.get('/appendix33-template', authenticateToken, requireTechnical, (req, res) => {
  const active = getActiveTemplate();
  if (!active) return res.status(404).json({ error: 'No template is in use' });
  try {
    const { buffer, downloadName } = readTemplateBuffer(active.id);
    res.setHeader('Content-Type', XLSM_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.send(buffer);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/appendix33-templates/:id/download', authenticateToken, requireTechnical, (req, res) => {
  try {
    const { buffer, downloadName } = readTemplateBuffer(req.params.id);
    res.setHeader('Content-Type', XLSM_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.send(buffer);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * POST /PayrollExportRoute/appendix33-template
 * multipart: file, optional name, optional activate=true
 */
router.post('/appendix33-template', authenticateToken, requireTechnical, upload.single('file'), (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: 'Attach an .xlsm file as "file"' });
  }
  const activate = String(req.body?.activate || '').toLowerCase() === 'true';
  try {
    const library = addTemplate({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      name: req.body?.name,
      uploadedBy: req.user?.employeeNumber || req.user?.username || '',
      activate,
    });
    return res.json({
      message: activate
        ? `Uploaded and set as the template in use: ${library.active?.name}`
        : 'Uploaded as Inactive. Activate it to use it on the next export.',
      ...library,
    });
  } catch (err) {
    console.error('Appendix 33 template upload failed', err);
    return res.status(err.statusCode || 400).json({
      error: err.message || 'The new template failed the structure check and was not kept',
      problems: err.problems || [],
    });
  }
});

router.post('/appendix33-templates/:id/activate', authenticateToken, requireTechnical, (req, res) => {
  try {
    const library = setActive(req.params.id);
    res.json({
      message: `Now in use: ${library.active?.name}`,
      ...library,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message, problems: err.problems || [] });
  }
});

router.post('/appendix33-templates/:id/deactivate', authenticateToken, requireTechnical, (req, res) => {
  try {
    const library = setInactive(req.params.id);
    res.json({ message: 'Template set to Inactive', ...library });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/appendix33-templates/:id', authenticateToken, requireTechnical, (req, res) => {
  try {
    const library = removeTemplate(req.params.id);
    res.json({ message: 'Template deleted', ...library });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
