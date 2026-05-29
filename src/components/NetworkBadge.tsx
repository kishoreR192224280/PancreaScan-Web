import React from 'react';

interface NetworkBadgeProps {
  isOnline: boolean;
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ isOnline }) => {
  return (
    <div className={`network-badge ${isOnline ? 'online' : 'offline'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span className="badge-light"></span>
      {isOnline ? 'Online' : 'Offline'}
    </div>
  );
};
