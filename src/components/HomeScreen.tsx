import React, { useState } from 'react';
import { UserModel, PresenceStatus, CallHistoryItem, DetectionState, BaraSettings } from '../types';
import { AndroidStatusBar } from './AndroidStatusBar';
import { AndroidNavBar, AndroidTabType } from './AndroidNavBar';
import { AppAvatar } from './AppAvatar';
import { UserTile } from './UserTile';
import { KeypadDialer } from './KeypadDialer';
import { CallHistoryView } from './CallHistoryView';
import { SecurityDashboard } from './SecurityDashboard';
import { SettingsModal } from './SettingsModal';
import { ContactsManagementView } from './ContactsManagementView';
import { DemoScenariosSelector } from './DemoScenariosSelector';
import { TrustedContact, DemoScenarioId } from '../types/speakerFingerprint';
import { TrustedContactsStore } from '../services/trustedContactsStore';
import { soundEffects } from '../services/soundEffects';
import {
  Search,
  Plus,
  Grid3X3,
  Sliders,
  ShieldCheck,
  RotateCw,
  PhoneCall,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Fingerprint,
} from 'lucide-react';

interface HomeScreenProps {
  currentUser: UserModel;
  users: UserModel[];
  isWsConnected: boolean;
  callHistory: CallHistoryItem[];
  detectionState: DetectionState;
  settings: BaraSettings;
  trustedContacts: TrustedContact[];
  onStartCall: (user: UserModel) => void;
  onRefreshPresence: () => void;
  onSignOut: () => void;
  onSimulateIncomingCall: (callerName?: string, isFake?: boolean) => void;
  onSimulateScenario: (scenarioId: DemoScenarioId) => void;
  onAddCustomContact?: (username: string, status: PresenceStatus) => void;
  onClearHistory: () => void;
  onUpdateSettings: (settings: BaraSettings) => void;
  onRefreshTrustedContacts: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  users,
  isWsConnected,
  callHistory,
  detectionState,
  settings,
  trustedContacts,
  onStartCall,
  onRefreshPresence,
  onSignOut,
  onSimulateIncomingCall,
  onSimulateScenario,
  onAddCustomContact,
  onClearHistory,
  onUpdateSettings,
  onRefreshTrustedContacts,
}) => {
  const [activeTab, setActiveTab] = useState<AndroidTabType>('recents');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddContactSheet, setShowAddContactSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [showDemoScenariosModal, setShowDemoScenariosModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New contact form
  const [contactName, setContactName] = useState('');
  const [contactStatus, setContactStatus] = useState<PresenceStatus>('online');

  const otherUsers = users.filter((u) => u.userId !== currentUser.userId);
  const filteredUsers = otherUsers.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const onlineUsers = filteredUsers.filter((u) => u.status === 'online');
  const offlineUsers = filteredUsers.filter((u) => u.status !== 'online');

  const handleRefresh = () => {
    soundEffects.vibrate(15);
    setIsRefreshing(true);
    onRefreshPresence();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactName.trim() && onAddCustomContact) {
      soundEffects.vibrate(25);
      onAddCustomContact(contactName.trim(), contactStatus);
      setContactName('');
      setShowAddContactSheet(false);
    }
  };

  return (
    <div
      id="android-home-screen"
      className="flex-1 w-full bg-[#121316] flex flex-col relative select-none overflow-hidden"
    >
      {/* 1. Android Native Status Bar */}
      <AndroidStatusBar />

      {/* 2. Android Material 3 Top App Bar */}
      <header className="px-4 py-2.5 bg-[#181A1D] border-b border-[#2B2D31]/70 flex flex-col gap-2 z-20 shrink-0">
        {/* Top Row: Brand, Voice Guard status badge, and Profile Avatar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5865F2] to-[#7289DA] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-[#F2F3F5] tracking-tight leading-tight">
                Swaraksha
              </span>
              <span className="text-[10px] text-[#23A55A] font-semibold flex items-center gap-1 leading-none mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A] animate-pulse" />
                BARA Guard Active
              </span>
            </div>
          </div>

          {/* Right Action Icons: Refresh & User Avatar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 text-[#949BA4] hover:text-[#F2F3F5] hover:bg-[#2B2D31] rounded-full transition-colors"
              title="Refresh Network Presence"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#5865F2]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.vibrate(15);
                setShowAccountSheet(true);
              }}
              className="relative focus:outline-none"
              title="Account & Settings"
            >
              <AppAvatar username={currentUser.username} size={32} />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23A55A] border-2 border-[#181A1D]" />
            </button>
          </div>
        </div>

        {/* Material 3 Search Bar (Search contacts and dialer) */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#949BA4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts & dialer..."
            className="w-full pl-9 pr-8 py-2 bg-[#222429] text-xs text-[#F2F3F5] placeholder-[#949BA4] rounded-full border border-transparent focus:border-[#5865F2]/60 focus:bg-[#282B32] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#949BA4] hover:text-[#F2F3F5]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Quick Test Call Banner (Android Quick Action Pill) */}
      <div className="px-3 py-1.5 bg-[#1E2025] border-b border-[#2B2D31]/60 flex items-center justify-between text-[11px] shrink-0">
        <span className="text-[#949BA4] font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#5865F2]" />
          Simulate Scenarios:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowDemoScenariosModal(true)}
            className="px-2.5 py-0.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#7289DA] font-bold rounded-full border border-[#5865F2]/40 transition-all active:scale-95 flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5 text-[#5865F2]" />
            4 Scenarios
          </button>
          <button
            type="button"
            onClick={() => onSimulateScenario('trusted_caller')}
            className="px-2 py-0.5 bg-[#23A55A]/20 hover:bg-[#23A55A]/30 text-[#23A55A] font-semibold rounded-full border border-[#23A55A]/40 transition-all active:scale-95 flex items-center gap-1"
          >
            <PhoneCall className="w-2.5 h-2.5" />
            Amit (Safe)
          </button>
          <button
            type="button"
            onClick={() => onSimulateScenario('ai_banking_scam')}
            className="px-2 py-0.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 font-semibold rounded-full border border-red-700/50 transition-all active:scale-95 flex items-center gap-1"
          >
            <ShieldCheck className="w-2.5 h-2.5 text-red-400" />
            AI Clone
          </button>
        </div>
      </div>

      {/* 3. Main Body Scrollable View according to Active Tab */}
      <main className="flex-1 w-full overflow-y-auto relative flex flex-col">
        {/* TAB 1: RECENTS / CALL HISTORY */}
        {activeTab === 'recents' && (
          <div className="flex-1 flex flex-col pb-16">
            <CallHistoryView
              history={callHistory}
              onRedial={onStartCall}
              onClearHistory={onClearHistory}
            />

            {/* Floating Action Button (FAB) to open Keypad */}
            <div className="fixed bottom-20 right-6 z-30">
              <button
                type="button"
                onClick={() => {
                  soundEffects.vibrate(20);
                  setActiveTab('keypad');
                }}
                className="w-14 h-14 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
                title="Open Dialpad"
              >
                <Grid3X3 className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS LIST */}
        {activeTab === 'contacts' && (
          <div className="flex-1 flex flex-col p-3 space-y-3 pb-16">
            {/* Online Contacts Section */}
            <div>
              <div className="px-2 py-1 text-[11px] font-bold text-[#949BA4] uppercase tracking-wider flex items-center justify-between">
                <span>Available Peers ({onlineUsers.length})</span>
                <span className="text-[#23A55A] font-semibold text-[10px]">VoIP Ready</span>
              </div>

              {onlineUsers.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-[#949BA4] bg-[#181A1D] rounded-2xl border border-[#2B2D31]/60 my-1">
                  {searchQuery
                    ? 'No matching peers found.'
                    : 'No other peers are online. Tap + below to add peer.'}
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {onlineUsers.map((user) => (
                    <UserTile key={user.userId} user={user} onCallPressed={onStartCall} />
                  ))}
                </div>
              )}
            </div>

            {/* Offline Contacts Section */}
            <div>
              <div className="px-2 py-1 text-[11px] font-bold text-[#949BA4] uppercase tracking-wider">
                <span>Offline Contacts ({offlineUsers.length})</span>
              </div>

              <div className="space-y-1 mt-1">
                {offlineUsers.map((user) => (
                  <UserTile key={user.userId} user={user} onCallPressed={onStartCall} />
                ))}
              </div>
            </div>

            {/* Floating Action Button (FAB) to Add Contact */}
            <div className="fixed bottom-20 right-6 z-30">
              <button
                type="button"
                onClick={() => {
                  soundEffects.vibrate(20);
                  setShowAddContactSheet(true);
                }}
                className="w-14 h-14 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
                title="Add New Contact"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: VOICE VAULT / TRUSTED CONTACT FINGERPRINTS */}
        {activeTab === 'fingerprints' && (
          <div className="flex-1 flex flex-col pb-16">
            <ContactsManagementView
              contacts={trustedContacts}
              onStartCall={(tc) => {
                onStartCall({
                  userId: tc.id,
                  username: tc.name,
                  status: 'online',
                });
              }}
              onRefreshContacts={onRefreshTrustedContacts}
            />
          </div>
        )}

        {/* TAB 4: KEYPAD DIALER */}
        {activeTab === 'keypad' && (
          <div className="flex-1 flex flex-col">
            <KeypadDialer
              users={users}
              onStartCall={onStartCall}
              onSimulateCall={(name, isFake) => onSimulateIncomingCall(name, isFake)}
            />
          </div>
        )}

        {/* TAB 5: BARA SHIELD SECURITY HUB */}
        {activeTab === 'shield' && (
          <div className="flex-1 flex flex-col">
            <SecurityDashboard
              detectionState={detectionState}
              settings={settings}
              onOpenSettings={() => setShowSettingsSheet(true)}
              onSimulateDeepfakeCall={() =>
                onSimulateIncomingCall('Unknown Spoofed Caller', true)
              }
              onSimulateRealCall={() =>
                onSimulateIncomingCall('Colleague Rohit (Human)', false)
              }
            />
          </div>
        )}
      </main>

      {/* 4. Android Native Bottom Navigation Bar */}
      <AndroidNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        recentsBadgeCount={callHistory.filter((c) => c.direction === 'missed').length}
        onlinePeersCount={onlineUsers.length}
        trustedContactsCount={trustedContacts.length}
      />

      {/* Android Bottom Sheet: Account & Preferences Drawer */}
      {showAccountSheet && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-md bg-[#1E2025] rounded-t-3xl border-t border-[#3A3E48] p-5 shadow-2xl flex flex-col animate-slideUp">
            {/* Drag handle */}
            <div className="w-12 h-1.5 bg-[#4E525E] rounded-full mx-auto mb-4" />

            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#2B2D31]">
              <AppAvatar username={currentUser.username} size={48} />
              <div className="flex flex-col">
                <span className="text-base font-bold text-[#F2F3F5]">{currentUser.username}</span>
                <span className="text-xs text-[#23A55A] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A]" />
                  Online • VoIP Identity Ready
                </span>
                <span className="text-[11px] text-[#949BA4] font-mono mt-0.5">
                  ID: {currentUser.userId}
                </span>
              </div>
            </div>

            {/* Quick Status info */}
            <div className="bg-[#141518] p-3 rounded-xl border border-[#2B2D31] mb-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#949BA4]">Signaling WebSocket:</span>
                <span className="font-semibold flex items-center gap-1 text-[#23A55A]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isWsConnected ? 'Connected Live' : 'Local Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#949BA4]">On-Device Model:</span>
                <span className="text-[#F2F3F5] font-semibold">CAE Spectrogram (16kHz)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#949BA4]">Reconstruction Cutoff:</span>
                <span className="text-[#F2F3F5] font-semibold">32.0 MSE</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowAccountSheet(false);
                  setShowSettingsSheet(true);
                }}
                className="w-full py-3 px-4 bg-[#282B32] hover:bg-[#32363F] text-[#F2F3F5] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Sliders className="w-4 h-4 text-[#5865F2]" />
                VoIP & AI Shield Settings
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAccountSheet(false);
                  onSignOut();
                }}
                className="w-full py-3 px-4 bg-red-950/40 hover:bg-red-900/50 text-red-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-red-800/40"
              >
                Sign Out from Device
              </button>

              <button
                type="button"
                onClick={() => setShowAccountSheet(false)}
                className="w-full py-2.5 text-xs text-[#949BA4] hover:text-[#F2F3F5] rounded-xl text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android Bottom Sheet: Add Peer Contact */}
      {showAddContactSheet && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-md bg-[#1E2025] rounded-t-3xl border-t border-[#3A3E48] p-5 shadow-2xl animate-slideUp">
            {/* Drag handle */}
            <div className="w-12 h-1.5 bg-[#4E525E] rounded-full mx-auto mb-4" />

            <h3 className="text-base font-bold text-[#F2F3F5] mb-1">Add Peer Contact</h3>
            <p className="text-xs text-[#949BA4] mb-4">
              Enter username or extension to add to your Android contact list.
            </p>

            <form onSubmit={handleAddContactSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[#949BA4] block mb-1">Peer Username / Ext</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. aditi_sharma"
                  className="w-full px-3 py-2.5 bg-[#141518] border border-[#2B2D31] rounded-xl text-xs text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="text-xs text-[#949BA4] block mb-1">Presence Availability</label>
                <select
                  value={contactStatus}
                  onChange={(e) => setContactStatus(e.target.value as PresenceStatus)}
                  className="w-full px-3 py-2.5 bg-[#141518] border border-[#2B2D31] rounded-xl text-xs text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                >
                  <option value="online">Online (Available)</option>
                  <option value="inCall">Busy (In Call)</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddContactSheet(false)}
                  className="flex-1 py-2.5 text-xs text-[#949BA4] hover:text-[#F2F3F5] bg-[#282B32] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl shadow"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Bottom Sheet */}
      {showSettingsSheet && (
        <SettingsModal
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onSignOut={onSignOut}
          onClose={() => setShowSettingsSheet(false)}
        />
      )}

      {/* Demo Scenarios Modal */}
      {showDemoScenariosModal && (
        <DemoScenariosSelector
          onSelectScenario={(scId) => {
            setShowDemoScenariosModal(false);
            onSimulateScenario(scId);
          }}
          onClose={() => setShowDemoScenariosModal(false)}
        />
      )}
    </div>
  );
};
