import React from 'react';

interface ToastNotificationProps {
  message: string | null;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="toast-notification-panel">
      <div className="toast-content">{message}</div>
    </div>
  );
};
