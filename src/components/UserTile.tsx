import React from 'react';
import { UserModel } from '../types';
import { AppAvatar } from './AppAvatar';
import { OnlineIndicator } from './OnlineIndicator';
import { Phone } from 'lucide-react';

interface UserTileProps {
  user: UserModel;
  onCallPressed?: (user: UserModel) => void;
}

export const UserTile: React.FC<UserTileProps> = ({ user, onCallPressed }) => {
  const isOnline = user.status === 'online';

  const getStatusLabel = () => {
    switch (user.status) {
      case 'online':
        return 'Online';
      case 'inCall':
        return 'In Call';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  return (
    <div
      id={`user-tile-${user.userId}`}
      className={`group flex items-center px-3 py-2 rounded-lg transition-colors duration-150 ${
        isOnline ? 'hover:bg-[#35373C] cursor-pointer' : 'opacity-60 cursor-default'
      }`}
      onClick={() => isOnline && onCallPressed && onCallPressed(user)}
    >
      {/* Avatar with Status badge */}
      <div className="relative mr-3 flex-shrink-0">
        <div className={isOnline ? 'opacity-100' : 'opacity-50'}>
          <AppAvatar username={user.username} size={42} />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator status={user.status} size={14} />
        </div>
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-[15px] truncate ${isOnline ? 'text-[#F2F3F5]' : 'text-[#949BA4]'}`}>
          {user.username}
        </div>
        <div className="text-xs text-[#949BA4] truncate">
          {getStatusLabel()}
        </div>
      </div>

      {/* Action Button */}
      {isOnline && (
        <button
          id={`call-btn-${user.userId}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCallPressed && onCallPressed(user);
          }}
          className="p-2 rounded-full text-[#23A55A] hover:bg-[#23A55A]/15 active:scale-95 transition-all ml-2"
          title={`Call ${user.username}`}
        >
          <Phone className="w-5 h-5 fill-current" />
        </button>
      )}
    </div>
  );
};
