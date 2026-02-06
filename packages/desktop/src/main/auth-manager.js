const { safeStorage, session } = require('electron');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = 'auth-state.enc';

/**
 * Save encrypted auth state (cookies) for a project.
 * @param {string} projectFolder - Absolute path to the project folder
 * @param {string} sourceUrl - The URL the cookies were captured from
 * @returns {Promise<{success: boolean, cookieCount?: number, error?: string}>}
 */
async function saveAuthState(projectFolder, sourceUrl) {
  if (!safeStorage.isEncryptionAvailable()) {
    return { success: false, error: 'Encryption not available on this system' };
  }

  try {
    const cookies = await session.defaultSession.cookies.get({});
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      sourceUrl,
      cookies: cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.expirationDate,
      })),
    };

    const encrypted = safeStorage.encryptString(JSON.stringify(payload));
    const fileData = JSON.stringify({
      encrypted: true,
      data: encrypted.toString('base64'),
    });

    fs.mkdirSync(projectFolder, { recursive: true });
    fs.writeFileSync(path.join(projectFolder, AUTH_FILE), fileData, 'utf8');

    return { success: true, cookieCount: cookies.length };
  } catch (err) {
    console.error('Failed to save auth state:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Load and restore encrypted auth state (cookies) for a project.
 * Clears existing session cookies before setting saved ones.
 * @param {string} projectFolder - Absolute path to the project folder
 * @returns {Promise<{success: boolean, cookieCount?: number, error?: string}>}
 */
async function loadAuthState(projectFolder) {
  if (!safeStorage.isEncryptionAvailable()) {
    return { success: false, error: 'Encryption not available on this system' };
  }

  const filePath = path.join(projectFolder, AUTH_FILE);
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'No saved auth state' };
  }

  try {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const decrypted = safeStorage.decryptString(Buffer.from(fileData.data, 'base64'));
    const payload = JSON.parse(decrypted);

    // Clear existing cookies
    const existing = await session.defaultSession.cookies.get({});
    for (const cookie of existing) {
      const url = `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
      await session.defaultSession.cookies.remove(url, cookie.name).catch(() => {});
    }

    // Set saved cookies
    let setCount = 0;
    for (const cookie of payload.cookies) {
      try {
        const url = `http${cookie.secure ? 's' : ''}://${(cookie.domain || '').replace(/^\./, '')}${cookie.path || '/'}`;
        await session.defaultSession.cookies.set({
          url,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate,
        });
        setCount++;
      } catch {
        // Skip cookies that fail to set (expired, invalid domain, etc.)
      }
    }

    return { success: true, cookieCount: setCount };
  } catch (err) {
    console.error('Failed to load auth state:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete encrypted auth state for a project.
 * @param {string} projectFolder - Absolute path to the project folder
 * @returns {{success: boolean, error?: string}}
 */
function deleteAuthState(projectFolder) {
  const filePath = path.join(projectFolder, AUTH_FILE);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to delete auth state:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get metadata about saved auth state (without returning cookies).
 * @param {string} projectFolder - Absolute path to the project folder
 * @returns {{exists: boolean, savedAt?: string, cookieCount?: number, sourceUrl?: string}}
 */
function getAuthStateInfo(projectFolder) {
  if (!safeStorage.isEncryptionAvailable()) {
    return { exists: false };
  }

  const filePath = path.join(projectFolder, AUTH_FILE);
  if (!fs.existsSync(filePath)) {
    return { exists: false };
  }

  try {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const decrypted = safeStorage.decryptString(Buffer.from(fileData.data, 'base64'));
    const payload = JSON.parse(decrypted);

    return {
      exists: true,
      savedAt: payload.savedAt,
      cookieCount: payload.cookies.length,
      sourceUrl: payload.sourceUrl,
    };
  } catch (err) {
    console.error('Failed to read auth state info:', err);
    return { exists: false };
  }
}

module.exports = { saveAuthState, loadAuthState, deleteAuthState, getAuthStateInfo };
