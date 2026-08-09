import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import schoolService from './schoolService';

const initialState = {
  schools: [],
  school: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

/**
 * School branch filtering - CUSTOM for Parothisi Database Structure
 * @param {Object} school - School object to check
 * @returns {boolean} - True if this is a cluster school that should be filtered out
 */
const isClusterSchool = (school) => {
  try {
    if (!school) return true;
    
    // CUSTOM filtering for Parothisi Database Structure
    
    // 1. Main School "Παρώθηση" - Filter out by exact ID
    if (school._id === '6830531d4930876187757ec4') return true;
    
    // 2. Main School "Nikos" - Filter out by exact ID
    if (school._id === '6834c513b7b423cc93e4afee') return true;
    
    // 3. Branch "Φροντιστήριο Βαθύ" - Keep this one
    if (school._id === '6834cef6ae7eb00ba4d0820d') return false;
    
    // 4. Schools that are direct branches should be kept
    if (school.parentCluster) return false;
    
    // 5. Special case - filter by name if it's one of our main clusters
    const mainClusterNames = ['Παρώθηση', 'Nikos'];
    if (mainClusterNames.includes(school.name)) return true;
    
    // Default: Compare domain with name to detect if it's a main cluster
    if (school.schoolDomain && school.name) {
      const normalizedSchoolName = school.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedDomain = school.schoolDomain.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (normalizedSchoolName === normalizedDomain || 
          (normalizedDomain === 'parwthisi' && school.name === 'Παρώθηση')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in school filtering, keeping to be safe:', error);
    return false; 
  }
};

/**
 * CRITICAL FIX: Safe filtering function with comprehensive error handling
 * @param {Array} schools - Array of schools to filter
 * @returns {Array} - Filtered schools with all cluster schools removed
 */
const filterOutClusterSchools = (schools) => {
  try {
    // Validate input is an array
    if (!Array.isArray(schools)) {
      console.error('School data is not an array:', schools);
      return [];
    }
    
    // Apply robust filtering
    return schools.filter(school => !isClusterSchool(school));
  } catch (error) {
    // Safety: If any error occurs during filtering, return empty array
    console.error('Critical error in school filtering, returning empty array:', error);
    return [];
  }
};

// Create new school (admin only)
export const createSchool = createAsyncThunk(
  'schools/create',
  async (schoolData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await schoolService.createSchool(schoolData, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all schools
export const getSchools = createAsyncThunk(
  'schools/getAll',
  async (_, thunkAPI) => {
    try {
      const user = thunkAPI.getState().auth.user;
      
      // Handle missing user data more gracefully
      if (!user || !user.token) {
        console.error('No user data or token available in getSchools thunk');
        return []; // Return empty array instead of failing
      }
      
      return await schoolService.getSchools(user.token);
    } catch (error) {
      console.error('Error fetching schools:', error);
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get school by ID
export const getSchool = createAsyncThunk(
  'schools/get',
  async (id, thunkAPI) => {
    try {
      // Check for user and token
      const user = thunkAPI.getState().auth.user;
      if (!user || !user.token) {
        console.error('No user or token available in getSchool thunk');
        return thunkAPI.rejectWithValue('Authentication error: Please log in again');
      }
      
      return await schoolService.getSchool(id, user.token);
    } catch (error) {
      console.error('Error in getSchool thunk:', error);
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update school (admin only)
export const updateSchool = createAsyncThunk(
  'schools/update',
  async (payload, thunkAPI) => {
    try {
      // Handle both object format { id, schoolData } and direct id format
      let id, schoolData;
      
      // Determine if this is an object with id/schoolData or just raw params
      if (typeof payload === 'object' && payload !== null) {
        if (payload.id) {
          id = payload.id;
          schoolData = payload.schoolData;
        } else if (payload._id) {
          // Handle if _id is used instead of id
          id = payload._id;
          // Remove _id from the data
          const { _id, ...rest } = payload;
          schoolData = rest;
        } else {
          // Maybe the entire payload is the schoolData and id is separate
          schoolData = payload;
          id = schoolData.id || schoolData._id;
          
          // Remove id fields from schoolData if they exist
          delete schoolData.id;
          delete schoolData._id;
        }
      } else {
        // If it's not an object, it might be just the ID (legacy format)
        id = payload;
      }

      const result = await schoolService.updateSchool(id, schoolData || {}, user.token);
      return result;
    } catch (error) {
      console.error('UPDATE SCHOOL - Error:', error);
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete school (admin only)
export const deleteSchool = createAsyncThunk(
  'schools/delete',
  async (id, thunkAPI) => {
    try {
      // Check for user and token
      const user = thunkAPI.getState().auth.user;
      if (!user || !user.token) {
        console.error('No user or token available in deleteSchool thunk');
        return thunkAPI.rejectWithValue('Authentication error: Please log in again');
      }
      
      return await schoolService.deleteSchool(id, user.token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const schoolSlice = createSlice({
  name: 'school',
  initialState,
  reducers: {
    reset: (state) => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSchool.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createSchool.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.schools.push(action.payload);
      })
      .addCase(createSchool.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getSchools.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSchools.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        
        // CRITICAL FIX: Apply cluster school filtering at the Redux level
        // This ensures cluster/primary schools never appear in the UI
        if (Array.isArray(action.payload)) {
          state.schools = filterOutClusterSchools(action.payload);
        } else {
          console.warn('Schools data is not an array:', action.payload);
          state.schools = [];
        }
      })
      .addCase(getSchools.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getSchool.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSchool.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.school = action.payload;
      })
      .addCase(getSchool.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(updateSchool.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateSchool.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.schools = state.schools.map((school) =>
          school._id === action.payload._id ? action.payload : school
        );
      })
      .addCase(updateSchool.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(deleteSchool.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteSchool.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.schools = state.schools.filter(
          (school) => school._id !== action.payload.id
        );
      })
      .addCase(deleteSchool.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = schoolSlice.actions;
export default schoolSlice.reducer;
