import React, { useState } from 'react';
import { TrustedContact } from '../types/speakerFingerprint';
import { TrustedContactsStore } from '../services/trustedContactsStore';
import { VoiceEnrollmentModal } from './VoiceEnrollmentModal';
import { VerificationQuestionsModal } from './VerificationQuestionsModal';
import { soundEffects } from '../services/soundEffects';
import {
  UserPlus,
  Mic,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Trash2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Info,
  Layers,
  Search,
} from 'lucide-react';

interface ContactsManagementViewProps {
  contacts: TrustedContact[];
  onStartCall: (contact: TrustedContact) => void;
  onRefreshContacts: () => void;
}

export const ContactsManagementView: React.FC<ContactsManagementViewProps> = ({
  contacts,
  onStartCall,
  onRefreshContacts,
}) => {
  const [search, setSearch] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [enrollContact, setEnrollContact] = useState<TrustedContact | null>(null);
  const [questionsContact, setQuestionsContact] = useState<TrustedContact | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState('Family');
  const [newPhone, setNewPhone] = useState('+91 ');

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.relationship.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumber.includes(search)
  );

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    soundEffects.vibrate(20);
    const newContact: TrustedContact = {
      id: 'contact_' + Date.now(),
      name: newName.trim(),
      relationship: newRel.trim(),
      phoneNumber: newPhone.trim(),
      verificationQuestions: [],
      createdAt: Date.now(),
    };

    TrustedContactsStore.saveContact(newContact);
    onRefreshContacts();

    setNewName('');
    setNewRel('Family');
    setNewPhone('+91 ');
    setShowAddContactModal(false);

    // Prompt to enroll voice immediately
    setEnrollContact(newContact);
  };

  const handleDelete = (id: string) => {
    soundEffects.vibrate(20);
    TrustedContactsStore.deleteContact(id);
    onRefreshContacts();
  };

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden text-left bg-[#121316]">
      {/* Search and Action Bar */}
      <div className="p-3 bg-[#181A1D] border-b border-[#2B2D31] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#23A55A]" />
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                Trusted Contact Fingerprints
              </h2>
              <p className="text-[11px] text-[#949BA4]">
                Continuous speaker verification & active security questions
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddContactModal(true)}
            className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#949BA4] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search trusted contacts by name, relationship..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#121316] border border-[#2B2D31] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#72767D] focus:outline-none focus:border-[#5865F2]"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-2 text-[#949BA4]">
            <Layers className="w-8 h-8 text-[#4E5058]" />
            <span className="text-xs font-medium">No trusted contacts match your query.</span>
          </div>
        ) : (
          filtered.map((contact) => {
            const hasVoiceProfile = !!contact.speakerProfile;
            const questionCount = contact.verificationQuestions?.length || 0;

            return (
              <div
                key={contact.id}
                className="p-3.5 rounded-2xl bg-[#181A1D] border border-[#2B2D31] hover:border-[#35373C] transition-all flex flex-col gap-3 shadow-sm"
              >
                {/* Contact Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5865F2] to-[#EB459E] flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{contact.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#2B2D31] text-[10px] text-[#DBDEE1] font-medium">
                          {contact.relationship}
                        </span>
                      </div>
                      <span className="text-xs text-[#949BA4] font-mono">{contact.phoneNumber}</span>
                    </div>
                  </div>

                  {/* Call Button */}
                  <button
                    onClick={() => onStartCall(contact)}
                    className="p-2 rounded-xl bg-[#23A55A]/20 hover:bg-[#23A55A]/30 text-[#23A55A] transition-all"
                    title={`Call ${contact.name}`}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </div>

                {/* Fingerprint & Security Status Badges */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Voice Profile Badge / Button */}
                  <button
                    onClick={() => setEnrollContact(contact)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                      hasVoiceProfile
                        ? 'bg-[#23A55A]/10 border-[#23A55A]/30 hover:bg-[#23A55A]/20'
                        : 'bg-[#ED4245]/10 border-[#ED4245]/30 hover:bg-[#ED4245]/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Mic
                        className={`w-3.5 h-3.5 ${
                          hasVoiceProfile ? 'text-[#23A55A]' : 'text-[#ED4245]'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white leading-tight">
                          {hasVoiceProfile ? 'Voice Fingerprinted' : 'Enroll Voice'}
                        </span>
                        <span className="text-[9px] text-[#949BA4] leading-tight">
                          {hasVoiceProfile
                            ? `${Math.round(contact.speakerProfile!.averageQuality * 100)}% quality (3 samples)`
                            : 'Required for matching'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#949BA4]" />
                  </button>

                  {/* Security Questions Badge / Button */}
                  <button
                    onClick={() => setQuestionsContact(contact)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                      questionCount > 0
                        ? 'bg-[#5865F2]/10 border-[#5865F2]/30 hover:bg-[#5865F2]/20'
                        : 'bg-[#FEE75C]/10 border-[#FEE75C]/30 hover:bg-[#FEE75C]/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <KeyRound
                        className={`w-3.5 h-3.5 ${
                          questionCount > 0 ? 'text-[#5865F2]' : 'text-[#FEE75C]'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white leading-tight">
                          Active Verification
                        </span>
                        <span className="text-[9px] text-[#949BA4] leading-tight">
                          {questionCount > 0
                            ? `${questionCount} Question${questionCount > 1 ? 's' : ''} set`
                            : 'Set security questions'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#949BA4]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateContact}
            className="w-full max-w-sm bg-[#181A1D] border border-[#2B2D31] rounded-2xl p-5 shadow-2xl flex flex-col gap-3 text-left"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#2B2D31]">
              <h3 className="text-sm font-bold text-white">Add Trusted Contact</h3>
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                className="text-xs text-[#949BA4]"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[#949BA4]">Contact Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Amit"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#121316] border border-[#2B2D31] rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[#949BA4]">Relationship</label>
              <input
                type="text"
                required
                placeholder="e.g., Brother, Mother, Manager"
                value={newRel}
                onChange={(e) => setNewRel(e.target.value)}
                className="w-full bg-[#121316] border border-[#2B2D31] rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[#949BA4]">Phone Number</label>
              <input
                type="text"
                required
                placeholder="+91 98765 43210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-[#121316] border border-[#2B2D31] rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-xl"
            >
              Save & Start Voice Enrollment
            </button>
          </form>
        </div>
      )}

      {/* Voice Enrollment Modal */}
      {enrollContact && (
        <VoiceEnrollmentModal
          contact={enrollContact}
          onClose={() => setEnrollContact(null)}
          onEnrollmentComplete={(updated) => {
            TrustedContactsStore.saveContact(updated);
            onRefreshContacts();
            setEnrollContact(null);
          }}
        />
      )}

      {/* Verification Questions Modal */}
      {questionsContact && (
        <VerificationQuestionsModal
          contact={questionsContact}
          onClose={() => setQuestionsContact(null)}
          onSaveQuestions={(updated) => {
            TrustedContactsStore.saveContact(updated);
            onRefreshContacts();
          }}
        />
      )}
    </div>
  );
};
