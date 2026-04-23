import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { API_URL } from '../config/appConfig';

const BetaContext = createContext({
  betaRoutes: {},
  isBetaRoute: () => false,
  reload: () => {},
});

export const BetaProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [betaRoutes, setBetaRoutes] = useState({});

  const load = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/api/beta-features`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBetaRoutes(data.routes || {});
        console.log('[BetaContext] Loaded beta routes:', Object.keys(data.routes || {}).filter(k => data.routes[k]));
      }
    } catch (err) {
      console.error('[BetaContext] Failed to load beta features:', err);
    }
  }, [user?.token]);

  useEffect(() => {
    load();
  }, [load]);

  const isBetaRoute = useCallback(
    (pathname) => {
      if (!pathname) return false;
      return betaRoutes[pathname] === true;
    },
    [betaRoutes]
  );

  return (
    <BetaContext.Provider value={{ betaRoutes, isBetaRoute, reload: load }}>
      {children}
    </BetaContext.Provider>
  );
};

export const useBeta = () => useContext(BetaContext);

export default BetaContext;
