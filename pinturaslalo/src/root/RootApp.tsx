import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import PresupuestosApp from '../pages/PresupuestosApp';
import FacturasApp from '../pages/FacturasApp';

const RootApp: React.FC = () => {
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
