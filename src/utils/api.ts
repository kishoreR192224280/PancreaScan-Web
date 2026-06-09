// Dev: uses Vite proxy → localhost XAMPP | Production: uses Cloudflare Tunnel URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * Standard utility wrapper for posting Form Data records to sync.php or auth.php
 */
const postFormData = async (endpoint: string, action: string, fields: Record<string, any>) => {
  const formData = new FormData();
  formData.append('action', action);
  Object.keys(fields).forEach((key) => {
    if (fields[key] !== undefined && fields[key] !== null) {
      formData.append(key, fields[key].toString());
    }
  });

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Clinical server returned error HTTP ${response.status}`);
  }

  const result = await response.json();
  return result;
};

// ==========================================
// 🔐 Authentication & Session API Calls
// ==========================================

export const loginDoctor = async (email: string, password: string) => {
  return postFormData('auth.php', 'login', { email, password });
};

export const registerDoctor = async (name: string, email: string, password: string) => {
  return postFormData('auth.php', 'signup', { name, email, password });
};

export const deleteDoctorAccount = async (email: string) => {
  return postFormData('auth.php', 'delete_account', { email });
};

export const requestPasswordResetOTP = async (email: string) => {
  return postFormData('auth.php', 'request_password_reset', { email });
};

export const confirmPasswordReset = async (email: string, otp: string, newPass: string) => {
  return postFormData('auth.php', 'reset_password', {
    email,
    otp,
    new_password: newPass,
  });
};

// ==========================================
// 🔬 Synchronized Specimen Diagnostics API Calls
// ==========================================

export interface ScanUploadParams {
  user_email: string;
  image: string; // Base64 jpeg data
  result: 'Normal' | 'Abnormal';
  confidence: number;
  patient_id: string;
  patient_name: string;
  timestamp: string;
  box_left: number;
  box_top: number;
  box_right: number;
  box_bottom: number;
}

export const uploadClinicalScan = async (params: ScanUploadParams) => {
  return postFormData('sync.php', 'upload_scan', {
    user_email: params.user_email,
    image: params.image,
    result: params.result,
    confidence: params.confidence.toFixed(2),
    patient_id: params.patient_id,
    patient_name: params.patient_name,
    timestamp: params.timestamp,
    box_left: params.box_left.toFixed(2),
    box_top: params.box_top.toFixed(2),
    box_right: params.box_right.toFixed(2),
    box_bottom: params.box_bottom.toFixed(2),
  });
};

export const fetchClinicalScansHistory = async (userEmail: string) => {
  return postFormData('sync.php', 'get_history', { user_email: userEmail });
};

export const deleteSingleClinicalScan = async (userEmail: string, timestamp: string) => {
  return postFormData('sync.php', 'delete_scan', { user_email: userEmail, timestamp });
};

export const clearAllClinicalScansHistory = async (userEmail: string) => {
  return postFormData('sync.php', 'clear_history', { user_email: userEmail });
};

// ==========================================
// 🤖 Federated Neural Learning Weights
// ==========================================

export const checkGlobalNeuralModelUpdates = async () => {
  return postFormData('fl.php', 'get_global_model', {});
};

export const uploadClientTrainingGradients = async (userEmail: string, gradients: string) => {
  return postFormData('fl.php', 'upload_gradients', {
    client_id: userEmail,
    gradients: gradients,
  });
};
