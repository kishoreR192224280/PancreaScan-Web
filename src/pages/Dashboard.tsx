import React from 'react';

interface DashboardProps {
  setView: (view: string) => void;
  auth: any;
  scans: any;
}

const Dashboard: React.FC<DashboardProps> = ({ setView, auth, scans }) => {
  // Simple placeholder dashboard with navigation
  const openHistory = () => setView('dashboard'); // In real app, would switch subview

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <img src={auth.logoImg || ''} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">PancreaScan</span>
        </div>
        <nav className="sidebar-menu">
          <button className="menu-item active">📊 Dashboard</button>
          <button className="menu-item" onClick={openHistory}>🩻 Patient History</button>
          <button className="menu-item">📈 Analytics</button>
          <button className="menu-item">⚙️ Settings</button>
        </nav>
      </aside>
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h2>Welcome, Dr. {auth.user?.name || 'User'}</h2>
          <p>Clinical Portal Dashboard</p>
        </header>
        <main className="dashboard-view-container">
          <p>Dashboard overview content would appear here.</p>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
