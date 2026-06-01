import React, { createElement, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ROUTES } from '@constants/routes';

const CustomRoutes: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const match = ROUTES.find((r) => r.path === location.pathname);
    document.title = match ? match.title : 'PODS Agents';
  }, [location.pathname]);

  return (
    <Routes>
      {ROUTES.map((route) => (
        <Route
          key={route.key}
          path={route.path}
          element={createElement(route.element)}
        />
      ))}
    </Routes>
  );
};

export default CustomRoutes;
