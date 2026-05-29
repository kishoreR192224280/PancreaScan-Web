import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';

export const useScans = (setView: (v: string) => void, user: any, showToast: (msg: string) => void) => {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch scan history for the logged‑in user
  const fetchScansHistory = async (email: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('action', 'fetch_history');
      formData.append('user_email', email);
      const response = await fetch(`${API_BASE_URL}sync.php`, { method: 'POST', body: formData });
      if (response.ok) {
        const result = await response.json();
        if (result && result.status === 'success') {
          // Normalise image field – use full URL if needed
          const normalized = result.scans.map((r: any) => ({
            ...r,
            image: r.image_path ? `http://14.139.187.229:8081/oct/pancreas/${r.image_path}` : r.image || '',
            box_left: r.box_left ?? 0.1,
            box_top: r.box_top ?? 0.2,
            box_right: r.box_right ?? 0.8,
            box_bottom: r.box_bottom ?? 0.9,
          }));
          setScans(normalized);
        } else {
          showToast(`❌ Failed to load history: ${result?.message || 'unknown'}`);
        }
      } else {
        showToast(`❌ Server error ${response.status}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Network error while loading history`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a single scan by its timestamp
  const handleDeleteScan = async (timestamp: string) => {
    if (!window.confirm(`⚠️ Delete scan from ${timestamp}? This cannot be undone.`)) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'delete_scan');
    formData.append('user_email', user?.email || '');
    formData.append('timestamp', timestamp);
    try {
      const resp = await fetch(`${API_BASE_URL}sync.php`, { method: 'POST', body: formData });
      const result = await resp.json();
      if (result && (result.status === 'success' || result.success)) {
        showToast('🗑️ Scan deleted');
        // Refresh history
        await fetchScansHistory(user?.email || '');
      } else {
        showToast(`❌ Delete failed: ${result?.message || 'unknown'}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('❌ Network error while deleting');
    } finally {
      setLoading(false);
    }
  };

  // Delete all scans for the user
  const handleDeleteAllRecords = async () => {
    if (!window.confirm('⚠️ Delete ALL records? This action cannot be undone.')) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'clear_history');
    formData.append('user_email', user?.email || '');
    try {
      const resp = await fetch(`${API_BASE_URL}sync.php`, { method: 'POST', body: formData });
      const result = await resp.json();
      if (result && result.status === 'success') {
        showToast('🧹 All records cleared');
        setScans([]);
      } else {
        showToast(`❌ Clear failed: ${result?.message || 'unknown'}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('❌ Network error while clearing history');
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for analysis – in the full app this runs the TFLite model.
  const handleAnalyzeScanReal = async () => {
    showToast('🔬 Analysis placeholder – integrate model here');
  };

  // Save a new scan after analysis – minimal stub.
  const handleSaveRealScanToDatabase = async (scanData: any) => {
    showToast('💾 Save placeholder – integrate API here');
  };

  // Switch dashboard sub‑view – used by Dashboard component via auth prop.
  const handleStatCardClick = (type: 'Normal' | 'Abnormal') => {
    // In a full implementation this would set the sub‑view; here we just toast.
    showToast(`📊 Showing ${type} statistics`);
  };

  // Expose state and handlers
  return {
    scans,
    loading,
    fetchScansHistory,
    handleDeleteScan,
    handleDeleteAllRecords,
    handleAnalyzeScanReal,
    handleSaveRealScanToDatabase,
    handleStatCardClick,
  };
};
