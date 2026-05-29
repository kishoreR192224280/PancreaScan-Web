import React from 'react';

interface LandingProps {
  setView: (view: 'landing' | 'login' | 'register' | 'forgot_email' | 'forgot_verified' | 'forgot_error' | 'dashboard') => void;
}

export const Landing: React.FC<LandingProps> = ({ setView }) => {
  return (
    <main className="landing-container animate-fade-in">
      <section className="hero-content">
        <div className="badge-powered">
          <span className="badge-dot"></span>
          AI-Powered • Federated Learning
        </div>
        <h1 className="brand-title">PancreaScan</h1>
        <p className="brand-subtitle">AI-Powered Early Detection of Pancreatic Anomalies</p>
        <div className="features-grid">
          <div className="feature-badge">
            <span className="feature-icon">🧠</span>On-Device Neural Network
          </div>
          <div className="feature-badge">
            <span className="feature-icon">🔒</span>Privacy-First
          </div>
          <div className="feature-badge">
            <span className="feature-icon">📡</span>Offline Capable
          </div>
          <div className="feature-badge">
            <span className="feature-icon">📄</span>Local PDF Reports
          </div>
          <div className="feature-badge">
            <span className="feature-icon">⚡</span>Real-Time Analysis
          </div>
        </div>
        <div className="action-container">
          <button type="button" className="btn-access" onClick={() => setView('login')}>
            <div className="btn-access-glow"></div>
            Access PancreaScan <span style={{ fontSize: '18px' }}>🔵</span>
          </button>
        </div>
      </section>
      <section className="status-sidebar">
        <div className="sidebar-card animate-slide-up">
          <div className="card-tag">Data Privacy</div>
          <div className="card-title cyan">100%</div>
          <div className="card-desc">Encrypted Sync Only</div>
        </div>
        <div className="sidebar-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-tag">Network</div>
          <div className="card-title">Offline</div>
          <div className="card-desc">Full Local Operation</div>
        </div>
      </section>
    </main>
  );
};
export default Landing;
