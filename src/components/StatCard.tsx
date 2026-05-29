import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  accent: string; // 'blue', 'green', or 'purple'
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent }) => {
  return (
    <div className={`overview-stat-card ${accent}`}>
      <div className="stat-card-details">
        <span className="stat-card-label">{label}</span>
        <strong className="stat-card-value">{value}</strong>
      </div>
      <div className="stat-card-icon">{icon}</div>
    </div>
  );
};
