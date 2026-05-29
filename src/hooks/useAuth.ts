import { useState, useEffect } from 'react';
import { saveSession, getSession, clearSession } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';

export interface AuthState {
  user: any;
  email: string;
  password: string;
  name: string;
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
  loading: boolean;
  rememberMe: boolean;
  shakeFields: Record<string, boolean>;
}

export const useAuth = (setView: (v: string) => void, showToast: (msg: string) => void) => {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});

  // Session restoration on mount
  useEffect(() => {
    const sess = getSession();
    if (sess) {
      setUser(sess);
      setView('dashboard');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('⚠️ Please provide both email and password');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'login');
    formData.append('email', email);
    formData.append('password', password);
    try {
      const resp = await fetch(`${API_BASE_URL}auth.php`, { method: 'POST', body: formData });
      const result = await resp.json();
      if (result && result.status === 'success') {
        const session = { token: result.token, name: result.name, email: result.email };
        saveSession(session);
        setUser(session);
        showToast('🎉 Login successful!');
        setView('dashboard');
      } else {
        showToast(`❌ Login failed: ${result?.message || 'Invalid credentials'}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('❌ Network error during login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('⚠️ All fields are required for registration');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'register');
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    try {
      const resp = await fetch(`${API_BASE_URL}auth.php`, { method: 'POST', body: formData });
      const result = await resp.json();
      if (result && result.status === 'success') {
        showToast('✅ Registration succeeded! Please log in.');
        setView('login');
      } else {
        showToast(`❌ Registration error: ${result?.message || 'Server issue'}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('❌ Network error during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('⚠️ Email required');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'forgot_check');
    formData.append('email', email);
    try {
      const resp = await fetch(`${API_BASE_URL}auth.php`, { method: 'POST', body: formData });
      const result = await resp.json();
      if (result && result.status === 'success') {
        showToast('✅ Email verified, check your inbox for OTP');
        setView('forgot_verified');
      } else {
        showToast(`❌ ${result?.message || 'Email not found'}`);
        setView('forgot_error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('❌ Network error during email check');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      showToast('⚠️ OTP and new password required');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'reset_password');
    formData.append('email', email);
    formData.append('otp', otp);
    formData.append('new_password', newPassword);
    try {
      const resp = await fetch(`${API_BASE_URL}auth.php`, { method: 'POST', body: formData });
      const result = await resp.json();
      if (result && result.status === 'success') {
        showToast('🔐 Password reset successful, please log in');
        setView('login');
      } else {
        showToast(`❌ ${result?.message || 'Reset failed'}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('❌ Network error during password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setView('login');
    showToast('🚪 Logged out');
  };

  return {
    user,
    setUser,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    loading,
    setLoading,
    rememberMe,
    setRememberMe,
    shakeFields,
    setShakeFields,
    handleLogin,
    handleRegister,
    handleCheckEmail,
    handleUpdatePassword,
    handleLogout,
  };
};
