// Dashboard Components - Centralized Export
// This file provides a single import point for all dashboard components

export { WelcomePanel } from './WelcomePanel';
export { ProfileInfoPanel } from './ProfileInfoPanel';
export { RecentNotificationsPanel } from './RecentNotificationsPanel';
export { RecentGradesPanel } from './RecentGradesPanel';
export { UpcomingClassesPanel } from './UpcomingClassesPanel';
export { GradesOverTimePanel } from './GradesOverTimePanel';

// Re-export individual components as default exports for backward compatibility
export { default as WelcomePanelDefault } from './WelcomePanel';
export { default as ProfileInfoPanelDefault } from './ProfileInfoPanel';
export { default as RecentNotificationsPanelDefault } from './RecentNotificationsPanel';
export { default as RecentGradesPanelDefault } from './RecentGradesPanel';
export { default as UpcomingClassesPanelDefault } from './UpcomingClassesPanel';
export { default as GradesOverTimePanelDefault } from './GradesOverTimePanel';
