/**
 * pdsVersionUtils.js
 *
 * Central place for all PDS version detection logic.
 * When a new CSC form version comes out (e.g. Revised 2030):
 *   1. Add a new key below in SUPPORTED_VERSIONS
 *   2. Create PDS1_2030.jsx ... PDS4_2030.jsx in the versions/ folder
 *   3. Register them in the router files (PDS1.jsx ... PDS4.jsx)
 *   That's it — nothing else needs to change.
 */

export const SUPPORTED_VERSIONS = {
  V2025: '2025',
  V2017: '2017',
};

export const DEFAULT_VERSION = SUPPORTED_VERSIONS.V2017;

/**
 * Detects the version key from the active template's version label string.
 * e.g. "Revised 2025" → "2025"
 *      "Revised 2017" → "2017"
 *      null / unknown → DEFAULT_VERSION
 */
export const getVersionKey = (versionLabel) => {
  if (!versionLabel) return DEFAULT_VERSION;

  const label = versionLabel.toLowerCase();

  if (label.includes('2025')) return SUPPORTED_VERSIONS.V2025;
  if (label.includes('2017')) return SUPPORTED_VERSIONS.V2017;

  // Future-proof: add more as needed
  // if (label.includes('2030')) return SUPPORTED_VERSIONS.V2030;

  return DEFAULT_VERSION;
};