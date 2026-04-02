import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import scheduleService from './scheduleService';

/** Cache TTL in milliseconds — 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Serialise queryParams into a stable cache-key string.
 * e.g. { schoolBranch: 'abc', teacherId: 'xyz' } → "schoolBranch=abc&teacherId=xyz"
 * No filters → ""
 */
export const serializeCacheKey = (queryParams = {}) =>
  Object.keys(queryParams)
    .sort()
    .filter(k => queryParams[k] !== undefined && queryParams[k] !== null && queryParams[k] !== '')
    .map(k => `${k}=${queryParams[k]}`)
    .join('&');

const initialState = {
  /**
   * Multi-key cache: { [cacheKey]: { data, lastFetched } }
   * cacheKey = serializeCacheKey(queryParams)
   * This lets different filter combos each have their own cached entry.
   */
  cache: {},
  /** The user ID that owns all cached entries — invalidates entire cache on user switch */
  cachedForUserId: null,
  /**
   * Per-key loading/error state so that changing filters or background-
   * revalidating one key doesn't affect the visible data for another key.
   * loadingKeys: { [cacheKey]: boolean }
   * errorKeys:   { [cacheKey]: string | null }
   */
  loadingKeys: {},
  errorKeys: {},
};

/**
 * Fetch the schedule for the current user.
 *
 * @param {{ force?: boolean, queryParams?: object }} options
 *   force       — bypass the TTL check and always re-fetch
 *   queryParams — filter params { schoolBranch?, teacherId? }
 */
export const fetchSchedule = createAsyncThunk(
  'schedule/fetch',
  async ({ force = false, queryParams = {} } = {}, thunkAPI) => {
    const state = thunkAPI.getState();
    const user  = state.auth.user;

    if (!user || !user.token) {
      return thunkAPI.rejectWithValue('Authentication error: Please log in again');
    }

    const cacheKey = serializeCacheKey(queryParams);

    // ─── Cache hit check ───────────────────────────────────────────────────
    if (!force) {
      const { cache, cachedForUserId } = state.schedule;
      const entry     = cache[cacheKey];
      const isOwner   = cachedForUserId === user._id;
      const isFresh   = entry?.lastFetched && (Date.now() - entry.lastFetched) < CACHE_TTL_MS;
      const hasData   = entry?.data != null;

      if (isOwner && isFresh && hasData) {
        // Serve from cache — no network request
        return { data: entry.data, fromCache: true, cacheKey, userId: user._id };
      }
    }

    // ─── Network fetch ─────────────────────────────────────────────────────
    try {
      const data = await scheduleService.getSchedule(user.token, queryParams);
      return { data, fromCache: false, cacheKey, userId: user._id };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue({ message, cacheKey });
    }
  }
);

export const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    /** Wipe the entire cache (e.g. on logout) */
    resetScheduleCache: () => initialState,

    /** Force a specific filter-combo to re-fetch next time */
    invalidateScheduleCache: (state, action) => {
      const cacheKey = action.payload ?? '';
      if (state.cache[cacheKey]) {
        state.cache[cacheKey].lastFetched = null;
      }
    },

    /** Force ALL cached entries to be re-fetched next time */
    invalidateAllScheduleCache: (state) => {
      Object.keys(state.cache).forEach(key => {
        state.cache[key].lastFetched = null;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedule.pending, (state, action) => {
        const cacheKey = serializeCacheKey(action.meta.arg?.queryParams);
        const hasCachedData = state.cache[cacheKey]?.data != null;

        // Only show loading indicator when we have NOTHING to show yet
        state.loadingKeys[cacheKey] = !hasCachedData;
        state.errorKeys[cacheKey]   = null;
      })
      .addCase(fetchSchedule.fulfilled, (state, action) => {
        const { data, fromCache, cacheKey, userId } = action.payload;

        state.loadingKeys[cacheKey] = false;
        state.errorKeys[cacheKey]   = null;
        state.cachedForUserId       = userId;

        if (!fromCache) {
          // Write fresh data into this cache slot
          state.cache[cacheKey] = { data, lastFetched: Date.now() };
        }
      })
      .addCase(fetchSchedule.rejected, (state, action) => {
        // action.payload is { message, cacheKey } from our rejectWithValue
        const cacheKey = action.payload?.cacheKey
          ?? serializeCacheKey(action.meta.arg?.queryParams);

        state.loadingKeys[cacheKey] = false;
        state.errorKeys[cacheKey]   = action.payload?.message || 'Failed to load schedule';
      });
  },
});

export const {
  resetScheduleCache,
  invalidateScheduleCache,
  invalidateAllScheduleCache,
} = scheduleSlice.actions;

export default scheduleSlice.reducer;
