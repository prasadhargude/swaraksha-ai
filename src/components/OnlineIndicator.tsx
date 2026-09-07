import React from 'react';
import { PresenceStatus } from '../types';
import { AppColors } from '../constants';

interface OnlineIndicatorProps {
  status: PresenceStatus;
  size?: number;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ status, size = 14 }) => {
  const getColor = () => {
    switch (status) {
      case 'online':
        return AppColors.online;
      case 'inCall':
        return AppColors.busy;
      case 'offline':
      default:
        return AppColors.offline;
    }
  };

  return (
    <span
      className="inline-block rounded-full border-[2.5px] border-[#1E1F22] flex-shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: getColor(),
      }}
      title={status}
    />
  );
};
