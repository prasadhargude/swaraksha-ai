import React from 'react';

interface AppAvatarProps {
  username: string;
  size?: number;
  className?: string;
}

const PALETTE = [
  '#5865F2', // Blurple
  '#EB459E', // Pink
  '#FAA61A', // Yellow
  '#23A55A', // Green
  '#9B59B6', // Purple
  '#3BA55D', // Teal Green
];

export const AppAvatar: React.FC<AppAvatarProps> = ({ username, size = 44, className = '' }) => {
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  const getColor = (name: string): string => {
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return PALETTE[sum % PALETTE.length];
  };

  const bgColor = getColor(username || 'User');
  const fontSize = Math.round(size * 0.42);

  return (
    <div
      id={`avatar-${username || 'unknown'}`}
      className={`rounded-full flex items-center justify-center font-bold text-[#F2F3F5] select-none flex-shrink-0 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bgColor,
        fontSize: `${fontSize}px`,
      }}
    >
      {initial}
    </div>
  );
};
