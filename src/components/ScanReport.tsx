import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ScanReportProps {
  patientId: string;
  patientName: string;
  result: 'Normal' | 'Abnormal';
  confidence: number; // 0‑1
  timestamp: string;
  image: string; // base64 or data URI
  box: Box;
  onClose: () => void;
}

export const ScanReport: React.FC<ScanReportProps> = ({
  patientId,
  patientName,
  result,
  confidence,
  timestamp,
  image,
  box,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Draw image and bounding box on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Guard: no image available
    if (!image || image === 'undefined' || image === '') {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#7f92b0';
      ctx.font = '16px Arial';
      ctx.fillText('Image not available', 50, canvas.height / 2);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let imgSrc = '';
    if (!image || image === '' || image === 'undefined') {
      imgSrc = '';
    } else if (image.startsWith('data:')) {
      imgSrc = image;
    } else if (image.startsWith('/') || image.startsWith('http')) {
      imgSrc = image;
    } else {
      imgSrc = 'data:image/jpeg;base64,' + image;
    }
    img.src = imgSrc;
    img.onload = () => {
      // Adjust canvas size to image aspect ratio (max width 500px)
      const maxWidth = 500;
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Draw bounding box if provided
      if (box) {
        const { left, top, right, bottom } = box;
        // Scale box coordinates to canvas size

        const wScale = canvas.width / img.width;
        const hScale = canvas.height / img.height;
        ctx.strokeStyle = result === 'Normal' ? '#10B981' : '#EF4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(left * wScale, top * hScale, (right - left) * wScale, (bottom - top) * hScale);
      }
      console.log('Box coordinates:', box);
    };
  }, [image, result, confidence, box]);

  const normalPct = result === 'Normal' ? confidence * 100 : (1 - confidence) * 100;
  const abnormalPct = 100 - normalPct;

  const handlePdfDownload = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('scan_report.pdf');
  };

  return (
    <div
      className="scan-report glass-card animate-fade-in"
      style={{ background: '#0a0d14', color: '#e1e8f0', padding: '24px', borderRadius: '12px' }}
      ref={reportRef}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#fff' }}>Diagnostic Report</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '18px' }}>
          ✖️
        </button>
      </div>

      {/* Canvas */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: '8px' }} />
      </div>

      {/* Patient Info Card */}
      <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ marginBottom: '8px', color: '#fff' }}>Patient Information</h3>
        <p><strong>ID:</strong> {patientId}</p>
        <p><strong>Name:</strong> {patientName}</p>
        <p><strong>Scan Date:</strong> {new Date(timestamp).toLocaleString()}</p>
      </div>

      {/* Analysis Results Card */}
      <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ marginBottom: '8px', color: '#fff' }}>Analysis Results</h3>
        <p><strong>Prediction:</strong> {result === 'Normal' ? 'Normal Pancreas' : 'Abnormal Pancreatitis/Edema'}</p>
        <p><strong>Confidence:</strong> {(confidence * 100).toFixed(1)}%</p>
        {/* Probability bars */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ background: '#2b2f3b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${normalPct}%`, background: '#10B981', height: '100%' }} />
            </div>
            <small style={{ color: '#10B981' }}>Normal {normalPct.toFixed(1)}%</small>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ background: '#2b2f3b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${abnormalPct}%`, background: '#EF4444', height: '100%' }} />
            </div>
            <small style={{ color: '#EF4444' }}>Abnormal {abnormalPct.toFixed(1)}%</small>
          </div>
        </div>
      </div>

      {/* Final Observation Card */}
      <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center' }}>
        {result === 'Normal' ? (
          <>
            <span style={{ color: '#10B981', fontSize: '24px', marginRight: '12px' }}>✅</span>
            <div>
              <p style={{ margin: 0, color: '#fff' }}>Pancreas appears Normal</p>
              <small>Confidence: {(confidence * 100).toFixed(1)}%</small>
              <p style={{ margin: '4px 0', color: '#fff' }}>The pancreatic architecture and surrounding areas appear within normal limits.</p>
              <small>Recommendation: Routine follow‑up as advised by your physician.</small>
            </div>
          </>
        ) : (
          <>
            <span style={{ color: '#EF4444', fontSize: '24px', marginRight: '12px' }}>⚠️</span>
            <div>
              <p style={{ margin: 0, color: '#fff' }}>Abnormal Pancreas with Edema</p>
              <small>Confidence: {(confidence * 100).toFixed(1)}%</small>
              <p style={{ margin: '4px 0', color: '#fff' }}>Analysis indicates signs consistent with pancreatitis or edema. The bounding box highlights areas of potential inflammation.</p>
              <small>Recommendation: Clinical correlation required. Consider follow‑up imaging and laboratory tests (Amylase/Lipase).</small>
            </div>
          </>
        )}
      </div>



      {/* Bottom Buttons */}
      <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
        <button
          onClick={handlePdfDownload}
          style={{ flex: 1, padding: '10px', background: 'rgba(0,240,255,0.12)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '8px', color: '#00f0ff', fontWeight: 600 }}
        >
          Share &amp; Download Report
        </button>
        <button
          onClick={onClose}
          style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: '#fff', fontWeight: 600 }}
        >
          Return to Dashboard
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: '24px', fontSize: '12px', color: '#7f92b0' }}>
        <strong>Disclaimer:</strong> This is a clinical screening assistant. It does not replace a professional medical diagnosis.
      </div>
    </div>
  );
};
