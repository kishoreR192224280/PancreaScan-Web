import React from 'react';

interface PatientHistoryProps {
  setView: (view: string) => void;
  auth: any;
  scans: any;
}

const PatientHistory: React.FC<PatientHistoryProps> = ({ setView, auth, scans }) => {
  return (
    <div className="patient-history-layout">
      <h2>Patient History</h2>
      <p>List of scans would be displayed here.</p>
      {/* Placeholder table */}
      <table className="history-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Patient ID</th>
            <th>Result</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scans && scans.length > 0 ? (
            scans.map((s: any) => (
              <tr key={s.id}>
                <td>{s.timestamp}</td>
                <td>{s.patient_id}</td>
                <td>{s.result}</td>
                <td>
                  {/* actions like view or delete could go here */}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={4}>No scan records.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PatientHistory;
