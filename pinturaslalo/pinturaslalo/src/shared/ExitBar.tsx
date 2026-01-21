import React from 'react';
import { useNavigate } from 'react-router-dom';

const ExitBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.wrap}>
      <button type="button" style={styles.btn} onClick={() => navigate('/')}>SALIR</button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    top: 12,
    left: 12,
    zIndex: 1000
  },
  btn: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 12px',
    background: '#111827',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 22px rgba(0,0,0,0.18)'
  }
};

export default ExitBar;
