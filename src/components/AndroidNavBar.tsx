import React from 'react';
import { History, Users, Grid3X3, Shield, Fingerprint } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

export type AndroidTabType = 'recents' | 'contacts' | 'fingerprints' | 'keypad' | 'shield';

interface AndroidNavBarProps {
  activeTab: AndroidTabType;
  onTabChange: (tab: AndroidTabType) => void;
  recentsBadgeCount?: number;
  onlinePeersCount?: number;
  trustedContactsCount?: number;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  activeTab,
  onTabChange,
  recentsBadgeCount = 0,
  onlinePeersCount = 0,
  trustedContactsCount = 0,
}) => {
  const handleSelect = (tab: AndroidTabType) => {
    soundEffects.vibrate(15);
    onTabChange(tab);
  };

  const navItems = [
    {
      id: 'recents' as AndroidTabType,
      label: 'Recents',
      icon: History,
      badge: recentsBadgeCount > 0 ? recentsBadgeCount : null,
    },
    {
      id: 'contacts' as AndroidTabType,
      label: 'Contacts',
      icon: Users,
      badge: onlinePeersCount > 0 ? onlinePeersCount : null,
    },
    {
      id: 'fingerprints' as AndroidTabType,
      label: 'Voice Vault',
      icon: Fingerprint,
      badge: trustedContactsCount > 0 ? trustedContactsCount : null,
    },
    {
      id: 'keypad' as AndroidTabType,
      label: 'Keypad',
      icon: Grid3X3,
      badge: null,
    },
    {
      id: 'shield' as AndroidTabType,
      label: 'BARA Guard',
      icon: Shield,
      badge: null,
    },
  ];

  return (
    <nav
      id="android-bottom-nav"
      className="w-full bg-[#181A1D] border-t border-[#2B2D31]/80 pt-1.5 pb-1 flex flex-col z-30 select-none shrink-0"
    >
      {/* 4 Material 3 Navigation Destinations */}
      <div className="flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 group focus:outline-none transition-transform active:scale-95"
            >
              {/* Material 3 Active Indicator Pill */}
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-[#3A3E48] text-[#7289DA]'
                    : 'text-[#949BA4] group-hover:text-[#F2F3F5]'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />

                {/* Badge if present */}
                {item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#5865F2] text-[10px] font-bold text-white flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] mt-1 font-medium transition-colors leading-none ${
                  isActive ? 'text-[#F2F3F5] font-semibold' : 'text-[#949BA4]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Android System Navigation Gesture Bar Pill */}
      <div className="pt-2 pb-1 flex justify-center items-center">
        <div className="w-32 h-1 bg-white/30 rounded-full" />
      </div>
    </nav>
  );
};
