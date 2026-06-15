import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSavedAccounts,
  getActiveAccountKey,
  saveAccount,
  removeAccount,
  setActiveAccount,
  getAccountById,
  clearAllAccounts,
  getInactiveAccounts,
  updateAccountTokens,
  getAccountCount,
  MAX_ACCOUNTS,
} from '../accountStore.js';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

function createLocalStorageMock() {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get _store() {
      return store;
    },
  };
}

beforeEach(() => {
  const mock = createLocalStorageMock();
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    writable: true,
    configurable: true,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal login-response-shaped user object. */
function makeUser(overrides = {}) {
  return {
    _id: 'user1',
    name: 'Nikos Mpantekas',
    email: 'nikos@example.com',
    role: 'teacher',
    schoolId: 'school1',
    schoolName: 'Demo School',
    token: 'tok_aaa',
    refreshToken: 'rtok_aaa',
    saveCredentials: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MAX_ACCOUNTS', () => {
  it('is 5', () => {
    expect(MAX_ACCOUNTS).toBe(5);
  });
});

describe('getSavedAccounts', () => {
  it('returns [] when nothing is stored', () => {
    expect(getSavedAccounts()).toEqual([]);
  });

  it('returns [] on corrupted JSON', () => {
    localStorage.setItem('gb_accounts', '{not valid json!!!');
    expect(getSavedAccounts()).toEqual([]);
  });

  it('returns [] when stored value is not an array', () => {
    localStorage.setItem('gb_accounts', JSON.stringify({ foo: 'bar' }));
    expect(getSavedAccounts()).toEqual([]);
  });

  it('sorts by lastActiveAt descending', () => {
    const accounts = [
      { id: 'a', schoolId: 's1', lastActiveAt: 100 },
      { id: 'b', schoolId: 's1', lastActiveAt: 300 },
      { id: 'c', schoolId: 's1', lastActiveAt: 200 },
    ];
    localStorage.setItem('gb_accounts', JSON.stringify(accounts));
    const result = getSavedAccounts();
    expect(result.map((a) => a.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('saveAccount', () => {
  it('adds a new account', () => {
    saveAccount(makeUser());
    const accounts = getSavedAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe('user1');
    expect(accounts[0].email).toBe('nikos@example.com');
  });

  it('normalizes _id to id', () => {
    saveAccount(makeUser({ _id: 'mongo_id_123' }));
    const account = getSavedAccounts()[0];
    expect(account.id).toBe('mongo_id_123');
    expect(account._id).toBeUndefined();
  });

  it('computes avatarInitials from name', () => {
    saveAccount(makeUser({ name: 'Nikos Mpantekas' }));
    expect(getSavedAccounts()[0].avatarInitials).toBe('NM');
  });

  it('computes single initial for single-word name', () => {
    saveAccount(makeUser({ name: 'Maria' }));
    expect(getSavedAccounts()[0].avatarInitials).toBe('M');
  });

  it('computes empty initials for empty name', () => {
    saveAccount(makeUser({ name: '' }));
    expect(getSavedAccounts()[0].avatarInitials).toBe('');
  });

  it('handles null schoolId (superadmin)', () => {
    saveAccount(makeUser({ schoolId: null }));
    const account = getSavedAccounts()[0];
    expect(account.schoolId).toBeNull();
  });

  it('sets lastActiveAt to a recent timestamp', () => {
    const before = Date.now();
    saveAccount(makeUser());
    const after = Date.now();
    const ts = getSavedAccounts()[0].lastActiveAt;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('upserts an existing account by compound key', () => {
    saveAccount(makeUser({ token: 'old_token' }));
    saveAccount(makeUser({ token: 'new_token' }));
    const accounts = getSavedAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].token).toBe('new_token');
  });

  it('treats same user in different schools as distinct accounts', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1' }));
    saveAccount(makeUser({ _id: 'u1', schoolId: 's2' }));
    expect(getSavedAccounts()).toHaveLength(2);
  });

  it('enforces MAX_ACCOUNTS by dropping the least recently active', () => {
    // Seed 5 accounts with staggered timestamps
    for (let i = 0; i < 5; i++) {
      vi.spyOn(Date, 'now').mockReturnValue(1000 + i);
      saveAccount(makeUser({ _id: `u${i}`, schoolId: `s${i}` }));
      vi.restoreAllMocks();
    }
    expect(getAccountCount()).toBe(5);

    // Add a 6th — the oldest (u0, lastActiveAt=1000) should be evicted
    vi.spyOn(Date, 'now').mockReturnValue(9999);
    saveAccount(makeUser({ _id: 'u_new', schoolId: 's_new' }));
    vi.restoreAllMocks();

    expect(getAccountCount()).toBe(5);
    expect(getAccountById('u0', 's0')).toBeNull();
    expect(getAccountById('u_new', 's_new')).not.toBeNull();
  });
});

describe('removeAccount', () => {
  it('removes an account by compound key', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1' }));
    saveAccount(makeUser({ _id: 'u2', schoolId: 's2' }));
    removeAccount('u1', 's1');
    expect(getAccountCount()).toBe(1);
    expect(getAccountById('u1', 's1')).toBeNull();
  });

  it('clears gb_active_account if the removed account was active', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1' }));
    setActiveAccount('u1', 's1');
    expect(getActiveAccountKey()).toBe('u1_s1');

    removeAccount('u1', 's1');
    expect(getActiveAccountKey()).toBeNull();
  });

  it('does not clear gb_active_account for a different removal', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1' }));
    saveAccount(makeUser({ _id: 'u2', schoolId: 's2' }));
    setActiveAccount('u1', 's1');
    removeAccount('u2', 's2');
    expect(getActiveAccountKey()).toBe('u1_s1');
  });
});

describe('setActiveAccount / getActiveAccountKey', () => {
  it('writes and reads the compound key', () => {
    setActiveAccount('abc', 'xyz');
    expect(getActiveAccountKey()).toBe('abc_xyz');
  });

  it('uses "none" for null schoolId', () => {
    setActiveAccount('abc', null);
    expect(getActiveAccountKey()).toBe('abc_none');
  });

  it('returns null when nothing is set', () => {
    expect(getActiveAccountKey()).toBeNull();
  });
});

describe('getAccountById', () => {
  it('returns the matching account', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1', name: 'Alice' }));
    const found = getAccountById('u1', 's1');
    expect(found).not.toBeNull();
    expect(found.name).toBe('Alice');
  });

  it('returns null when no match', () => {
    expect(getAccountById('nope', 'nope')).toBeNull();
  });
});

describe('clearAllAccounts', () => {
  it('removes both storage keys', () => {
    saveAccount(makeUser());
    setActiveAccount('user1', 'school1');
    clearAllAccounts();
    expect(getSavedAccounts()).toEqual([]);
    expect(getActiveAccountKey()).toBeNull();
  });
});

describe('getInactiveAccounts', () => {
  it('excludes the active account', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1' }));
    saveAccount(makeUser({ _id: 'u2', schoolId: 's2' }));
    setActiveAccount('u1', 's1');

    const inactive = getInactiveAccounts();
    expect(inactive).toHaveLength(1);
    expect(inactive[0].id).toBe('u2');
  });

  it('returns all accounts when none is active', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1' }));
    saveAccount(makeUser({ _id: 'u2', schoolId: 's2' }));
    expect(getInactiveAccounts()).toHaveLength(2);
  });
});

describe('updateAccountTokens', () => {
  it('updates only token, refreshToken, and lastActiveAt', () => {
    saveAccount(
      makeUser({
        _id: 'u1',
        schoolId: 's1',
        name: 'Original',
        token: 'old',
        refreshToken: 'old_r',
      }),
    );

    vi.spyOn(Date, 'now').mockReturnValue(55555);
    updateAccountTokens('u1', 's1', 'new_tok', 'new_rtok');
    vi.restoreAllMocks();

    const account = getAccountById('u1', 's1');
    expect(account.token).toBe('new_tok');
    expect(account.refreshToken).toBe('new_rtok');
    expect(account.lastActiveAt).toBe(55555);
    // Name should be untouched
    expect(account.name).toBe('Original');
  });

  it('is a no-op for non-existent accounts', () => {
    updateAccountTokens('nope', 'nope', 'tok', 'rtok');
    expect(getAccountCount()).toBe(0);
  });
});

describe('getAccountCount', () => {
  it('returns 0 when empty', () => {
    expect(getAccountCount()).toBe(0);
  });

  it('returns the correct count', () => {
    saveAccount(makeUser({ _id: 'u1', schoolId: 's1' }));
    saveAccount(makeUser({ _id: 'u2', schoolId: 's2' }));
    expect(getAccountCount()).toBe(2);
  });
});
