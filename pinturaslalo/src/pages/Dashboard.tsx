import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Receipt } from 'lucide-react';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f6f8',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    color: '#0b0b0b',
    display: 'flex',
    flexDirection: 'column'
  },
  topBar: {
    padding: '18px 18px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: '#fff',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700
  },
  bell: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: '#fff',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    display: 'grid',
    placeItems: 'center'
  },
  header: {
    padding: '6px 18px 16px'
  },
  welcome: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
    color: '#2e5bff',
    marginBottom: 6
  },
  title: {
    fontSize: 28,
    margin: 0,
    lineHeight: 1.1
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#6b7280'
  },
  grid: {
    padding: '0 18px',
    display: 'grid',
    gap: 14
  },
  card: {
    borderRadius: 18,
    padding: 18,
    color: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    position: 'relative',
    overflow: 'hidden'
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.2)',
    display: 'grid',
    placeItems: 'center',
    marginBottom: 14
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 900,
    margin: 0
  },
  cardDesc: {
    margin: '6px 0 14px',
    opacity: 0.92
  },
  button: {
    border: 'none',
    background: '#fff',
    color: '#111827',
    padding: '10px 14px',
    borderRadius: 12,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8
  },
  spacer: {
    flex: 1
  },
  footer: {
    padding: '22px 18px',
    textAlign: 'center',
    color: '#9ca3af',
    fontWeight: 700
  }
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.brandLeft}>
          <div style={styles.avatar}>PL</div>
          <div style={{ fontWeight: 900 }}>Pinturas Lalo</div>
        </div>
        <div style={styles.bell} aria-hidden>
          🔔
        </div>
      </div>

      <div style={styles.header}>
        <div style={styles.welcome}>BIEN VENIDO</div>
        <h1 style={styles.title}>¡Hola de nuevo!</h1>
        <p style={styles.subtitle}>¿Qué vamos a gestionar hoy?</p>
      </div>

      <div style={styles.grid}>
        <div
          style={{
            ...styles.card,
            background: 'linear-gradient(135deg, #1d5cff, #5b86ff)'
          }}
        >
          <div style={styles.cardIconWrap}>
            <FileText size={22} />
          </div>
          <p style={styles.cardTitle}>PRESUPUESTOS</p>
          <p style={styles.cardDesc}>Crea y gestiona tus cotizaciones</p>
          <button style={styles.button} onClick={() => navigate('/presupuestos')}>
            Ir a Presupuestos →
          </button>
        </div>

        <div
          style={{
            ...styles.card,
            background: 'linear-gradient(135deg, #ff8a00, #ff4d00)'
          }}
        >
          <div style={styles.cardIconWrap}>
            <Receipt size={22} />
          </div>
          <p style={styles.cardTitle}>FACTURAS</p>
          <p style={styles.cardDesc}>Control total de tus cobros</p>
          <button style={styles.button} onClick={() => navigate('/facturas')}>
            Ir a Facturas →
          </button>
        </div>
      </div>

      <div style={styles.spacer} />
      <div style={styles.footer}>SantiSystems</div>
    </div>
  );
};

export default Dashboard;
