/**
 * Appendix 33 template library.
 *
 * Multiple workbooks can sit on disk. Exactly one is Active — that is the file
 * fillAppendix33 reads. The rest stay Inactive until a technical user switches.
 */

const fs = require('fs');
const path = require('path');
const { XlsmPackage } = require('./xlsmPatcher');
const { inspectAndWriteLayout } = require('../../scripts/inspectAppendix33');

const LEGACY_PATH = path.join(__dirname, '..', '..', 'templates', 'EARIST_Appendix33.xlsm');
const STORE_DIR = path.join(__dirname, '..', '..', 'templates', 'appendix33-versions');
const REGISTRY_PATH = path.join(STORE_DIR, 'registry.json');

function filePathFor(id) {
  return path.join(STORE_DIR, `${id}.xlsm`);
}

function readRegistry() {
  ensureStore();
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function writeRegistry(doc) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(doc, null, 2) + '\n');
}

function publicTemplate(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    name: entry.name,
    originalName: entry.originalName,
    status: entry.status,
    inUse: entry.status === 'active',
    uploadedAt: entry.uploadedAt,
    uploadedBy: entry.uploadedBy || '',
    size: entry.size || 0,
    totalCapacity: entry.totalCapacity || 0,
  };
}

function seedFromLegacy(templates) {
  if (!fs.existsSync(LEGACY_PATH)) return templates;
  const id = 'bundled-master';
  const dest = filePathFor(id);
  if (!fs.existsSync(dest)) fs.copyFileSync(LEGACY_PATH, dest);
  if (templates.some((t) => t.id === id)) return templates;
  const stat = fs.statSync(dest);
  templates.unshift({
    id,
    name: 'EARIST Appendix 33 (bundled master)',
    originalName: 'EARIST_Appendix33.xlsm',
    status: templates.some((t) => t.status === 'active') ? 'inactive' : 'active',
    uploadedAt: stat.mtime.toISOString(),
    uploadedBy: 'system',
    size: stat.size,
    totalCapacity: 0,
  });
  return templates;
}

function ensureStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(REGISTRY_PATH)) {
    const templates = seedFromLegacy([]);
    const active = templates.find((t) => t.status === 'active');
    writeRegistry({ activeId: active ? active.id : null, templates });
    return;
  }
  const doc = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  let dirty = false;
  const before = (doc.templates || []).length;
  doc.templates = seedFromLegacy(doc.templates || []);
  if (doc.templates.length !== before) dirty = true;
  if (!doc.activeId) {
    const active = doc.templates.find((t) => t.status === 'active') || doc.templates[0];
    if (active) {
      doc.activeId = active.id;
      doc.templates = doc.templates.map((t) => ({
        ...t,
        status: t.id === active.id ? 'active' : 'inactive',
      }));
      dirty = true;
    }
  }
  if (dirty) writeRegistry(doc);
}

function listTemplates() {
  const doc = readRegistry();
  return {
    activeId: doc.activeId,
    active: publicTemplate(doc.templates.find((t) => t.id === doc.activeId)),
    templates: doc.templates
      .slice()
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return String(b.uploadedAt).localeCompare(String(a.uploadedAt));
      })
      .map(publicTemplate),
  };
}

function getActiveTemplate() {
  const doc = readRegistry();
  return doc.templates.find((t) => t.id === doc.activeId) || null;
}

function getActiveTemplatePath() {
  const active = getActiveTemplate();
  if (active && fs.existsSync(filePathFor(active.id))) return filePathFor(active.id);
  if (fs.existsSync(LEGACY_PATH)) return LEGACY_PATH;
  throw new Error('No Appendix 33 template is installed');
}

function assertAppendix33(buffer) {
  const pkg = XlsmPackage.load(buffer);
  if (!pkg.sheetPaths.get('SUMMARY') || !pkg.sheetPaths.get('WTAX-GEN.AD')) {
    const err = new Error('That workbook is missing SUMMARY or WTAX-GEN.AD, so it is not an Appendix 33 template');
    err.statusCode = 400;
    throw err;
  }
}

function addTemplate({ buffer, originalName, name, uploadedBy, activate }) {
  assertAppendix33(buffer);
  const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(filePathFor(id), buffer);

  let totalCapacity = 0;
  try {
    const layout = inspectAndWriteLayout(filePathFor(id));
    totalCapacity = layout.totalCapacity || 0;
  } catch (err) {
    fs.unlinkSync(filePathFor(id));
    throw err;
  }

  const doc = readRegistry();
  const entry = {
    id,
    name: (name && String(name).trim()) || originalName || id,
    originalName: originalName || `${id}.xlsm`,
    status: 'inactive',
    uploadedAt: new Date().toISOString(),
    uploadedBy: uploadedBy || '',
    size: buffer.length,
    totalCapacity,
  };
  doc.templates.push(entry);
  writeRegistry(doc);

  if (activate) return setActive(id);

  // inspectAndWriteLayout rewrote layout.json to the new file. If we are not
  // activating it, restore layout from the template that is actually in use.
  const active = getActiveTemplate();
  if (active) inspectAndWriteLayout(filePathFor(active.id));

  return listTemplates();
}

function setActive(id) {
  const doc = readRegistry();
  const target = doc.templates.find((t) => t.id === id);
  if (!target) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }
  if (!fs.existsSync(filePathFor(id))) {
    const err = new Error('The template file is missing from disk');
    err.statusCode = 404;
    throw err;
  }

  inspectAndWriteLayout(filePathFor(id));

  doc.templates = doc.templates.map((t) => ({
    ...t,
    status: t.id === id ? 'active' : 'inactive',
  }));
  doc.activeId = id;
  writeRegistry(doc);
  return listTemplates();
}

function setInactive(id) {
  const doc = readRegistry();
  const target = doc.templates.find((t) => t.id === id);
  if (!target) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }
  if (doc.activeId === id) {
    const err = new Error('This template is in use. Activate another template first.');
    err.statusCode = 400;
    throw err;
  }
  target.status = 'inactive';
  writeRegistry(doc);
  return listTemplates();
}

function removeTemplate(id) {
  const doc = readRegistry();
  if (doc.activeId === id) {
    const err = new Error('Cannot delete the template that is in use. Activate another one first.');
    err.statusCode = 400;
    throw err;
  }
  const target = doc.templates.find((t) => t.id === id);
  if (!target) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }
  doc.templates = doc.templates.filter((t) => t.id !== id);
  writeRegistry(doc);
  const disk = filePathFor(id);
  if (fs.existsSync(disk)) fs.unlinkSync(disk);
  return listTemplates();
}

function readTemplateBuffer(id) {
  const disk = filePathFor(id);
  if (!fs.existsSync(disk)) {
    const err = new Error('Template file not found');
    err.statusCode = 404;
    throw err;
  }
  const doc = readRegistry();
  const entry = doc.templates.find((t) => t.id === id);
  return {
    buffer: fs.readFileSync(disk),
    downloadName: entry?.originalName || `${id}.xlsm`,
  };
}

module.exports = {
  LEGACY_PATH,
  STORE_DIR,
  listTemplates,
  getActiveTemplate,
  getActiveTemplatePath,
  addTemplate,
  setActive,
  setInactive,
  removeTemplate,
  readTemplateBuffer,
  publicTemplate,
};
