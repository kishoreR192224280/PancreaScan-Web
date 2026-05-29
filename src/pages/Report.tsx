import React from 'react';
import ThreeDCanvas from '../components/ThreeDCanvas';

export interface ScanReport {
  id: string;
  patient_id: string;
  patient_name: string;
  result: 'Normal' | 'Abnormal';
  confidence: number;
  timestamp: string;
  box_left: number;
  box_top: number;
  box_right: number;
  box_bottom: number;
  image: string; // base64 jpeg
  feedback_submitted: boolean;
}

interface ReportProps {
  scan: ScanReport;
  onClose: () => void;
  onFeedbackSubmit?: () => void;
}

export const Report: React.FC<ReportProps> = ({ scan, onClose, onFeedbackSubmit }) => {
  return (
    <div className="report-screen glass-card animate-fade-in">
      <div className="report-header">
        <h2 className="report-title">Diagnostic Report</h2>
        <button className="btn-close" onClick={onClose}>✖️ Close</button>
      </div>
      <div className="report-meta">
        <p><strong>Patient:</strong> {scan.patient_name} (ID: {scan.patient_id})</p>
        <p><strong>Result:</strong> {scan.result}</p>
        <p><strong>Confidence:</strong> {(scan.confidence * 100).toFixed(1)}%</p>
        <p><strong>Timestamp:</strong> {scan.timestamp}</p>
      </div>
      <div className="report-image-wrapper">
        {/* Show the CT image with a canvas overlay for bounding box */}
        {scan.image ? (
          <ThreeDCanvas
            imageSrc={scan.image}
            box={{ left: scan.box_left, top: scan.box_top, right: scan.box_right, bottom: scan.box_bottom }}
          />
        ) : (
          <p>No image available</p>
        )}
      </div>
      <div className="report-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button className="btn-solid" onClick={onFeedbackSubmit}>👍 Helpful</button>
        <button className="btn-outline" onClick={onFeedbackSubmit}>👎 Not Helpful</button>
      </div>
      <div className="disclaimer" style={{ marginTop: '24px', fontSize: '12px', color: '#7f92b0' }}>
        <strong>Disclaimer:</strong> This is a clinical screening assistant. It does not replace a professional medical diagnosis.
      </div>
    </div>
  );
};
export default Report;
