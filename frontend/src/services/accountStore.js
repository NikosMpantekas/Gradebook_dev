/**
 * Multi-account storage manager backed by localStorage.
 *
 * Stores up to MAX_ACCOUNTS saved user accounts under `gb_accounts`
 * and tracks the currently active account under `gb_active_account`.
 *
 * Accounts are uniquely identified by a compound key: `${id}_${schoolId}`.
 * The same user can exist in multiple schools.
 */

const STORAGE_KEY = 'gb_accounts';
const ACTIVE_KEY = 'gb_active_account';

/** @type {number} */
export const MAX_ACCOUNTS = 5;

// ---------------------------------------------------------------------------
// Helpers (not exported)
// ---------------------------------------------------------------------------

/**
 * Compute display initials from a full name.
 * Takes the first letter of the first two words, uppercased.
 * @param {string} name
 * @returns {string}
 */
function computeInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/**
 * Build the compound key used to uniquely identify an account.
 * @param {string} id
 * @param {string|null} schoolId
 * @returns {string}
 */
function makeKey(id, schoolId) {
  return `${id}_${schoolId ?? 'none'}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return all saved accounts sorted by `lastActiveAt` descending (most recent first).
 * Returns `[]` if localStorage data is missing or corrupt.
 * @returns {Array<Object>}
 */
export function getSavedAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const accounts = JSON.parse(raw);
    if (!Array.isArray(accounts)) return [];
    return accounts.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  } catch {
    return [];
  }
}

/**
 * Return the active account compound key string, or null.
 * @returns {string|null}
 */
export function getActiveAccountKey() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

/**
 * Upsert an account from login response data.
 *
 * - Normalizes `_id` → `id`
 * - Computes `avatarInitials` from `name`
 * - Sets `lastActiveAt` to now
 * - Enforces MAX_ACCOUNTS by dropping the least recently active entry
 *
 * @param {Object} userData - Raw user data from login response
 */
export function saveAccount(userData) {
  const id = userData._id || userData.id;
  const schoolId = userData.schoolId ?? null;
  const key = makeKey(id, schoolId);

  const account = {
    ...userData,
    id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    schoolId,
    schoolName: userData.schoolName || '',
    token: userData.token,
    refreshToken: userData.refreshToken,
    saveCredentials: Boolean(userData.saveCredentials),
    lastActiveAt: Date.now(),
    avatarInitials: computeInitials(userData.name),
  };
  delete account._id;

  const accounts = getSavedAccounts();
  const idx = accounts.findIndex((a) => makeKey(a.id, a.schoolId) === key);

  if (idx !== -1) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }

  // Enforce max: drop the least recently active (last after sorting desc)
  if (accounts.length > MAX_ACCOUNTS) {
    accounts.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    accounts.length = MAX_ACCOUNTS;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/**
 * Remove an account by compound key.
 * If it was the active account, clear `gb_active_account`.
 * @param {string} id
 * @param {string|null} schoolId
 */
export function removeAccount(id, schoolId) {
  const key = makeKey(id, schoolId);
  const accounts = getSavedAccounts().filter(
    (a) => makeKey(a.id, a.schoolId) !== key,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

  if (getActiveAccountKey() === key) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

/**
 * Set the active account compound key.
 * @param {string} id
 * @param {string|null} schoolId
 */
export function setActiveAccount(id, schoolId) {
  localStorage.setItem(ACTIVE_KEY, makeKey(id, schoolId));
}

/**
 * Find an account by compound key.
 * @param {string} id
 * @param {string|null} schoolId
 * @returns {Object|null}
 */
export function getAccountById(id, schoolId) {
  const key = makeKey(id, schoolId);
  return (
    getSavedAccounts().find((a) => makeKey(a.id, a.schoolId) === key) || null
  );
}

/**
 * Remove both `gb_accounts` and `gb_active_account` from localStorage.
 */
export function clearAllAccounts() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}

/**
 * Return all accounts except the currently active one.
 * @returns {Array<Object>}
 */
export function getInactiveAccounts() {
  const activeKey = getActiveAccountKey();
  if (!activeKey) return getSavedAccounts();
  return getSavedAccounts().filter(
    (a) => makeKey(a.id, a.schoolId) !== activeKey,
  );
}

/**
 * Update only the token fields (and `lastActiveAt`) for an existing account.
 * No-op if the account doesn't exist.
 * @param {string} id
 * @param {string|null} schoolId
 * @param {string} token
 * @param {string} refreshToken
 */
export function updateAccountTokens(id, schoolId, token, refreshToken) {
  const key = makeKey(id, schoolId);
  const accounts = getSavedAccounts();
  const account = accounts.find((a) => makeKey(a.id, a.schoolId) === key);
  if (!account) return;

  account.token = token;
  account.refreshToken = refreshToken;
  account.lastActiveAt = Date.now();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/**
 * Return the number of saved accounts.
 * @returns {number}
 */
export function getAccountCount() {
  return getSavedAccounts().length;
}
