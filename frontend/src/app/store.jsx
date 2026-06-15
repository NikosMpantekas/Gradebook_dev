import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import userReducer from '../features/users/userSlice';
import studentReducer from '../features/students/studentSlice';
import gradeReducer from '../features/grades/gradeSlice';
import notificationReducer from '../features/notifications/notificationSlice';
import schoolReducer from '../features/schools/schoolSlice';
import directionReducer from '../features/directions/directionSlice';
import classReducer from '../features/classes/classSlice';
import subjectReducer from '../features/subjects/subjectSlice';
import uiReducer from '../features/ui/uiSlice';
import superAdminReducer from '../features/superadmin/superAdminSlice';
import eventReducer from '../features/events/eventSlice';
import ratingReducer from '../features/ratings/ratingSlice';
import scheduleReducer from '../features/schedule/scheduleSlice';

const allReducers = {
  auth: authReducer,
  users: userReducer,
  students: studentReducer,
  grades: gradeReducer,
  notifications: notificationReducer,
  schools: schoolReducer,
  directions: directionReducer,
  classes: classReducer,
  subjects: subjectReducer,
  ui: uiReducer,
  superAdmin: superAdminReducer,
  events: eventReducer,
  ratings: ratingReducer,
  schedule: scheduleReducer,
};

const combinedReducer = combineReducers(allReducers);

/**
 * Root reducer that intercepts account-switch actions to reset
 * user-scoped slices (grades, notifications, students, etc.)
 * while preserving auth (new user) and ui (theme preferences).
 */
const rootReducer = (state, action) => {
  if (action.type === 'auth/switchAccount/fulfilled') {
    const { auth, ui } = state;
    state = { auth, ui };
  }
  return combinedReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});
