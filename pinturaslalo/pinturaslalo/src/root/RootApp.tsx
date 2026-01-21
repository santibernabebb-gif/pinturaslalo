import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import PresupuestosApp from '../pages/PresupuestosApp';
import FacturasApp from '../pages/FacturasApp';

const RootApp: React.FC = () => {
  // Al refrescar (o cargar directamente una ruta interna), volvemos siempre al Dashboard.
  // Esto no afecta a la navegación normal dentro de la app.
  const navigate = useNavigate();
  const location = useLocation();
  const didRedirect = useRef(false);

  useEffect(() => {
    // En dev con StrictMode el efecto puede ejecutarse 2 veces: lo bloqueamos.
    if (didRedirect.current) return;
    didRedirect.current = true;

    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    // Solo al primer montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/presupuestos/*" element={<PresupuestosApp />} />
      <Route path="/facturas/*" element={<FacturasApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default RootApp;
