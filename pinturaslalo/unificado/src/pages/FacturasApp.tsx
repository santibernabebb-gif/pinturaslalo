import React from 'react';
import { useNavigate } from 'react-router-dom';
import Facturas from '../apps/facturas/App';

const barStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 52,
  background: 'rgba(245,246,248,0.92)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  zIndex: 9999,
  borderBottom: '1px solid rgba(0,0,0,0.08)'
};

const btnStyle: React.CSSProperties = {
  border: 'none',
  background: '#111827',
  color: '#fff',
  padding: '10px 12px',
  borderRadius: 12,
  fontWeight: 900,
  cursor: 'pointer'
};

const FacturasApp: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div style={barStyle}>
        <button style={btnStyle} onClick={() => navigate('/')}>SALIR</button>
      </div>
      <div style={{ paddingTop: 52 }}>
        <Facturas />
      </div>
    </div>
  );
};

export default FacturasApp;
