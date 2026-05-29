import React from 'react';
import logoImg from '../assets/logo.png';

interface RegisterProps {
  setView: (view: string) => void;
  auth: any;
}

const Register: React.FC<RegisterProps> = ({ setView, auth }) => {
  const { name, setName, email, setEmail, password, setPassword, loading, handleRegister } = auth;
  return (
    <main className="landing-container" style={{ minHeight: '90vh' }}>
      <section className="auth-card-wrapper">
        <div className="auth-card">
          <img src={logoImg} className="auth-logo" alt="Logo" />
          <h2 className="auth-card-title">Create Your Account</h2>
          <p className="auth-card-subtitle">Join the PancreaScan Secure Clinical Network</p>
          <form onSubmit={handleRegister} className="auth-form">
            <div className="input-group">
              <span className="input-icon">👤</span>
              <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="input-group">
              <span className="input-icon">✉️</span>
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-solid" disabled={loading}>${loading ? 'Processing...' : 'Create Account'}</button>
          </form>
          <p className="auth-footer" style={{ marginTop: '24px' }}>
            Already have an account?{' '}
            <span className="glow-link" onClick={() => setView('login')}>Log In</span>
          </p>
        </div>
      </section>
    </main>
  );
};

export default Register;
