import React, { useState } from 'react';
import { CallHistoryItem, UserModel } from '../types';
import { AppAvatar } from './AppAvatar';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, ShieldAlert, CheckCircle2, Trash2, Search } from 'lucide-react';

interface CallHistoryViewProps {
  history: CallHistoryItem[];
  onRedial: (user: UserModel) => void;
  onClearHistory: () => void;
}

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({
  history,
  onRedial,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((item) =>
    item.peerUsername.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (sec: number) => {
    if (sec <= 0) return 'Missed';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="call-history-view" className="w-full flex flex-col h-full py-3 px-3 select-none">
      {/* Top Controls: Search & Clear */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#949BA4]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recent calls..."
            className="w-full pl-9 pr-3 py-2 bg-[#1E1F22] text-[#F2F3F5] text-xs rounded-lg border border-[#3A3C41] focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            title="Clear all call history"
            className="p-2 text-[#949BA4] hover:text-[#ED4245] hover:bg-[#2B2D31] rounded-lg transition-colors border border-[#3A3C41]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center text-[#949BA4] text-xs">
            {searchTerm ? 'No calls matching your search.' : 'No call history yet. Start a call to test!'}
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isFake = item.verdict === 'fake';
            const isReal = item.verdict === 'real';

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#2B2D31] transition-colors border border-transparent hover:border-[#3A3C41]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AppAvatar username={item.peerUsername} size={40} />

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-[#F2F3F5] truncate max-w-[140px] sm:max-w-[180px]">
                        {item.peerUsername}
                      </span>
                      {isFake && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-900/60 text-red-300 border border-red-700/60 flex items-center gap-1">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          AI Fake
                        </span>
                      )}
                      {isReal && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Human
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#949BA4] mt-0.5">
                      {item.direction === 'incoming' && (
                        <PhoneIncoming className="w-3 h-3 text-[#23A55A]" />
                      )}
                      {item.direction === 'outgoing' && (
                        <PhoneOutgoing className="w-3 h-3 text-[#5865F2]" />
                      )}
                      {item.direction === 'missed' && (
                        <PhoneMissed className="w-3 h-3 text-[#ED4245]" />
                      )}
                      <span>{formatTime(item.timestamp)}</span>
                      <span>•</span>
                      <span>{formatDuration(item.durationSec)}</span>
                      {item.peakMse && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px]">
                            MSE {item.peakMse.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Redial Action */}
                <button
                  type="button"
                  onClick={() =>
                    onRedial({
                      userId: item.peerUserId,
                      username: item.peerUsername,
                      status: 'online',
                    })
                  }
                  className="p-2 rounded-full text-[#23A55A] hover:bg-[#23A55A]/20 transition-colors"
                  title={`Call ${item.peerUsername}`}
                >
                  <Phone className="w-4 h-4 fill-current" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
