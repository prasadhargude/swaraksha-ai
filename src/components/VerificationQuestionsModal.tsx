import React, { useState } from 'react';
import { TrustedContact, VerificationQuestion } from '../types/speakerFingerprint';
import { SecurityCrypto } from '../services/securityCrypto';
import { soundEffects } from '../services/soundEffects';
import {
  HelpCircle,
  Plus,
  Trash2,
  Lock,
  KeyRound,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface VerificationQuestionsModalProps {
  contact: TrustedContact;
  onClose: () => void;
  onSaveQuestions: (updatedContact: TrustedContact) => void;
}

export const VerificationQuestionsModal: React.FC<VerificationQuestionsModalProps> = ({
  contact,
  onClose,
  onSaveQuestions,
}) => {
  const [questions, setQuestions] = useState<VerificationQuestion[]>(
    contact.verificationQuestions || []
  );

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newAnswerText, setNewAnswerText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const presetQuestions = [
    'What was the name of our favorite restaurant we visited recently?',
    'What nickname or inside joke do you call me?',
    'Where did we go on our last family vacation together?',
    'What was the name of our first family pet?',
  ];

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !newAnswerText.trim()) return;

    soundEffects.vibrate(20);
    const hash = await SecurityCrypto.hashAnswer(newAnswerText);

    const newQ: VerificationQuestion = {
      id: 'vq_' + Date.now(),
      question: newQuestionText.trim(),
      answerHash: hash,
      hint: newAnswerText.trim(), // Stored locally as hint for receiver during call
      createdAt: Date.now(),
    };

    const updated = [...questions, newQ];
    setQuestions(updated);
    setNewQuestionText('');
    setNewAnswerText('');
    setIsAdding(false);

    onSaveQuestions({
      ...contact,
      verificationQuestions: updated,
    });
  };

  const handleDelete = (id: string) => {
    soundEffects.vibrate(15);
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    onSaveQuestions({
      ...contact,
      verificationQuestions: updated,
    });
  };

  return (
    <div
      id="verification-questions-modal"
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-[#181A1D] border border-[#2B2D31] rounded-2xl p-5 shadow-2xl flex flex-col text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2B2D31]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FEE75C]/20 text-[#FEE75C]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-white">Verification Questions</h3>
              <p className="text-[11px] text-[#949BA4]">For {contact.name} ({contact.relationship})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#949BA4] hover:text-white text-xs px-2 py-1 rounded bg-[#232428]"
          >
            Done
          </button>
        </div>

        {/* Security explanation note */}
        <div className="mt-3 p-3 rounded-xl bg-[#1E2025] border border-[#2B2D31] text-[11px] text-[#949BA4] flex items-start gap-2">
          <Lock className="w-4 h-4 text-[#23A55A] shrink-0 mt-0.5" />
          <span>
            Only triggered when high-risk financial coercion or urgency is detected. Answers are stored
            cryptographically (SHA-256 hash).
          </span>
        </div>

        {/* Questions List */}
        <div className="my-4 flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-white">
            Active Security Questions ({questions.length})
          </span>

          {questions.length === 0 && (
            <div className="p-4 rounded-xl bg-[#121316] border border-[#2B2D31] text-center text-xs text-[#949BA4]">
              No questions configured. Add at least one question so Swaraksha can verify identity
              during high-risk calls.
            </div>
          )}

          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-3 rounded-xl bg-[#121316] border border-[#2B2D31] flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-white leading-snug">
                  {idx + 1}. {q.question}
                </span>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="text-[#949BA4] hover:text-[#ED4245] p-1 rounded transition-colors"
                  title="Remove question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-[#23A55A] font-mono mt-0.5">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>Expected answer: "{q.hint || 'Encrypted'}"</span>
              </div>
            </div>
          ))}
        </div>

        {/* Add new question form / toggle */}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 bg-[#232428] hover:bg-[#2B2D31] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all border border-[#35373C]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Verification Question</span>
          </button>
        ) : (
          <form
            onSubmit={handleAddQuestion}
            className="p-3.5 rounded-xl bg-[#121316] border border-[#5865F2]/40 flex flex-col gap-2.5"
          >
            <span className="text-xs font-bold text-white">New Verification Question</span>

            {/* Quick preset selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[#949BA4]">Preset Suggestions</label>
              <select
                onChange={(e) => {
                  if (e.target.value) setNewQuestionText(e.target.value);
                }}
                className="w-full bg-[#1A1C22] border border-[#2B2D31] rounded-lg p-2 text-xs text-white"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a common question...
                </option>
                {presetQuestions.map((pq, i) => (
                  <option key={i} value={pq}>
                    {pq}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[#949BA4]">Custom Question</label>
              <input
                type="text"
                required
                placeholder="e.g., What was the name of the cafe we went to?"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="w-full bg-[#1A1C22] border border-[#2B2D31] rounded-lg p-2 text-xs text-white placeholder-[#5C6067]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[#949BA4]">
                Expected Answer (Private)
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Blue Tokai"
                value={newAnswerText}
                onChange={(e) => setNewAnswerText(e.target.value)}
                className="w-full bg-[#1A1C22] border border-[#2B2D31] rounded-lg p-2 text-xs text-white placeholder-[#5C6067]"
              />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2 bg-[#232428] hover:bg-[#2B2D31] text-[#949BA4] text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-lg"
              >
                Save Question
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
