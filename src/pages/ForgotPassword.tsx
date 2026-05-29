import React from 'react';

interface ForgotPasswordProps {
  setView: (view: string) => void;
  auth: any;
  step: 'email' | 'verified' | 'error';
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ setView, auth, step }) => {
  const { email, setEmail, loading, handleCheckEmail, otp, setOtp, newPassword, setNewPassword, confirmNewPassword, setConfirmNewPassword, handleUpdatePassword, shakeFields } = auth;

  if (step === 'email') {
    return (
      <main className="landing-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <section className="auth-card-wrapper" style={{ width: '100%', maxWidth: '480px' }}>
          <div className="auth-card">
            <img src={auth.logoImg || ''} className="auth-logo" alt="Logo" />
            <h2 className="auth-card-title">Forgot Password?</h2>
            <p className="auth-card-subtitle">Enter your registered email address</p>
            <form onSubmit={handleCheckEmail} className="auth-form">
              <div className={`input-group ${shakeFields['email_forgot'] ? 'shake' : ''}`}> 
                <span className="input-icon">✉️</span>
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-solid" disabled={loading}>
                {loading ? 'Searching Database...' : 'Check Email'}
              </button>
            </form>
            <p className="auth-footer" style={{ marginTop: '24px' }}>
              Remember your password? <span className="glow-link" onClick={() => setView('login')}>Back to Login</span>
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (step === 'verified') {
    return (
      <main className="landing-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <section className="auth-card-wrapper" style={{ width: '100%', maxWidth: '480px' }}>
          <div className="auth-card" style={{ border: '1px solid rgba(0, 255, 170, 0.4)' }}>
            <div className="verification-check-icon">✓</div>
            <h2 className="auth-card-title" style={{ marginTop: '12px' }}>Email Verified!</h2>
            <p className="auth-card-subtitle">Create your new password below</p>
            <form onSubmit={handleUpdatePassword} className="auth-form">
              <div className={`input-group ${shakeFields['otp'] ? 'shake' : ''}`}>
                <span className="input-icon">🔑</span>
                <input type="text" placeholder="Verification OTP (6-digits)" value={otp} onChange={e => setOtp(e.target.value)} required />
              </div>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className={`input-group ${shakeFields['confirmNewPassword'] ? 'shake' : ''}`}>
                <span className="input-icon">🛡️</span>
                <input type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-solid" style={{ background: 'linear-gradient(135deg, #00ffaa, #007aff)' }} disabled={loading}>
                Update Password
              </button>
            </form>
            <p className="auth-footer" style={{ marginTop: '24px' }}>
              Back to <span className="glow-link" onClick={() => setView('login')}>Login Portal</span>
            </p>
          </div>
        </section>
      </main>
    );
  }

  // step === 'error'
  return (
    <main className="landing-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <section className="auth-card-wrapper" style={{ width: '100%', maxWidth: '480px' }}>
        <div className="auth-card" style={{ border: '1px solid rgba(255, 51, 85, 0.4)' }}>
          <div className="verification-check-icon error">✗</div>
          <h2 className="auth-card-title" style={{ marginTop: '12px' }}>No Account Found</h2>
          <p className="auth-card-subtitle">This email is not registered in PancreaScan</p>
          <div className="auth-form" style={{ gap: '14px', display: 'flex', flexDirection: 'column' }}>
            <button type="button" className="btn-outline" onClick={() => setView('forgot_email')}>Try Again</button>
            <button type="button" className="btn-solid" onClick={() => setView('register')}>Create Account</button>
          </div>
          <p className="auth-footer" style={{ marginTop: '24px' }}>
            Remember your password? <span className="glow-link" onClick={() => setView('login')}>Back to Login</span>
          </p>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
