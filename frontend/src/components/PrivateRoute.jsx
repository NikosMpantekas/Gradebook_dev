import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';

// PrivateRoute component that checks if user is logged in
// If not, redirects to login page
const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  
  useEffect(() => {
    // Debug effect placeholder
  }, [user, location.pathname]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If user must change their password, block access to all other routes
  if ((user.requirePasswordChange || user.isFirstLogin) && location.pathname !== '/change-password') {

    return <Navigate to="/change-password" replace />;
  }


  
  // Support for render prop pattern or regular children
  if (typeof children === 'function') {
    return <div className="private-route-content">{children({ user })}</div>;
  } else if (children) {
    return <div className="private-route-content">{children}</div>;
  } else {
    return <div className="private-route-outlet"><Outlet /></div>;
  }
};

export default PrivateRoute;
