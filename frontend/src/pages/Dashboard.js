import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getUserData } from '../features/auth/authSlice';
import logger from '../services/loggerService';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { getMyNotifications } from '../features/notifications/notificationSlice';
import { getStudentGrades } from '../features/grades/gradeSlice';
import { getSchools } from '../features/schools/schoolSlice';
import { getDirections } from '../features/directions/directionSlice';
import { getSubjects } from '../features/subjects/subjectSlice';
import { useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Assignment, Notifications, School } from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { notifications, isLoading: notificationsLoading } = useSelector((state) => state.notifications);
  
  // Enhanced logging for component rendering and user state
  logger.info('DASHBOARD', 'Component rendering', {
    user: user ? {
      id: user._id || user.id,
      role: user.role,
      name: user.name,
      hasToken: !!user.token,
      tokenLength: user.token?.length,
      hasSchoolFeatures: !!user.schoolFeatures
    } : 'No user',
    currentPath: window.location.pathname,
    previousPath: window.history?.state?.prev || 'Unknown'
  });
  
  // Check if features are enabled based on school settings from the SchoolPermissions collection
  const isFeatureEnabled = (featureName) => {
    try {
      // Print debug info about schoolFeatures structure
      logger.info('FEATURE CHECK', `Checking feature: ${featureName}`, {
        role: user?.role || 'unknown',
        hasSchoolFeatures: !!user?.schoolFeatures,
        schoolFeaturesType: user?.schoolFeatures ? typeof user.schoolFeatures : 'undefined',
        featureContent: user?.schoolFeatures ? JSON.stringify(user.schoolFeatures).substring(0, 100) : 'No features'
      });
      
      // Check actual feature toggle state from the SchoolPermissions collection
      const getFeatureToggleState = () => {
        if (!user || !user.schoolFeatures) {
          logger.warn('FEATURE CHECK', `No school features data available`);
          return true; // Default to enabled if no data
        }
        
        // We expect schoolFeatures to be an object from the SchoolPermissions collection 'features' field
        const featureMap = {
          'notifications': 'enableNotifications',
          'grades': 'enableGrades',
          'rating': 'enableRatingSystem',
          'calendar': 'enableCalendar',
          'progress': 'enableStudentProgress'
        };
        
        const backendKey = featureMap[featureName];
        if (!backendKey) {
          logger.warn('FEATURE CHECK', `Unknown feature name: ${featureName}`);
          return true; // Default to showing if feature mapping is unknown
        }
        
        // Check if the feature is enabled in the school permissions
        let isEnabled = false;
        
        // Handle different possible structures for backward compatibility
        if (typeof user.schoolFeatures === 'object') {
          if (user.schoolFeatures.features && typeof user.schoolFeatures.features === 'object') {
            // New format from SchoolPermissions model (nested 'features' object)
            isEnabled = user.schoolFeatures.features[backendKey] === true;
            logger.info('FEATURE CHECK', `New format: Feature ${featureName} (${backendKey}) is ${isEnabled ? 'enabled' : 'disabled'}`);
          } else {
            // Legacy direct format
            isEnabled = user.schoolFeatures[backendKey] === true;
            logger.info('FEATURE CHECK', `Legacy format: Feature ${featureName} (${backendKey}) is ${isEnabled ? 'enabled' : 'disabled'}`);
          }
        } else if (Array.isArray(user.schoolFeatures)) {
          // Handle array format for maximum backward compatibility
          isEnabled = user.schoolFeatures.includes(backendKey);
          logger.info('FEATURE CHECK', `Array format: Feature ${featureName} (${backendKey}) is ${isEnabled ? 'enabled' : 'disabled'}`);
        }
        
        return isEnabled;
      };
      
      // Get the actual toggle state - this reflects the true database state
      const featureState = getFeatureToggleState();
      
      // Context-aware permission handling
      // For admin views, we need to show the ACTUAL state to allow toggling
      const isAdminView = window.location.pathname.includes('/admin') || 
                          window.location.pathname.includes('/superadmin') || 
                          window.location.pathname.includes('/settings');
      
      // Permissions based on role
      if (user && (user.role === 'superadmin')) {
        // Superadmins can access everything, but in admin views we show the actual state
        return isAdminView ? featureState : true;
      } else if (user && user.role === 'admin') {
        // School admins can access everything for their school, but in admin views we show actual state
        return isAdminView ? featureState : true;
      }
      
      // For all other users, apply the actual feature state
      return featureState;
    } catch (error) {
      // Safely handle any errors in the permission check to avoid UI crashes
      logger.error('FEATURE CHECK', `Error checking feature ${featureName}`, { error: error.message });
      return false; // To be safe, default to hiding features if there's an error for regular users
    }
  };
  
  // Create a memoized error handler for navigation
  const handleNavigationError = useCallback((destination, error) => {
    logger.error('NAVIGATION', `Failed to navigate to ${destination}`, {
      error: error.message,
      stack: error.stack,
      from: window.location.pathname,
      to: destination,
      user: user ? { id: user._id, role: user.role } : 'No user'
    });
  }, [user]);
  
  // Basic navigation functions with error handling
  const goToProfile = () => {
    try {
      navigate('/app/profile');
    } catch (error) {
      handleNavigationError('/app/profile', error);
    }
  };
  
  const goToNotifications = () => {
    try {
      navigate('/app/notifications');
    } catch (error) {
      handleNavigationError('/app/notifications', error);
    }
  };
  
  const goToGrades = () => {
    try {
      navigate('/app/grades');
    } catch (error) {
      handleNavigationError('/app/grades', error);
    }
  };
  
  const goToTeacherDashboard = () => {
    try {
      navigate('/app/teacher');
    } catch (error) {
      handleNavigationError('/app/teacher', error);
    }
  };
  
  const goToAdminDashboard = () => {
    try {
      navigate('/app/admin');
    } catch (error) {
      handleNavigationError('/app/admin', error);
    }
  };
  const { grades, isLoading: gradesLoading } = useSelector((state) => state.grades);
  const { subjects } = useSelector((state) => state.subjects);
  const { schools } = useSelector((state) => state.schools);
  const { directions } = useSelector((state) => state.directions);

  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentGrades, setRecentGrades] = useState([]);
  const [userSchools, setUserSchools] = useState([]);
  const [userDirections, setUserDirections] = useState([]);
  const [userSubjects, setUserSubjects] = useState([]);

  // Use a ref to track whether we've loaded data
  const dataLoaded = React.useRef(false);
  const [loadingErrors, setLoadingErrors] = useState({});
  const [showErrorWarning, setShowErrorWarning] = useState(false);

  // Enhanced superadmin redirection with comprehensive error logging
  useEffect(() => {
    if (user && user.role === 'superadmin') {
      logger.info('SUPERADMIN', 'Superadmin detected in Dashboard component', {
        id: user._id || user.id || 'MISSING_ID',
        name: user.name || 'MISSING_NAME',
        currentPath: window.location.pathname,
        hasToken: !!user.token,
        tokenLength: user.token?.length,
        userProperties: Object.keys(user),
        storageType: localStorage.getItem('user') ? 'localStorage' : 
                    sessionStorage.getItem('user') ? 'sessionStorage' : 'none'
      });
      
      // Extensive logging and error handling for the critical redirection
      try {
        // Check if already on target page to prevent loops
        if (window.location.pathname !== '/superadmin/dashboard') {
          logger.info('NAVIGATION', 'Redirecting superadmin to dashboard', {
            from: window.location.pathname,
            to: '/superadmin/dashboard',
            replace: true
          });
          
          // Actual navigation with error catching
          navigate('/superadmin/dashboard', { replace: true });
          
          // Log success after navigation attempt
          logger.info('NAVIGATION', 'Superadmin redirect initiated successfully');
        } else {
          logger.info('NAVIGATION', 'Superadmin already on dashboard page, skipping redirect');
        }
      } catch (error) {
        // Critical error logging for navigation failures
        logger.critical('NAVIGATION', 'Failed to redirect superadmin to dashboard', {
          error: error.message,
          stack: error.stack,
          user: {
            id: user._id || user.id,
            role: user.role,
            hasToken: !!user.token
          },
          currentPath: window.location.pathname,
          navigationState: window.history?.state || 'No history state'
        });
        
        // Fallback redirect attempt using window.location as a last resort
        setTimeout(() => {
          logger.warn('NAVIGATION', 'Attempting fallback navigation using window.location');
          window.location.href = '/superadmin/dashboard';
        }, 500);
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && !dataLoaded.current) {
      // Set flag to prevent infinite reload
      dataLoaded.current = true;
      
      // Skip data loading for superadmin users
      if (user.role === 'superadmin') {
        console.log('Skipping standard data loading for superadmin user');
        return;
      }
      
      // Fetch initial data only once - with error handling
      const loadData = async () => {
        const errors = {};
        
        try {
          await dispatch(getMyNotifications()).unwrap();
        } catch (error) {
          console.error('Failed to load notifications:', error);
          errors.notifications = true;
        }
        
        try {
          await dispatch(getSchools()).unwrap();
        } catch (error) {
          console.error('Failed to load schools:', error);
          errors.schools = true;
        }
        
        try {
          await dispatch(getDirections()).unwrap();
        } catch (error) {
          console.error('Failed to load directions:', error);
          errors.directions = true;
        }
        
        try {
          await dispatch(getSubjects()).unwrap();
        } catch (error) {
          console.error('Failed to load subjects:', error);
          errors.subjects = true;
        }
        
        // Only try to load grades for students
        if (user.role === 'student') {
          try {
            await dispatch(getStudentGrades()).unwrap();
          } catch (error) {
            console.error('Failed to load grades:', error);
            errors.grades = true;
          }
        }
        
        // Set loading errors if any occurred
        if (Object.keys(errors).length > 0) {
          setLoadingErrors(errors);
          setShowErrorWarning(true);
        }
      };
      
      loadData();
    }
  }, [user, dispatch]);

  // Process notifications and grades when they change
  useEffect(() => {
    if (notifications && Array.isArray(notifications)) {
      // Get the 5 most recent notifications
      const recent = notifications
        .filter(n => n.date) // Ensure notification has a date
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      setRecentNotifications(recent);
    }
    
    if (grades && Array.isArray(grades) && user?.role === 'student') {
      // Get the 5 most recent grades
      const recent = grades
        .filter(g => g.date) // Ensure grade has a date
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      setRecentGrades(recent);
    }
  }, [notifications, grades, user?.role]);

  // Process user's schools, directions, and subjects when they change
  useEffect(() => {
    // Get user's schools
    if (schools && user && user.schools) {
      // Handle both cases: when schools are objects or just IDs
      if (user.schools[0] && typeof user.schools[0] === 'object') {
        // Schools are already populated objects
          setUserSchools(user.schools);
      } else if (schools.length > 0 && user.schools.length > 0) {
        // Schools are just IDs, need to match with full objects
        const userSchoolsData = schools.filter(school => 
          user.schools.some(userSchool => 
            (typeof userSchool === 'string' ? userSchool : userSchool._id) === school._id
          )
        );
        setUserSchools(userSchoolsData);
      }
      }
      // Check for old field name as fallback
    else if (user && user.school) {
        // Handle both single school and multiple schools
        if (Array.isArray(user.school)) {
          // Array of schools
          console.log('Dashboard: Using legacy field school as array');
          if (user.school.length > 0 && typeof user.school[0] === 'object') {
            // Schools are populated objects
            setUserSchools(user.school);
          } else if (schools && schools.length > 0) {
            // Schools are just IDs, find the full objects
            const schoolObjects = user.school.map(schoolId => 
              schools.find(s => s._id === schoolId)
            ).filter(Boolean);
            setUserSchools(schoolObjects);
          }
        } else {
        // Single school
        console.log('Dashboard: Using single school value');
          if (typeof user.school === 'object' && user.school !== null) {
            // School is a populated object
            setUserSchools([user.school]);
          } else if (schools && typeof user.school === 'string') {
          // School is just an ID, find the full object
            const school = schools.find(s => s._id === user.school);
            if (school) setUserSchools([school]);
        }
      }
    }

    // Get user's directions
    if (directions && user && user.directions) {
      // Handle both cases: when directions are objects or just IDs
      if (user.directions[0] && typeof user.directions[0] === 'object') {
        // Directions are already populated objects
          setUserDirections(user.directions);
      } else if (directions.length > 0 && user.directions.length > 0) {
        // Directions are just IDs, need to match with full objects
        const userDirectionsData = directions.filter(direction => 
          user.directions.some(userDirection => 
            (typeof userDirection === 'string' ? userDirection : userDirection._id) === direction._id
          )
        );
        setUserDirections(userDirectionsData);
      }
      }
      // Check for old field name as fallback
    else if (user && user.direction) {
        // Handle both single direction and multiple directions
        if (Array.isArray(user.direction)) {
          // Array of directions
          console.log('Dashboard: Using legacy field direction as array');
          if (user.direction.length > 0 && typeof user.direction[0] === 'object') {
            // Directions are populated objects
            setUserDirections(user.direction);
          } else if (directions && directions.length > 0) {
            // Directions are just IDs, find the full objects
            const directionObjects = user.direction.map(directionId => 
              directions.find(d => d._id === directionId)
            ).filter(Boolean);
            setUserDirections(directionObjects);
          }
        } else {
          // Single direction (for students)
          console.log('Dashboard: Using single direction value (student format)');
          if (typeof user.direction === 'object' && user.direction !== null) {
            // Direction is a populated object
            setUserDirections([user.direction]);
          } else if (directions && typeof user.direction === 'string') {
            // Direction is just an ID, find the full object as fallback
            const direction = directions.find(d => d._id === user.direction);
            if (direction) setUserDirections([direction]);
        }
      }
    }

    // Get user's subjects
    if (subjects && user && user.subjects) {
      // Handle both cases: when subjects are objects or just IDs
      if (user.subjects[0] && typeof user.subjects[0] === 'object') {
        // Subjects are already populated objects
        setUserSubjects(user.subjects);
      } else if (subjects.length > 0 && user.subjects.length > 0) {
        // Subjects are just IDs, need to match with full objects
        const userSubjectsData = subjects.filter(subject => 
          user.subjects.some(userSubject => 
            (typeof userSubject === 'string' ? userSubject : userSubject._id) === subject._id
          )
        );
        setUserSubjects(userSubjectsData);
      }
    }
  }, [notifications, grades, schools, directions, subjects, user]);

  const getWelcomeMessage = () => {
    const hours = new Date().getHours();
    if (hours < 12) return t('dashboard.welcome');
    if (hours < 18) return t('dashboard.welcome');
    return t('dashboard.welcome');
  };

  // If data is still loading, show loading state
  if ((notificationsLoading || gradesLoading) && !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Error warning banner */}
      {showErrorWarning && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-yellow-800 mb-2">
            {t('errors.generic')}
            </p>
          <Button 
              size="sm" 
            onClick={() => window.location.reload()} 
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {t('common.refresh')}
          </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* Welcome Section */}
        <div className="md:col-span-1">
          <Card className="h-full bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-2">
              {getWelcomeMessage()}, {user?.name}!
              </h2>
              <p className="text-blue-100">
              {t('dashboard.welcome')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Info Section */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-bold mb-4">
              {t('common.profile')}
              </h3>
              <Separator className="mb-4" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">
                  <strong>Role:</strong> {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {user?.email}
                  </p>
                </div>
              {(user?.role === 'student' || user?.role === 'teacher') && (
                <>
                    <div>
                      <p className="text-sm text-gray-600">
                      <strong>School{userSchools.length > 1 ? 's' : ''}:</strong>
                      {userSchools && userSchools.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                          {userSchools.map(school => (
                              <Badge key={school._id} variant="secondary" className="bg-blue-100 text-blue-800">
                                {school.name}
                              </Badge>
                          ))}
                          </div>
                      ) : (
                        user?.school ? 'Loading...' : 'Not assigned'
                      )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                      <strong>Direction{userDirections.length > 1 ? 's' : ''}:</strong>
                      {userDirections && userDirections.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                          {userDirections.map(direction => (
                              <Badge key={direction._id} variant="secondary" className="bg-green-100 text-green-800">
                                {direction.name}
                              </Badge>
                          ))}
                          </div>
                      ) : (
                        user?.direction ? 'Loading...' : 'Not assigned'
                      )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                      <strong>Subjects:</strong> 
                      {userSubjects && userSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                          {userSubjects.map(subject => (
                              <Badge key={subject._id} variant="outline">
                                {subject.name}
                              </Badge>
                          ))}
                          </div>
                      ) : (
                        user?.subjects && user.subjects.length > 0 ? 'Loading...' : 'Not assigned'
                      )}
                      </p>
                    </div>
                </>
              )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Card */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardContent className="p-4">
              <h3 className="text-lg font-bold mb-4">
              Quick Links
              </h3>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 gap-3">
              {user?.role === 'student' && (
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/app/grades')}
                    className="w-full justify-start"
                  >
                    <Assignment className="mr-2 w-4 h-4" />
                    View All Grades
                  </Button>
              )}
              {user?.role === 'teacher' && (
                <>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/app/teacher/grades/manage')}
                      className="w-full justify-start"
                    >
                      <Assignment className="mr-2 w-4 h-4" />
                      Manage Grades
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/app/teacher/notifications/create')}
                      className="w-full justify-start"
                    >
                      <Notifications className="mr-2 w-4 h-4" />
                      Send Notification
                    </Button>
                </>
              )}
              {user?.role === 'admin' && (
                <>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/app/admin/users')}
                      className="w-full justify-start"
                    >
                      <School className="mr-2 w-4 h-4" />
                      {t('navigation.students')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/app/admin/schools')}
                      className="w-full justify-start"
                    >
                      <School className="mr-2 w-4 h-4" />
                      {t('navigation.settings')}
                    </Button>
                </>
              )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Use the appropriate navigation based on user role
                    if (user?.role === 'teacher') {
                      navigate('/app/teacher/notifications');
                    } else if (user?.role === 'student') {
                      // Use the goToNotifications function for students
                      goToNotifications();
                    } else {
                      // Fallback for other roles
                      navigate('/app/notifications');
                    }
                  }}
                  className="w-full justify-start"
                >
                  <Notifications className="mr-2 w-4 h-4" />
                  {t('dashboard.notifications')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications Section */}
        {isFeatureEnabled('notifications') && (
        <div className="md:col-span-1">
          <Card className="min-h-[120px]">
            <CardContent className="p-4">
              <h3 className="text-lg font-bold mb-3">
              {t('dashboard.notifications')}
              </h3>
            {notificationsLoading ? (
                <div className="flex justify-center p-4">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : loadingErrors.notifications ? (
                <p className="text-red-600">
                {t('errors.generic')}
                </p>
            ) : (
              <>
                {recentNotifications.length === 0 ? (
                    <p className="text-sm text-gray-500">
                    No recent notifications
                    </p>
                ) : (
                    <div>
                    {recentNotifications.map((notification, index) => (
                        <div key={index} className="mb-2">
                          <p className="text-sm font-medium mb-1">
                          {notification.title}
                          </p>
                          <p className="text-xs text-gray-500">
                          {new Date(notification.date).toLocaleDateString()}
                          </p>
                        </div>
                    ))}
                    </div>
                )}
                <Button
                    variant="outline"
                    size="sm"
                  onClick={goToNotifications}
                    className="mt-3"
                >
                    <Notifications className="mr-2 w-4 h-4" />
                  View All
                </Button>
              </>
            )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Recent Grades Section (Students only) */}
        {user?.role === 'student' && isFeatureEnabled('grades') && (
        <div className="md:col-span-1">
          <Card className="min-h-[120px]">
            <CardContent className="p-4">
              <h3 className="text-lg font-bold mb-3">
              Recent Grades
              </h3>
            {gradesLoading ? (
                <div className="flex justify-center p-4">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : loadingErrors.grades ? (
                <p className="text-red-600">
                Error loading grades
                </p>
            ) : (
              <>
                {recentGrades.length === 0 ? (
                    <p className="text-sm text-gray-500">
                    No recent grades
                    </p>
                ) : (
                    <div>
                    {recentGrades.map((grade, index) => (
                        <div key={index} className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm">
                            {grade.subject?.name || 'Unknown Subject'}
                            </p>
                            <p className="text-sm font-bold">
                            {grade.value}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">
                          {new Date(grade.date).toLocaleDateString()}
                          </p>
                        </div>
                    ))}
                    </div>
                )}
                <Button
                    variant="outline"
                    size="sm"
                  onClick={goToGrades}
                    className="mt-3"
                >
                    <Assignment className="mr-2 w-4 h-4" />
                  View All
                </Button>
              </>
            )}
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </div>
  );
};

// Wrap the Dashboard component with an ErrorBoundary for comprehensive error catching
const DashboardWithErrorBoundary = () => (
  <ErrorBoundary componentName="Dashboard">
    <Dashboard />
  </ErrorBoundary>
);

export default DashboardWithErrorBoundary;
