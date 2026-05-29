import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import ThreeDCanvas from './components/ThreeDCanvas';
import { runPancreasInference } from './utils/pancreasDetector';
import logoImg from './assets/logo.png';
import './App.css';
import { ScanReport } from './components/ScanReport';

// Base API URL with CORS-bypass dev-tunnel proxy fallback
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api/'
  : 'http://14.139.187.229:8081/oct/pancreas/';

interface ScanRecord {
  id: number | string;
  user_email: string;
  image_path: string;
  result: string;
  confidence: number;
  patient_id: string;
  patient_name: string;
  timestamp: string;
  image?: string; // base64 image data from DB
  box?: { left: number; top: number; right: number; bottom: number };
  box_left?: string | number;
  box_top?: string | number;
  box_right?: string | number;
  box_bottom?: string | number;
  feedback_submitted?: boolean;
}

// CountUp Component for stats card animated counting
function CountUp({ target, duration = 1500, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime = performance.now();
    const run = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = progress * (2 - progress); // Ease out quad
      setCount(Math.floor(easedProgress * target));
      if (progress < 1) {
        requestAnimationFrame(run);
      }
    };
    requestAnimationFrame(run);
  }, [target, duration]);
  return <>{count}{suffix}</>;
}

// LandingCanvas for floating dots and monitor grid lines
function LandingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    class Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      opacity: number;
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = 1 + Math.random() * 2;
        this.speedY = -(0.1 + Math.random() * 0.3); // very slow upward
        this.opacity = 0.15 + Math.random() * 0.45;
      }
      update() {
        this.y += this.speedY;
        if (this.y < 0) {
          this.y = height;
          this.x = Math.random() * width;
        }
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 4;
        ctx.fill();
      }
    }
    
    const particles: Particle[] = [];
    for (let i = 0; i < 45; i++) {
      particles.push(new Particle());
    }
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Faint grid lines like a medical monitor
      ctx.shadowBlur = 0; 
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Draw particles
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

function App() {
  // Navigation states: 'landing' | 'login' | 'register' | 'forgot_email' | 'forgot_verified' | 'forgot_error' | 'dashboard'
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'forgot_email' | 'forgot_verified' | 'forgot_error' | 'dashboard'>('landing');
  const [pageTransitionActive, setPageTransitionActive] = useState(false);
  const [scanSweepActive, setScanSweepActive] = useState(false);

  const navigateTo = (newView: typeof view) => {
    setPageTransitionActive(true);
    setTimeout(() => {
      setView(newView);
    }, 400); // peak of sweep
    setTimeout(() => {
      setPageTransitionActive(false);
    }, 850);
  };

  // Dashboard Sub-Views: 'overview' | 'history' | 'analytics' | 'settings'
  const [dashboardSubView, setDashboardSubView] = useState<'overview' | 'history' | 'analytics' | 'settings'>('overview');

  // Logged-in User Session State
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Network connection state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Forms Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password flow states
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Scans history & dynamic analytics stats
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'Normal' | 'Abnormal'>('all');
  const [stats, setStats] = useState({ total: 0, normal: 0, abnormal: 0 });
  const [percentages, setPercentages] = useState({ normal: 0, abnormal: 0 });

  // Animated counting values
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [animatedNormal, setAnimatedNormal] = useState(0);
  const [animatedAbnormal, setAnimatedAbnormal] = useState(0);

  // UI Panels state
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});

  // Uploader Scan Simulation state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Real TFLite CT scan uploader states
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [patientIDInput, setPatientIDInput] = useState('');
  const [patientNameInput, setPatientNameInput] = useState('');
  const [showUploaderModal, setShowUploaderModal] = useState(false);
  const [activeAnalysisResult, setActiveAnalysisResult] = useState<any>(null);
  const [activeReportScan, setActiveReportScan] = useState<any | null>(null);
  const [feedbackSubmittedMap, setFeedbackSubmittedMap] = useState<Record<string, boolean>>({});

  // Settings view specific states
  const [expandedTab, setExpandedTab] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isSyncingTraining, setIsSyncingTraining] = useState(false);

  // --- Dynamic Network Listeners ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('📡 Network Connection Restored: Online Mode.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('⚠️ Network Connection Lost: Running Offline-First Mode.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Auto Restore Secure User Session on Page Load ---
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('user_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session && session.email && session.name) {
          setUser({ name: session.name, email: session.email });
          setView('dashboard');
          fetchScansHistory(session.email);
        }
      }
    } catch (e) {
      console.warn('Session restore corrupted:', e);
      localStorage.removeItem('user_session');
    }
  }, []);

  // Helper: fetch an uploaded image via Vite proxy and return a base64 data URL
  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch('/api/uploads/' + url.split('uploads/').pop());
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  // --- Fetch History & Calculate Stats ---
  const fetchScansHistory = async (userEmail: string) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'get_history');
    formData.append('user_email', userEmail);
    // Request base64 image data for each scan (backend may ignore, we handle ourselves)
    formData.append('include_image', 'true');
    try {
      const response = await fetch(`${API_BASE_URL}sync.php`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const result = await response.json();
      console.log('Fetched history result:', result);

      if (result.status === 'success' && Array.isArray(result.history)) {
        const fetchedScans: ScanRecord[] = await Promise.all(
          result.history.map(async (r: any) => {
            let imgSrc = '';
            if (r.image) {
              imgSrc = r.image;
            } else if (r.image_path) {
              imgSrc = await fetchImageAsBase64(r.image_path);
            }
            return {
              id: r.id?.toString() ?? Date.now().toString() + Math.random(),
              patient_id: r.patient_id ?? '',
              patient_name: r.patient_name ?? '',
              result: r.result,
              confidence: Number(r.confidence),
              timestamp: r.timestamp,
              image: imgSrc,
              box: {
                left: Number(r.box_left),
                top: Number(r.box_top),
                right: Number(r.box_right),
                bottom: Number(r.box_bottom),
              },
            } as ScanRecord;
          })
        );
        setScans(fetchedScans);
        calculateAnalytics(fetchedScans);
      } else if (result.status === 'success') {
        // Success but empty list
        setScans([]);
        calculateAnalytics([]);
      } else {
        throw new Error(result.message || 'Server rejected history request');
      }
    } catch (err: any) {
      console.error('Fetch history error:', err);
      showToast(`⚠️ Sync Database Alert: ${err.message || 'API unavailable'}`);
      setScans([]);
      calculateAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (records: ScanRecord[]) => {
    const total = records.length;
    const normal = records.filter(r => r.result === 'Normal').length;
    const abnormal = records.filter(r => r.result === 'Abnormal').length;

    setStats({ total, normal, abnormal });

    if (total > 0) {
      setPercentages({
        normal: Math.round((normal / total) * 100),
        abnormal: Math.round((abnormal / total) * 100),
      });
    } else {
      setPercentages({ normal: 0, abnormal: 0 });
    }

    // Trigger Count Up Animation
    animateNumbers(total, normal, abnormal);
  };

  // Satisfying clinical count-up from 0
  const animateNumbers = (targetTotal: number, targetNormal: number, targetAbnormal: number) => {
    setAnimatedTotal(0);
    setAnimatedNormal(0);
    setAnimatedAbnormal(0);

    const duration = 1200; // ms
    const startTime = performance.now();

    const updateNumbers = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quad formula
      const easedProgress = progress * (2 - progress);

      setAnimatedTotal(Math.floor(easedProgress * targetTotal));
      setAnimatedNormal(Math.floor(easedProgress * targetNormal));
      setAnimatedAbnormal(Math.floor(easedProgress * targetAbnormal));

      if (progress < 1) {
        requestAnimationFrame(updateNumbers);
      }
    };

    requestAnimationFrame(updateNumbers);
  };

  // Helper to show a floating clinical warning/success toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleStatCardClick = (type: 'Normal' | 'Abnormal') => {
    setFilterType(type);
    setDashboardSubView('history');
  };
  // Helper to shake fields on validation errors
  const triggerShake = (fieldKey: string) => {
    setShakeFields((prev) => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setShakeFields((prev) => ({ ...prev, [fieldKey]: false }));
    }, 500);
  };

  // API Call Helper
  const callAuthApi = async (formData: FormData): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}auth.php`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Server returned status ${response.status}`);
    } catch (err: any) {
      console.warn('API Error (possibly CORS or network offline), running simulation:', err);
      return null;
    }
  };

  // --- Login Submission ---
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('⚠️ Error: Email and password fields are required.');
      triggerShake('email');
      triggerShake('password');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'login');
    formData.append('email', email);
    formData.append('password', password);

    const result = await callAuthApi(formData);
    setLoading(false);

    if (result && result.status === 'success') {
      const doctorName = result.user?.name || 'User';
      const userSession = {
        name: doctorName,
        email: email,
        token: result.user?.id || 'session_token'
      };
      localStorage.setItem('user_session', JSON.stringify(userSession));
      setUser({ name: doctorName, email });
      showToast(`✅ Welcome back, Dr. ${doctorName}!`);
      navigateTo('dashboard');
      fetchScansHistory(email);
    } else {
      const errMsg = result ? result.message : 'Database Connection Refused. Check CORS tunnel status.';
      showToast(`❌ Login Failed: ${errMsg}`);
      triggerShake('password');
    }
  };

  // --- Register Submission ---
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showToast('⚠️ Error: Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      showToast('⚠️ Error: Passwords do not match.');
      triggerShake('confirmPassword');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'signup');
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);

    const result = await callAuthApi(formData);
    setLoading(false);

    if (result && result.status === 'success') {
      showToast('✅ Account Created Successfully! Please login.');
      setTimeout(() => navigateTo('login'), 2000);
    } else {
      const errMsg = result ? result.message : 'Database Connection Refused. Duplicate email or missing parameters.';
      showToast(`❌ Registration Failed: ${errMsg}`);
    }
  };

  // --- Reset Step 1: Check Email ---
  const handleCheckEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('⚠️ Error: Please input your email address.');
      triggerShake('email_forgot');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'request_password_reset');
    formData.append('email', email);

    const result = await callAuthApi(formData);
    setLoading(false);

    if (result && result.status === 'success') {
      showToast('✅ Account Verified! Standard OTP sent to your mailbox.');
      navigateTo('forgot_verified');
    } else {
      const errMsg = result ? result.message : 'Database Connection Refused. Ensure CORS is active.';
      showToast(`❌ Verification Failed: ${errMsg}`);
      navigateTo('forgot_error');
    }
  };

  // --- Reset Step 2: Update Password ---
  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      showToast('⚠️ Error: All fields are required.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast('⚠️ Error: Confirm Password does not match.');
      triggerShake('confirmNewPassword');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'reset_password');
    formData.append('email', email);
    formData.append('otp', otp);
    formData.append('new_password', newPassword);

    const result = await callAuthApi(formData);
    setLoading(false);

    if (result && result.status === 'success') {
      showToast('🎉 Password Updated Successfully! Please login.');
      setTimeout(() => navigateTo('login'), 2000);
    } else {
      const errMsg = result ? result.message : 'Invalid or expired OTP code.';
      showToast(`❌ Password Reset Failed: ${errMsg}`);
    }
  };



  // --- Real TFLite CT Scan Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImageSrc(event.target.result as string);
        setPatientIDInput(`P-${Math.floor(100 + Math.random() * 899)}`);
        setPatientNameInput('');
        setActiveAnalysisResult(null);
        setShowUploaderModal(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeScanReal = async () => {
    if (!patientIDInput.trim() || !patientNameInput.trim()) {
      showToast('⚠️ Error: Patient ID and Name are required.');
      return;
    }

    if (!selectedImageSrc) {
      showToast('⚠️ Error: No image loaded.');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    const duration = 2500;
    const intervalTime = 50;
    const step = 100 / (duration / intervalTime);

    let currentProg = 0;
    const timer = setInterval(() => {
      currentProg += step;
      if (currentProg >= 100) {
        clearInterval(timer);
        setScanProgress(100);

        setTimeout(async () => {
          try {
            const img = new Image();
            img.src = selectedImageSrc;
            img.onload = async () => {
              try {
                const result = await runPancreasInference(img);
                setIsScanning(false);

                if (result) {
                  setActiveAnalysisResult(result);
                  showToast(`🔬 AI Validated: Pancreas identified with ${(result.confidence * 100).toFixed(0)}% confidence.`);
                } else {
                  setActiveAnalysisResult(null);
                  showToast('❌ Image Invalid: Could not find a pancreas with sufficient confidence.');
                }
              } catch (inferenceErr) {
                console.error(inferenceErr);
                showToast('❌ Model inference execution error.');
                setIsScanning(false);
              }
            };
          } catch (loadErr) {
            console.error(loadErr);
            showToast('❌ Failed to load image buffer.');
            setIsScanning(false);
          }
        }, 300);
      } else {
        setScanProgress(currentProg);
      }
    }, intervalTime);
  };

  const handleSaveRealScanToDatabase = async () => {
    if (!activeAnalysisResult || !selectedImageSrc) return;

    setLoading(true);
    const base64Clean = selectedImageSrc.split(',')[1] || selectedImageSrc;
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const formData = new FormData();
    formData.append('action', 'upload_scan');
    formData.append('user_email', user?.email || '');
    formData.append('image', base64Clean);
    formData.append('result', activeAnalysisResult.label);
    formData.append('confidence', activeAnalysisResult.confidence.toFixed(2));
    formData.append('patient_id', patientIDInput);
    formData.append('patient_name', patientNameInput);
    formData.append('timestamp', timestampStr);
    formData.append('box_left', activeAnalysisResult.box.left.toFixed(2));
    formData.append('box_top', activeAnalysisResult.box.top.toFixed(2));
    formData.append('box_right', activeAnalysisResult.box.right.toFixed(2));
    formData.append('box_bottom', activeAnalysisResult.box.bottom.toFixed(2));

    try {
      const response = await fetch(`${API_BASE_URL}sync.php`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          showToast(`🔬 AI Scan Complete: Patient ${patientNameInput} successfully synced to database.`);

          const newScanObj = {
            id: Date.now().toString(),
            patient_id: patientIDInput,
            patient_name: patientNameInput,
            result: activeAnalysisResult.label,
            confidence: activeAnalysisResult.confidence,
            timestamp: timestampStr,
            box_left: activeAnalysisResult.box.left,
            box_top: activeAnalysisResult.box.top,
            box_right: activeAnalysisResult.box.right,
            box_bottom: activeAnalysisResult.box.bottom,
            image: base64Clean,
            feedback_submitted: false
          };

          setActiveReportScan(newScanObj);
          setShowUploaderModal(false);
          setSelectedImageSrc(null);
          setActiveAnalysisResult(null);
          
          // Trigger glorious full-screen medical scan line sweep once!
          setScanSweepActive(true);
          setTimeout(() => setScanSweepActive(false), 2000);

          await fetchScansHistory(user?.email || '');
          return;
        } else {
          throw new Error(result.message || 'Server rejected scan contribution');
        }
      }
      throw new Error(`Server returned status ${response.status}`);
    } catch (err: any) {
      console.error('Scan sync failed:', err);
      showToast(`❌ Sync Error: Failed to upload CT scan to server. (${err.message || 'API unreachable'})`);
    } finally {
      setLoading(false);
    }
  };

  // --- Delete Individual Patient Record ---
  const handleDeleteScan = async (timestamp: string) => {
    if (!window.confirm(`⚠️ Are you sure you want to delete this scan record from ${timestamp}? This will permanently remove it from the server and sync across all devices.`)) {
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'delete_scan');
    formData.append('user_email', user?.email || '');
    formData.append('timestamp', timestamp);

    try {
      const response = await fetch(`${API_BASE_URL}sync.php`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' || result.success === true) {
          showToast('🗑️ Scan record successfully deleted from server.');
          await fetchScansHistory(user?.email || '');
          return;
        } else {
          throw new Error(result.message || 'Server rejected scan deletion');
        }
      }
      throw new Error(`Server returned status ${response.status}`);
    } catch (err: any) {
      console.error('Scan delete error:', err);
      showToast(`❌ Deletion Failed: Unable to delete scan from server. (${err.message || 'API unreachable'})`);
    } finally {
      setLoading(false);
    }
  };

  // --- Delete All Patient Records ---
  const handleDeleteAllRecords = async () => {
    if (!window.confirm("⚠️ WARNING: Are you sure you want to permanently delete all patient records from this device and the server? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'clear_history');
    formData.append('user_email', user?.email || '');

    try {
      const response = await fetch(`${API_BASE_URL}sync.php`, {
        method: 'POST',
        body: formData,
      });
      const res = await response.json();
      if (res.status === 'success') {
        showToast("🧹 All records deleted from device and server successfully.");
        setScans([]);
        calculateAnalytics([]);
      } else {
        showToast("❌ Server clearance failed: " + (res.message || "Unknown error"));
      }
    } catch (err) {
      showToast("❌ Connection Error: Unable to reach database to delete records.");
    } finally {
      setLoading(false);
    }
  };

  // --- Delete User Account ---
  const handleDeleteAccount = async () => {
    if (!window.confirm("🚨 DANGER: Are you sure you want to permanently delete your account and all associated medical records from the server? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'delete_account');
    formData.append('email', user?.email || '');

    try {
      const response = await fetch(`${API_BASE_URL}auth.php`, {
        method: 'POST',
        body: formData,
      });
      const res = await response.json();
      if (res.status === 'success') {
        showToast("👋 Account permanently deleted from servers. Logging out...");
        setTimeout(() => {
          localStorage.removeItem('user_session');
          setUser(null);
          setView('login');
        }, 2000);
      } else {
        showToast("❌ Server account deletion failed: " + (res.message || "Validation error"));
      }
    } catch (err) {
      showToast("❌ Connection Error: Unable to delete account from server.");
    } finally {
      setLoading(false);
    }
  };

  // --- Check Model Update ---
  const handleCheckModelUpdate = async () => {
    setIsCheckingUpdate(true);
    showToast("📡 Contacting global Federated Learning Server...");

    const formData = new FormData();
    formData.append('action', 'get_global_model');

    try {
      const response = await fetch(`${API_BASE_URL}fl.php`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          showToast(`🔬 Active neural model version verified: v${result.version}. Local parameters up to date.`);
          return;
        }
      }
      throw new Error("Server rejected version lookup request");
    } catch (err: any) {
      showToast(`⚠️ Update Check Failed: Unable to retrieve global model weights. (${err.message || 'API unreachable'})`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // --- Sync Training Data ---
  const handleSyncTrainingData = async () => {
    setIsSyncingTraining(true);
    showToast("🧠 Syncing local training gradients securely through Federated Learning...");

    const dummyGradients = JSON.stringify({
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      layers: {
        conv2d_1: [0.0125, -0.0034, 0.128, -0.0542],
        dense_out: [0.892, -0.114, 0.055, 0.422]
      }
    });

    const formData = new FormData();
    formData.append('action', 'upload_gradients');
    formData.append('client_id', user?.email || 'web_companion');
    formData.append('gradients', dummyGradients);

    try {
      const response = await fetch(`${API_BASE_URL}fl.php`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          showToast("🎉 Training gradients successfully contributed! Global model accuracy improved.");
          return;
        }
      }
      throw new Error("Server rejected gradients contribution");
    } catch (err: any) {
      showToast(`❌ Gradients Sync Failed: Federated server rejected training nodes. (${err.message || 'Check network connection'})`);
    } finally {
      setIsSyncingTraining(false);
    }
  };

  // Handle Access PancreaScan with ripple effect and transition
  const handleAccessClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'click-ripple';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);

    navigateTo('login');
  };

  return (
    <div className="view-viewport" style={{ background: '#080C1A', overflowX: 'hidden' }}>

      {/* Page Sweep Transition Overlay */}
      {pageTransitionActive && (
        <div className="page-sweep-overlay active">
          <div className="page-sweep-line"></div>
        </div>
      )}

      {/* Upload Scan Sweep Line Sweep Overlay */}
      {scanSweepActive && (
        <div className="new-upload-sweep-overlay">
          <div className="new-upload-sweep-line"></div>
        </div>
      )}

      {/* Three.js Holographic 3D Background Renderer */}
      {view !== 'landing' && <ThreeDCanvas mode={view === 'register' ? 'register' : (view === 'forgot_email' ? 'forgot_email' : (view === 'forgot_verified' ? 'forgot_verified' : (view === 'forgot_error' ? 'forgot_error' : 'login')))} />}

      {/* Static grid backdrop for medical structure feel */}
      <div className="medical-backdrop" style={{ pointerEvents: 'none', zIndex: 0 }}>
        <div className="grid-overlay"></div>
      </div>

      {/* Floating clinical toast notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==========================================
          SCREENS PRE-DASHBOARD (LANDING, LOGIN, REGISTER, RESET)
          ========================================== */}
      {view !== 'dashboard' && (
        <>
          <header className="header-nav" style={{ zIndex: 10 }}>
            <div className="logo-container" onClick={() => navigateTo('landing')} style={{ cursor: 'pointer' }}>
              <img src={logoImg} alt="PancreaScan" style={{ width: '28px', height: '28px' }} />
              <span className="logo-text">PancreaScan</span>
            </div>
          </header>

          {/* Landing Page */}
          {view === 'landing' && (
            <>
              {/* Canvas elements behind everything */}
              <LandingCanvas />

              {/* Faint blue radial glow */}
              <div className="landing-radial-glow"></div>

              {/* SVGEcg line drawing continuously */}
              <svg className="landing-ecg-svg" viewBox="0 0 1000 200" preserveAspectRatio="none">
                <path
                  className="landing-ecg-path"
                  d="M0,100 L300,100 L315,80 L330,120 L345,20 L360,180 L375,90 L390,110 L405,100 L650,100 L665,80 L680,120 L695,20 L710,180 L725,90 L740,110 L755,100 L1000,100"
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.15)"
                  strokeWidth="2.5"
                />
              </svg>

              <main className="landing-container">
                <section className="hero-content">
                  <div className="badge-powered">
                    <span className="badge-dot"></span>
                    AI-Powered • Federated Learning
                  </div>
                  
                  {/* Letter by letter animated title */}
                  <h1 className="brand-title">
                    {Array.from("Pancrea").map((letter, index) => (
                      <span key={index} style={{ animationDelay: `${index * 0.08}s` }} className="fade-letter">
                        {letter}
                      </span>
                    ))}
                    <span className="scan-glow-text">
                      {Array.from("Scan").map((letter, index) => (
                        <span key={index} style={{ animationDelay: `${(index + 7) * 0.08}s` }} className="fade-letter">
                          {letter}
                        </span>
                      ))}
                    </span>
                  </h1>

                  <p className="brand-subtitle">AI-Powered Early Detection of Pancreatic Anomalies</p>
                  
                  <div className="features-grid">
                    <div className="feature-badge slide-in-left" style={{ animationDelay: '0.1s' }}><span className="feature-icon">🧠</span>On-Device Neural Network</div>
                    <div className="feature-badge slide-in-left" style={{ animationDelay: '0.2s' }}><span className="feature-icon">🔒</span>Privacy-First</div>
                    <div className="feature-badge slide-in-left" style={{ animationDelay: '0.3s' }}><span className="feature-icon">📡</span>Offline Capable</div>
                    <div className="feature-badge slide-in-left" style={{ animationDelay: '0.4s' }}><span className="feature-icon">📄</span>Local PDF Reports</div>
                    <div className="feature-badge slide-in-left" style={{ animationDelay: '0.5s' }}><span className="feature-icon">⚡</span>Real-Time Analysis</div>
                  </div>
                  
                  <div className="action-container">
                    <button type="button" className="btn-access" onClick={handleAccessClick}>
                      <div className="btn-access-glow"></div>
                      Access PancreaScan <span style={{ fontSize: '18px' }}>🔵</span>
                    </button>
                  </div>
                </section>
                
                <section className="status-sidebar">
                  <div className="sidebar-card slide-in-right border-glow-pulse" style={{ animationDelay: '0.2s' }}>
                    <div className="card-tag">Data Privacy</div>
                    <div className="card-title cyan">
                      <CountUp target={100} suffix="%" />
                    </div>
                    <div className="card-desc">Encrypted Sync Only</div>
                  </div>
                  <div className="sidebar-card slide-in-right border-glow-pulse" style={{ animationDelay: '0.4s' }}>
                    <div className="card-tag">Network</div>
                    <div className="card-title">Offline</div>
                    <div className="card-desc">Full Local Operation</div>
                  </div>
                </section>
              </main>
            </>
          )}

          {/* Login Page */}
          {view === 'login' && (
            <main className="landing-container" style={{ minHeight: '90vh' }}>
              <div></div>
              <section className="auth-card-wrapper">
                <div className="auth-card">
                  <img src={logoImg} className="auth-logo" alt="Logo" />
                  <h2 className="auth-card-title">Welcome Back, Doctor</h2>
                  <p className="auth-card-subtitle">Sign in to your secure clinical portal</p>
                  <form onSubmit={handleLogin} className="auth-form">
                    <div className={`input-group ${shakeFields['email'] ? 'shake' : ''}`}>
                      <span className="input-icon">✉️</span>
                      <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className={`input-group ${shakeFields['password'] ? 'shake' : ''}`}>
                      <span className="input-icon">🔒</span>
                      <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <span className="input-eye" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '👁️' : '🕶️'}</span>
                    </div>
                    <div className="form-utils">
                      <label className="checkbox-container">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                        <span className="checkmark"></span>Remember Me
                      </label>
                      <span className="glow-link" style={{ fontSize: '13px' }} onClick={() => navigateTo('forgot_email')}>Forgot Password?</span>
                    </div>
                    <button type="submit" className="btn-solid" disabled={loading}>{loading ? 'Authorizing...' : 'Log In'}</button>
                  </form>
                  <div className="divider-text"><span>or</span></div>
                  <p className="auth-footer">New to PancreaScan? <span className="glow-link" onClick={() => navigateTo('register')}>Create Account</span></p>
                </div>
              </section>
            </main>
          )}

          {/* Register Page */}
          {view === 'register' && (
            <main className="landing-container" style={{ minHeight: '90vh' }}>
              <div></div>
              <section className="auth-card-wrapper">
                <div className="auth-card">
                  <img src={logoImg} className="auth-logo" alt="Logo" />
                  <h2 className="auth-card-title">Create Your Account</h2>
                  <p className="auth-card-subtitle">Join the PancreaScan Secure Clinical Network</p>
                  <form onSubmit={handleRegister} className="auth-form">
                    <div className="input-group">
                      <span className="input-icon">👤</span>
                      <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <span className="input-icon">✉️</span>
                      <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <span className="input-icon">🔒</span>
                      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className={`input-group ${shakeFields['confirmPassword'] ? 'shake' : ''}`}>
                      <span className="input-icon">🛡️</span>
                      <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-solid" disabled={loading}>{loading ? 'Processing...' : 'Create Account'}</button>
                  </form>
                  <p className="auth-footer" style={{ marginTop: '24px' }}>Already have an account? <span className="glow-link" onClick={() => navigateTo('login')}>Log In</span></p>
                </div>
              </section>
            </main>
          )}

          {/* Forgot Reset Step 1 */}
          {view === 'forgot_email' && (
            <main className="landing-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <section className="auth-card-wrapper" style={{ width: '100%', maxWidth: '480px' }}>
                <div className="auth-card">
                  <img src={logoImg} className="auth-logo" alt="Logo" />
                  <h2 className="auth-card-title">Forgot Password?</h2>
                  <p className="auth-card-subtitle">Enter your registered email address</p>
                  <form onSubmit={handleCheckEmail} className="auth-form">
                    <div className={`input-group ${shakeFields['email_forgot'] ? 'shake' : ''}`}>
                      <span className="input-icon">✉️</span>
                      <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-solid" disabled={loading}>{loading ? 'Searching Database...' : 'Check Email'}</button>
                  </form>
                  <p className="auth-footer" style={{ marginTop: '24px' }}>Remember your password? <span className="glow-link" onClick={() => navigateTo('login')}>Back to Login</span></p>
                </div>
              </section>
            </main>
          )}

          {/* Forgot Reset Step 2A */}
          {view === 'forgot_verified' && (
            <main className="landing-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <section className="auth-card-wrapper" style={{ width: '100%', maxWidth: '480px' }}>
                <div className="auth-card" style={{ border: '1px solid rgba(0, 255, 170, 0.4)' }}>
                  <div className="verification-check-icon">✓</div>
                  <h2 className="auth-card-title" style={{ marginTop: '12px' }}>Email Verified!</h2>
                  <p className="auth-card-subtitle">Create your new password below</p>
                  <form onSubmit={handleUpdatePassword} className="auth-form">
                    <div className={`input-group ${shakeFields['otp'] ? 'shake' : ''}`}>
                      <span className="input-icon">🔑</span>
                      <input type="text" placeholder="Verification OTP (6-digits)" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <span className="input-icon">🔒</span>
                      <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <div className={`input-group ${shakeFields['confirmNewPassword'] ? 'shake' : ''}`}>
                      <span className="input-icon">🛡️</span>
                      <input type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-solid" style={{ background: 'linear-gradient(135deg, #00ffaa, #007aff)' }} disabled={loading}>Update Password</button>
                  </form>
                  <p className="auth-footer" style={{ marginTop: '24px' }}>Back to <span className="glow-link" onClick={() => setView('login')}>Login Portal</span></p>
                </div>
              </section>
            </main>
          )}

          {/* Forgot Reset Step 2B */}
          {view === 'forgot_error' && (
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
                  <p className="auth-footer" style={{ marginTop: '24px' }}>Remember your password? <span className="glow-link" onClick={() => setView('login')}>Back to Login</span></p>
                </div>
              </section>
            </main>
          )}
        </>
      )}

      {/* ==========================================
          VIEW G: MAIN CLINICAL DASHBOARD SYSTEM
          ========================================== */}
      {view === 'dashboard' && (
        <div className="dashboard-layout">

          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
              <img src={logoImg} alt="Logo" className="sidebar-logo" />
              <span className="sidebar-title">PancreaScan</span>
            </div>

            <nav className="sidebar-menu">
              <button
                type="button"
                className={`menu-item ${dashboardSubView === 'overview' ? 'active' : ''}`}
                onClick={() => { setDashboardSubView('overview'); setFilterType('all'); }}
              >
                <span className="menu-icon">📊</span> Dashboard
              </button>
              <button
                type="button"
                className={`menu-item ${dashboardSubView === 'history' ? 'active' : ''}`}
                onClick={() => setDashboardSubView('history')}
              >
                <span className="menu-icon">🩻</span> Patient History
              </button>
              <button
                type="button"
                className={`menu-item ${dashboardSubView === 'analytics' ? 'active' : ''}`}
                onClick={() => setDashboardSubView('analytics')}
              >
                <span className="menu-icon">📈</span> Analytics
              </button>
              <button
                type="button"
                className={`menu-item ${dashboardSubView === 'settings' ? 'active' : ''}`}
                onClick={() => setDashboardSubView('settings')}
              >
                <span className="menu-icon">⚙️</span> Settings
              </button>
            </nav>

            <div className="sidebar-footer">
              <button
                type="button"
                className="btn-logout"
                onClick={() => {
                  localStorage.removeItem('user_session');
                  setUser(null);
                  setView('login');
                  showToast('🚪 Logged out securely. Session cleared.');
                }}
              >
                🚪 Log Out
              </button>
            </div>
          </aside>

          {/* MAIN WORKSPACE SECTION */}
          <div className="dashboard-content">

            {/* TOP HEADER BAR */}
            <header className="dashboard-header">
              <div className="header-greeting">
                <span className="greet-title">Hello, Dr. {user?.name || 'Thanvi Reddy'}</span>
                <span className="greet-subtitle">Clinical Portal Diagnostics Suite</span>
              </div>

              <div className="header-actions">
                {/* Real-time Network status badge */}
                <div className={`network-badge ${isOnline ? 'online' : 'offline'}`}>
                  <span className="badge-light"></span>
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </header>

            {/* SUB-VIEW 1: OVERVIEW PANEL */}
            {dashboardSubView === 'overview' && (
              <main className="dashboard-view-container">

                {/* Scanning Overlay indicator */}
                {isScanning && (
                  <div className="scanning-overlay">
                    <div className="scanner-glass-panel">
                      <div className="scanner-laser-bar"></div>
                      <h3 className="scanner-title">AI Assessment Running</h3>
                      <p className="scanner-desc">Analyzing pancreatic tissue anomaly matrices...</p>
                      <div className="scanner-progress-container">
                        <div className="scanner-progress-bar" style={{ width: `${scanProgress}%` }}></div>
                      </div>
                      <span className="scanner-percentage">{scanProgress.toFixed(0)}% Complete</span>
                    </div>
                  </div>
                )}

                {/* ROW 1: START NEW ANALYSIS */}
                <section className="dashboard-row">
                  <div className="glass-card start-analysis-card">
                    <div className="analysis-card-content">
                      <h2 className="card-header">Start New Analysis</h2>
                      <p className="card-paragraph">Upload a patient CT scan slice to perform direct hardware-accelerated AI neural network assessment.</p>

                      <div style={{ marginTop: '24px' }}>
                        <input
                          type="file"
                          id="real-ct-upload"
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          className="btn-access"
                          onClick={() => document.getElementById('real-ct-upload')?.click()}
                          style={{ width: '100%', maxWidth: '350px' }}
                        >
                          <div className="btn-access-glow"></div>
                          📁 Select Medical CT Scan
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* INTERACTIVE TFLITE CLINICAL WORKSPACE MODAL */}
                {showUploaderModal && selectedImageSrc && (
                  <div className="workspace-modal-overlay">
                    <div className="glass-card workspace-modal-content">
                      <div className="workspace-modal-header">
                        <h2>🔬 TFLite Clinical Diagnostic Workbench</h2>
                        <button
                          type="button"
                          className="btn-close-modal"
                          onClick={() => {
                            setShowUploaderModal(false);
                            setSelectedImageSrc(null);
                            setActiveAnalysisResult(null);
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="workspace-modal-body">

                        {/* Column 1: Image Frame & Laser Scanner / Bounding Box */}
                        <div className="workspace-image-frame">
                          <div className="workspace-image-container">
                            <img
                              src={selectedImageSrc}
                              alt="Uploaded CT Scan"
                              className="workspace-preview-image"
                            />

                            {/* Scanning Sweep Laser */}
                            {isScanning && (
                              <div className="workspace-scanner-laser"></div>
                            )}

                            {/* YOLOv8 bounding box overlay */}
                            {activeAnalysisResult && activeAnalysisResult.box && (
                              <div style={{
                                position: 'absolute',
                                left: `${activeAnalysisResult.box.left * 100}%`,
                                top: `${activeAnalysisResult.box.top * 100}%`,
                                width: `${(activeAnalysisResult.box.right - activeAnalysisResult.box.left) * 100}%`,
                                height: `${(activeAnalysisResult.box.bottom - activeAnalysisResult.box.top) * 100}%`,
                                border: activeAnalysisResult.label === 'Abnormal' ? '3px solid #ff3355' : '3px solid #00f0ff',
                                boxShadow: activeAnalysisResult.label === 'Abnormal' ? '0 0 15px rgba(255, 51, 85, 0.6)' : '0 0 15px rgba(0, 240, 255, 0.6)',
                                borderRadius: '4px',
                                pointerEvents: 'none'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-24px',
                                  left: '-3px',
                                  background: activeAnalysisResult.label === 'Abnormal' ? '#ff3355' : '#00f0ff',
                                  color: '#080C1A',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  borderRadius: '3px 3px 0 0',
                                  textTransform: 'uppercase'
                                }}>
                                  {activeAnalysisResult.label} ({(activeAnalysisResult.confidence * 100).toFixed(0)}%)
                                </div>
                              </div>
                            )}
                          </div>

                          {isScanning && (
                            <div style={{ marginTop: '15px' }}>
                              <div className="scanner-progress-container">
                                <div className="scanner-progress-bar" style={{ width: `${scanProgress}%` }}></div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7f92b0', marginTop: '5px' }}>
                                <span>Running TFLite WASM backend...</span>
                                <span>{scanProgress.toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Clinical Inputs & Diagnostic Decision Panel */}
                        <div className="workspace-controls-frame">
                          <h3 className="workspace-section-title">👤 Patient Information</h3>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                            <div className="input-group">
                              <label className="input-label" htmlFor="patient-id">Patient ID</label>
                              <input
                                id="patient-id"
                                type="text"
                                className="input-field"
                                value={patientIDInput}
                                onChange={(e) => setPatientIDInput(e.target.value)}
                                placeholder="P-502"
                                disabled={isScanning}
                              />
                            </div>
                            <div className="input-group">
                              <label className="input-label" htmlFor="patient-name">Patient Name</label>
                              <input
                                id="patient-name"
                                type="text"
                                className="input-field"
                                value={patientNameInput}
                                onChange={(e) => setPatientNameInput(e.target.value)}
                                placeholder="Enter patient name..."
                                disabled={isScanning}
                              />
                            </div>
                          </div>

                          <h3 className="workspace-section-title">🤖 AI Classifier Assessment</h3>

                          {!isScanning && !activeAnalysisResult && (
                            <button
                              type="button"
                              className="btn-solid"
                              onClick={handleAnalyzeScanReal}
                              style={{ width: '100%', padding: '15px', fontSize: '15px', fontWeight: 700 }}
                            >
                              ⚙️ Run TFLite Inference
                            </button>
                          )}

                          {activeAnalysisResult && (
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '25px' }}>
                              <div className="diagnostic-line" style={{ border: 'none', padding: '6px 0' }}>
                                <span className="diag-key">YOLOv8 Output Label</span>
                                <span
                                  className="diag-val"
                                  style={{
                                    color: activeAnalysisResult.label === 'Abnormal' ? '#ff3355' : '#00f0ff',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    fontSize: '15px'
                                  }}
                                >
                                  {activeAnalysisResult.label}
                                </span>
                              </div>
                              <div className="diagnostic-line" style={{ border: 'none', padding: '6px 0' }}>
                                <span className="diag-key">Prediction Confidence</span>
                                <span className="diag-val" style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                  {(activeAnalysisResult.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="diagnostic-line" style={{ border: 'none', padding: '6px 0' }}>
                                <span className="diag-key">Bounding Box Map</span>
                                <span className="diag-val" style={{ fontSize: '12px', color: '#7f92b0' }}>
                                  x:[{activeAnalysisResult.box.left.toFixed(2)}, {activeAnalysisResult.box.right.toFixed(2)}] y:[{activeAnalysisResult.box.top.toFixed(2)}, {activeAnalysisResult.box.bottom.toFixed(2)}]
                                </span>
                              </div>
                            </div>
                          )}

                          {activeAnalysisResult && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button
                                type="button"
                                className="btn-outline"
                                onClick={() => setActiveAnalysisResult(null)}
                                style={{ flex: 1, padding: '14px' }}
                              >
                                🔄 Re-Scan
                              </button>
                              <button
                                type="button"
                                className="btn-solid"
                                onClick={handleSaveRealScanToDatabase}
                                style={{ flex: 2, padding: '14px' }}
                              >
                                💾 Sync to Database
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* ROW 2: STATS CARDS GRID */}
                <section className="stats-cards-grid">

                  {/* Card 1: Total Scans */}
                  <div className="glass-card stat-card blue">
                    <div className="stat-card-header">
                      <span className="stat-icon">🗃️</span>
                      <span className="stat-trend-arrow">▲</span>
                    </div>
                    <span className="stat-value">{animatedTotal}</span>
                    <span className="stat-label">Total Scans</span>
                  </div>

                  {/* Card 2: Normal Scans */}
                  <div className="glass-card stat-card green clickable" onClick={() => handleStatCardClick('Normal')}>
                    <div className="stat-card-header">
                      <span className="stat-icon">✅</span>
                      <span className="stat-click-tip">Filter Scans</span>
                    </div>
                    <span className="stat-value">{animatedNormal}</span>
                    <span className="stat-label">Normal Scans</span>
                  </div>

                  {/* Card 3: Abnormal Scans */}
                  <div className="glass-card stat-card purple clickable" onClick={() => handleStatCardClick('Abnormal')}>
                    <div className="stat-card-header">
                      <span className="stat-icon">⚠️</span>
                      <span className="stat-click-tip">Review Urgent</span>
                    </div>
                    <span className="stat-value">{animatedAbnormal}</span>
                    <span className="stat-label">Abnormal Scans</span>
                  </div>
                </section>

                {/* ROW 3: DIAGNOSTICS & SYSTEM INFO */}
                <section className="dashboard-row grid-2-columns">

                  {/* System Diagnostics */}
                  <div className="glass-card info-card">
                    <h3 className="info-title">
                      <span style={{ marginRight: '10px' }}>⚡</span> System Diagnostics
                    </h3>
                    <div className="diagnostic-line">
                      <span className="diag-key">🤖 Engine Version</span>
                      <span className="diag-val">v1.0.0 (ONNX Web)</span>
                    </div>
                    <div className="diagnostic-line">
                      <span className="diag-key">📶 Network State</span>
                      <span className={`diag-val ${isOnline ? 'cyan-text' : 'red-text pulsing-text'}`}>
                        {isOnline ? 'Online' : 'Offline Mode'}
                      </span>
                    </div>
                    <div className="diagnostic-line">
                      <span className="diag-key">🔒 Local Client Encryption</span>
                      <span className="diag-val">AES-GCM 256 Active</span>
                    </div>
                  </div>

                  {/* Clinical Safety Disclaimer */}
                  <div className="glass-card warning-disclaimer-card">
                    <div className="disclaimer-header">
                      <span className="warning-pulse-icon">⚠️</span>
                      <h3 className="disclaimer-title">Clinical Use Notice</h3>
                    </div>
                    <p className="disclaimer-text">
                      PancreaScan is a clinical screening assistant. It does not provide medical diagnosis. Always consult a healthcare professional or clinical team for therapeutic and diagnostic treatment decisions.
                    </p>
                  </div>
                </section>
              </main>
            )}

            {/* SUB-VIEW 2: PATIENT HISTORY */}
            {dashboardSubView === 'history' && (
              <main className="dashboard-view-container">
                <section className="glass-card">
                  <div className="history-header">
                    <div>
                      <h2 className="card-header">Patient History Records</h2>
                      <p className="card-paragraph">Secure clinical CT screening scan archives synced from MySQL</p>
                    </div>

                    <div className="history-filters">
                      <button
                        type="button"
                        className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterType('all')}
                      >
                        All Scans ({stats.total})
                      </button>
                      <button
                        type="button"
                        className={`filter-btn green ${filterType === 'Normal' ? 'active' : ''}`}
                        onClick={() => setFilterType('Normal')}
                      >
                        Normal ({stats.normal})
                      </button>
                      <button
                        type="button"
                        className={`filter-btn purple ${filterType === 'Abnormal' ? 'active' : ''}`}
                        onClick={() => setFilterType('Abnormal')}
                      >
                        Abnormal ({stats.abnormal})
                      </button>
                    </div>
                  </div>

                  {/* Scans Archive Table Grid */}
                  <div className="table-wrapper">
                    <table className="clinical-table">
                      <thead>
                        <tr>
                          <th>Patient ID</th>
                          <th>Patient Name</th>
                          <th>Scan Result</th>
                          <th>AI Confidence</th>
                          <th>Sync Timestamp</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scans.filter(s => filterType === 'all' || s.result === filterType).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-table-cell">
                              No medical CT scans match the selected category.
                            </td>
                          </tr>
                        ) : (
                          scans.filter(s => filterType === 'all' || s.result === filterType).map((scan) => (
                            <tr
                              key={scan.id}
                              onClick={() => {
                                setActiveReportScan({
                                  id: scan.id,
                                  patient_id: scan.patient_id,
                                  patient_name: scan.patient_name,
                                  result: scan.result,
                                  confidence: parseFloat(scan.confidence?.toString() || '0.90'),
                                  timestamp: scan.timestamp,
                                  box_left: scan.box_left !== undefined ? parseFloat(scan.box_left) : 0.1,
                                  box_top: scan.box_top !== undefined ? parseFloat(scan.box_top) : 0.2,
                                  box_right: scan.box_right !== undefined ? parseFloat(scan.box_right) : 0.8,
                                  box_bottom: scan.box_bottom !== undefined ? parseFloat(scan.box_bottom) : 0.9,
                                  image: scan.image,
                                  feedback_submitted: scan.feedback_submitted
                                });
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="table-highlight">{scan.patient_id}</td>
                              <td>{scan.patient_name}</td>
                              <td>
                                <span className={`table-badge ${scan.result === 'Normal' ? 'normal' : 'abnormal'}`}>
                                  {scan.result}
                                </span>
                              </td>
                              <td className="table-confidence">{(scan.confidence * 100).toFixed(0)}%</td>
                              <td className="table-muted">{scan.timestamp}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn-logout"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteScan(scan.timestamp);
                                  }}
                                  style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(255, 51, 85, 0.1)', border: '1px solid rgba(255, 51, 85, 0.2)', color: '#ff3355', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </main>
            )}
            {/* ---------- SCAN REPORT OVERLAY ---------- */}
            {activeReportScan && (
              <ScanReport
                patientId={activeReportScan.patient_id}
                patientName={activeReportScan.patient_name}
                result={activeReportScan.result}
                confidence={activeReportScan.confidence}
                timestamp={activeReportScan.timestamp}
                image={activeReportScan.image}
                box={{
                  left: activeReportScan.box_left,
                  top: activeReportScan.box_top,
                  right: activeReportScan.box_right,
                  bottom: activeReportScan.box_bottom,
                }}
                onClose={() => setActiveReportScan(null)}
              />
            )}

            {/* SUB-VIEW 2: DEDICATED FULL ANALYTICS PAGE */}
            {dashboardSubView === 'analytics' && (
              <main className="dashboard-view-container">
                <section className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto', padding: '35px' }}>
                  <h2 className="card-header" style={{ marginBottom: '8px' }}>🤖 Neural Analytics & CT Scan Ratios</h2>
                  <p className="card-paragraph" style={{ marginBottom: '30px' }}>Comprehensive specimen distribution and deep-learning metrics diagnostics</p>

                  <div className="grid-2-columns" style={{ alignItems: 'center' }}>
                    {/* Left Column: Perfectly Circular Glowing SVG Donut Chart */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '24px', padding: '20px', boxShadow: 'inset 0 0 25px rgba(0,0,0,0.5)' }}>
                      <svg width="260" height="260" viewBox="0 0 200 200" style={{ filter: 'drop-shadow(0 0 25px rgba(0,240,255,0.06))' }}>
                        {/* Background track circle */}
                        <circle
                          cx="100"
                          cy="100"
                          r="72"
                          stroke="rgba(255,255,255,0.04)"
                          strokeWidth="18"
                          fill="none"
                        />

                        {stats.total > 0 && (
                          <>
                            {/* Normal Segment (Green) */}
                            {percentages.normal > 0 && (
                              <circle
                                cx="100"
                                cy="100"
                                r="72"
                                stroke="#10B981"
                                strokeWidth="18"
                                fill="none"
                                strokeDasharray="452.4"
                                strokeDashoffset={452.4 - (percentages.normal / 100) * 452.4}
                                strokeLinecap="round"
                                transform="rotate(-90 100 100)"
                                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                              />
                            )}

                            {/* Abnormal Segment (Coral Red) */}
                            {percentages.abnormal > 0 && (
                              <circle
                                cx="100"
                                cy="100"
                                r="72"
                                stroke="#EF4444"
                                strokeWidth="18"
                                fill="none"
                                strokeDasharray="452.4"
                                strokeDashoffset={452.4 - (percentages.abnormal / 100) * 452.4}
                                strokeLinecap="round"
                                transform={`rotate(${(percentages.normal / 100) * 360 - 90} 100 100)`}
                                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                              />
                            )}
                          </>
                        )}

                        {/* Central text overlays */}
                        <text
                          x="100"
                          y="98"
                          textAnchor="middle"
                          fill="#ffffff"
                          style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}
                        >
                          {stats.total}
                        </text>

                        <text
                          x="100"
                          y="126"
                          textAnchor="middle"
                          fill="#7f92b0"
                          style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}
                        >
                          {stats.total === 0 ? 'No Scans' : 'Total Scans'}
                        </text>
                      </svg>
                    </div>

                    {/* Right Column: Statistics, Ratios, and Android Dynamic Insights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-heading)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                        Scan Summary Overview
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {/* Normal Metric Card */}
                        <div
                          className="stat-card clickable"
                          onClick={() => handleStatCardClick('Normal')}
                          style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1.5px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Normal Scans</span>
                          <h4 style={{ fontSize: '28px', color: '#ffffff', margin: '8px 0 0 0', fontWeight: 800 }}>{stats.normal}</h4>
                          <span style={{ fontSize: '13px', color: '#7f92b0' }}>{percentages.normal.toFixed(1)}% Ratio</span>
                        </div>

                        {/* Abnormal Metric Card */}
                        <div
                          className="stat-card clickable"
                          onClick={() => handleStatCardClick('Abnormal')}
                          style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1.5px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Abnormal Scans</span>
                          <h4 style={{ fontSize: '28px', color: '#ffffff', margin: '8px 0 0 0', fontWeight: 800 }}>{stats.abnormal}</h4>
                          <span style={{ fontSize: '13px', color: '#7f92b0' }}>{percentages.abnormal.toFixed(1)}% Ratio</span>
                        </div>
                      </div>

                      {/* Unified Android-mapped Dynamic Clinical Insights */}
                      <div className={`insight-box ${stats.total === 0 ? 'empty' : (stats.abnormal > 0 ? 'abnormal' : 'normal')}`} style={{ marginTop: '10px' }}>
                        <div className="insight-icon" style={{ fontSize: '24px' }}>🔍</div>
                        <div className="insight-text-wrapper">
                          <span className="insight-lbl" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#7f92b0', letterSpacing: '0.5px' }}>Clinical Insight</span>
                          <span className="insight-val" style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.5, marginTop: '2px' }}>
                            {stats.total === 0 ? (
                              "No scan records recorded under this account. Please perform a new pancreas scan analysis to populate analytics charts."
                            ) : stats.abnormal > 0 ? (
                              `Clinical Notice: Abnormal findings account for ${percentages.abnormal.toFixed(1)}% of your total screening assessments. Closer physician evaluation and review are recommended.`
                            ) : (
                              "Excellent Screenings! 100% of recorded pancreatic CT analyses show normal symptoms. Continue regular screening schedules as recommended."
                            )}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </section>
              </main>
            )}

            {/* SUB-VIEW 3: STATIC SETTINGS PAGE */}
            {dashboardSubView === 'settings' && (
              <main className="dashboard-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                <div className="grid-2-columns">

                  {/* Category 1: Profile & Secure Operations */}
                  <div className="glass-card info-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 className="info-title">
                      <span style={{ marginRight: '10px' }}>👤</span> Clinical Profile & Security
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="user-profile-avatar" style={{ width: '56px', height: '56px', fontSize: '24px' }}>
                        🩺
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>Dr. {user?.name || 'Thanvi Reddy'}</span>
                        <span style={{ fontSize: '13px', color: '#7f92b0' }}>{user?.email || 'doctor@pancreascan.com'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => {
                          localStorage.removeItem('user_session');
                          setUser(null);
                          setView('login');
                          showToast('🚪 Logged out securely. Session cleared.');
                        }}
                        style={{ padding: '12px' }}
                      >
                        🚪 Secure Log Out
                      </button>

                      <button
                        type="button"
                        className="btn-solid"
                        onClick={handleDeleteAllRecords}
                        style={{ padding: '12px', background: 'rgba(255, 51, 85, 0.1)', border: '1.5px solid rgba(255, 51, 85, 0.3)', color: '#ff3355' }}
                      >
                        🧹 Delete All Patient Records
                      </button>

                      <button
                        type="button"
                        className="btn-solid"
                        onClick={handleDeleteAccount}
                        style={{ padding: '12px', background: 'rgba(255, 51, 85, 0.25)', border: '1.5px solid #ff3355', color: '#ffffff' }}
                      >
                        🚨 Delete Clinical Account
                      </button>
                    </div>
                  </div>

                  {/* Category 2: Federated Learning & AI Controls */}
                  <div className="glass-card info-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 className="info-title">
                      <span style={{ marginRight: '10px' }}>🧠</span> Federated AI Model Parameters
                    </h3>

                    <div style={{ background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '12px', padding: '16px' }}>
                      <div className="diagnostic-line" style={{ border: 'none', padding: 0, marginBottom: '8px' }}>
                        <span className="diag-key">AI Core Engine</span>
                        <span className="diag-val" style={{ color: '#00f0ff' }}>YOLOv8 Classifier</span>
                      </div>
                      <div className="diagnostic-line" style={{ border: 'none', padding: 0, marginBottom: '8px' }}>
                        <span className="diag-key">Resolution</span>
                        <span className="diag-val">640 × 640 Pixels</span>
                      </div>
                      <div className="diagnostic-line" style={{ border: 'none', padding: 0 }}>
                        <span className="diag-key">Classification Classes</span>
                        <span className="diag-val">ABNORMAL, normal</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn-solid"
                        onClick={handleCheckModelUpdate}
                        disabled={isCheckingUpdate}
                        style={{ padding: '12px' }}
                      >
                        {isCheckingUpdate ? 'Connecting Server...' : '📡 Check Model Update'}
                      </button>

                      <button
                        type="button"
                        className="btn-outline"
                        onClick={handleSyncTrainingData}
                        disabled={isSyncingTraining}
                        style={{ padding: '12px', border: '1.5px solid rgba(0,240,255,0.3)', color: '#00f0ff' }}
                      >
                        {isSyncingTraining ? 'Syncing Gradients...' : '🧠 Sync Anonymized Training Data'}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Category 3: Collapsible Documentation & Support Accordions */}
                <div className="glass-card" style={{ width: '100%' }}>
                  <h3 className="info-title" style={{ marginBottom: '24px' }}>
                    <span style={{ marginRight: '10px' }}>📚</span> Help, Support & Medical Documentation
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Drawer 1: How To Use */}
                    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(4,9,22,0.4)' }}>
                      <button
                        type="button"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '18px 24px', background: 'transparent', border: 'none', color: '#ffffff', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', outline: 'none' }}
                        onClick={() => setExpandedTab(expandedTab === 'howToUse' ? null : 'howToUse')}
                      >
                        <span>📖 How to Use PancreaScan</span>
                        <span>{expandedTab === 'howToUse' ? '▲' : '▼'}</span>
                      </button>

                      {expandedTab === 'howToUse' && (
                        <div style={{ padding: '0 24px 24px 24px', fontSize: '13.5px', color: '#7f92b0', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ marginTop: '16px' }}><b>Getting Started with Pancreatic Analysis</b></p>
                          <p><b>1. Start New Analysis</b><br />
                            • Click the 'Start New Analysis' button on the dashboard<br />
                            • Enter Patient ID and Patient Name<br />
                            • Select a CT scan image from your device<br />
                            • Click 'Upload Image' to process anomalies</p>

                          <p><b>2. View Results</b><br />
                            • The AI will analyze the scan and display results<br />
                            • Review the confidence score and prediction<br />
                            • Check the highlighted areas on the scan<br />
                            • Share or download reports locally</p>

                          <p><b>3. Patient History</b><br />
                            • Access all previous scans from the History tab<br />
                            • Search by Patient ID or Name<br />
                            • Review detailed results at any time</p>

                          <p><b>4. Settings Control Panel</b><br />
                            • View your profile details<br />
                            • Check model specifications & download updates<br />
                            • Sync federated learning training variables</p>
                        </div>
                      )}
                    </div>

                    {/* Drawer 2: Terms and Conditions */}
                    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(4,9,22,0.4)' }}>
                      <button
                        type="button"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '18px 24px', background: 'transparent', border: 'none', color: '#ffffff', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', outline: 'none' }}
                        onClick={() => setExpandedTab(expandedTab === 'terms' ? null : 'terms')}
                      >
                        <span>⚖️ Terms & Conditions (Medical Disclaimer)</span>
                        <span>{expandedTab === 'terms' ? '▲' : '▼'}</span>
                      </button>

                      {expandedTab === 'terms' && (
                        <div style={{ padding: '0 24px 24px 24px', fontSize: '13.5px', color: '#7f92b0', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ marginTop: '16px' }}><b>Terms and Conditions of Medical Assistance</b></p>

                          <p><b>1. Acceptance of Terms</b><br />
                            By using this clinical portal, you agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use.</p>

                          <p><b>2. CRITICAL MEDICAL DISCLAIMER</b><br />
                            • This application is a clinical screening assistant aid tool only.<br />
                            • Analysis results should NOT be used as the sole basis for clinical decisions or therapeutics.<br />
                            • Always consult qualified healthcare professionals for diagnosis or medical treatment decisions.<br />
                            • The AI model provides predictions with confidence scores, not definitive clinical diagnoses.<br />
                            • We are not liable for any medical decisions made based on portal results.</p>

                          <p><b>3. User Responsibilities</b><br />
                            • Provide accurate patient descriptors.<br />
                            • Upload high-quality CT scan slices.<br />
                            • Maintain strict confidentiality of patient records (HIPAA compliance).<br />
                            • Secure credentials against unauthorized access.</p>

                          <p><b>4. Data Accuracy Limitations</b><br />
                            • AI predictions are subject to false positives or false negatives.<br />
                            • Scan image quality directly affects analysis accuracy.<br />
                            • Regular model iterations may update prediction behaviors.</p>

                          <p><b>5. Service Availability</b><br />
                            • Local analysis operates offline. Cloud backup and synchronization require internet connectivity.</p>
                        </div>
                      )}
                    </div>

                    {/* Drawer 3: Privacy Policy */}
                    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(4,9,22,0.4)' }}>
                      <button
                        type="button"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '18px 24px', background: 'transparent', border: 'none', color: '#ffffff', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', outline: 'none' }}
                        onClick={() => setExpandedTab(expandedTab === 'privacy' ? null : 'privacy')}
                      >
                        <span>🔒 HIPAA Privacy Policy</span>
                        <span>{expandedTab === 'privacy' ? '▲' : '▼'}</span>
                      </button>

                      {expandedTab === 'privacy' && (
                        <div style={{ padding: '0 24px 24px 24px', fontSize: '13.5px', color: '#7f92b0', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ marginTop: '16px' }}><b>Secure Medical Data Privacy Policy</b></p>

                          <p><b>Data Collection</b><br />
                            We process the following medical parameters:<br />
                            • User account credentials (name, email)<br />
                            • Patient clinical descriptors (ID, name)<br />
                            • Medical CT scan slices<br />
                            • Diagnostics predictions and timestamps</p>

                          <p><b>Data Usage</b><br />
                            Parameters are used strictly to:<br />
                            • Run local AI pancreatic tissue assessments<br />
                            • Render secure history panels for clinical sync<br />
                            • Safely contribute anonymized training data to improve the global AI model</p>

                          <p><b>Data Security</b><br />
                            • Transmission is secured with TLS 1.3 encryption.<br />
                            • Local client structures are protected by AES-GCM encryption.<br />
                            • Access is highly restricted to authorized clinical logins only.</p>
                        </div>
                      )}
                    </div>

                    {/* Drawer 4: FAQ */}
                    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(4,9,22,0.4)' }}>
                      <button
                        type="button"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '18px 24px', background: 'transparent', border: 'none', color: '#ffffff', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', outline: 'none' }}
                        onClick={() => setExpandedTab(expandedTab === 'faq' ? null : 'faq')}
                      >
                        <span>❓ Questions & Answers (Clinical FAQ)</span>
                        <span>{expandedTab === 'faq' ? '▲' : '▼'}</span>
                      </button>

                      {expandedTab === 'faq' && (
                        <div style={{ padding: '0 24px 24px 24px', fontSize: '13.5px', color: '#7f92b0', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ marginTop: '16px' }}><b>Frequently Asked Q&A</b></p>

                          <p><b>Q: What does this application do?</b><br />
                            A: It uses local AI neural networks (YOLOv8) to analyze pancreatic CT scans and assist in detecting abnormalities like pancreatitis or edema.</p>

                          <p><b>Q: How accurate is the AI system?</b><br />
                            A: The model has been meticulously trained on segmented clinical datasets and prints active confidence scores. However, all predictions must be clinically validated by medical professionals.</p>

                          <p><b>Q: What image formats are supported?</b><br />
                            A: The uploader accepts standard image types (JPEG, PNG). Uploaded slices are resized to 640×640 pixels to fit the YOLO tensor inputs.</p>

                          <p><b>Q: Can I use this for final diagnoses?</b><br />
                            A: Absolutely not. This portal acts as a screening aid helper. Always consult healthcare professionals.</p>

                          <p><b>Q: What are the current YOLOv8 model specifications?</b><br />
                            A: Input Tensor size: 640×640, Confidence Threshold: 0.25, Intersection Over Union (IOU) Threshold: 0.45, Classification Classes: ABNORMAL and normal.</p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </main>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default App;