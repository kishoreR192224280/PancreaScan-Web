import React from 'react';
import logoImg from '../assets/logo.png';
import { clearSession } from '../utils/auth';

interface SidebarProps {
  currentTab: 'overview' | 'history' | 'analytics' | 'settings';
  setTab: (tab: 'overview' | 'history' | 'analytics' | 'settings') => void;
  setFilterType: (filter: 'all' | 'Normal' | 'Abnormal') => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setTab,
  setFilterType,
  user,
  onLogout,
}) => {
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <img src={logoImg} alt="Logo" className="sidebar-logo" />
        <span className="sidebar-title">PancreaScan</span>
      </div>

      <div
        className="sidebar-doctor-info"
        style={{
          padding: '0 24px 20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px',
          }}
        >
          Active Clinician
        </div>
        <div
          style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user?.name || 'Dr. Thanvi Reddy'}
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '11.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user?.email}
        </div>
      </div>

      <nav className="sidebar-menu">
        <button
          type="button"
          className={`menu-item ${currentTab === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setTab('overview');
            setFilterType('all');
          }}
        >
          <span className="menu-icon">📊</span> Dashboard
        </button>
        <button
          type="button"
          className={`menu-item ${currentTab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          <span className="menu-icon">🩻</span> Patient History
        </button>
        <button
          type="button"
          className={`menu-item ${currentTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setTab('analytics')}
        >
          <span className="menu-icon">📈</span> Analytics
        </button>
        <button
          type="button"
          className={`menu-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => setTab('settings')}
        >
          <span className="menu-icon">⚙️</span> Settings
        </button>
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="btn-logout"
          onClick={() => {
            clearSession();
            onLogout();
          }}
        >
          🚪 Log Out
        </button>
      </div>
    </aside>
  );
};
