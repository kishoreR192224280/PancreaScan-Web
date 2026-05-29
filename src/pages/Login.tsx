import React from 'react';
import logoImg from '../assets/logo.png';

interface LoginProps {
  handleLogin: (e: React.FormEvent) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  shakeFields: Record<string, boolean>;
  loading: boolean;
  setView: (view: 'landing' | 'login' | 'register' | 'forgot_email' | 'forgot_verified' | 'forgot_error' | 'dashboard') => void;
}

export const Login: React.FC<LoginProps> = ({
  handleLogin,
  email,
  setEmail,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  showPassword,
  setShowPassword,
  shakeFields,
  loading,
  setView,
}) => {
  return (
    <main className="landing-container animate-fade-in" style={{ minHeight: '90vh' }}>
      <div></div>
      <section className="auth-card-wrapper">
        <div className="auth-card">
          <img src={logoImg} className="auth-logo" alt="Logo" />
          <h2 className="auth-card-title">Welcome Back, Doctor</h2>
          <p className="auth-card-subtitle">Sign in to your secure clinical portal</p>
          <form onSubmit={handleLogin} className="auth-form">
            <div className={`input-group ${shakeFields['email'] ? 'shake' : ''}`}>
              <span className="input-icon">✉️</span>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={`input-group ${shakeFields['password'] ? 'shake' : ''}`}>
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="input-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '👁️' : '🕶️'}
              </span>
            </div>
            <div className="form-utils">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark"></span>Remember Me
              </label>
              <span
                className="glow-link"
                style={{ fontSize: '13px' }}
                onClick={() => setView('forgot_email')}
              >
                Forgot Password?
              </span>
            </div>
            <button type="submit" className="btn-solid" disabled={loading}>
              {loading ? 'Authorizing...' : 'Log In'}
            </button>
          </form>
          <div className="divider-text">
            <span>or</span>
          </div>
          <p className="auth-footer">
            New to PancreaScan?{' '}
            <span className="glow-link" onClick={() => setView('register')}>
              Create Account
            </span>
          </p>
        </div>
      </section>
    </main>
  );
};
export default Login;
