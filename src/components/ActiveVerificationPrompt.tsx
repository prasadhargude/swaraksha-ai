import React, { useState } from 'react';
import { VerificationQuestion } from '../types/speakerFingerprint';
import {
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Send,
  Lock,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface ActiveVerificationPromptProps {
  question: VerificationQuestion;
  contactName: string;
  onAnswerSubmit: (answerText: string) => void;
  onDismiss: () => void;
  evaluationResult?: 'CORRECT' | 'INCORRECT' | 'UNCERTAIN' | 'PENDING';
}

export const ActiveVerificationPrompt: React.FC<ActiveVerificationPromptProps> = ({
  question,
  contactName,
  onAnswerSubmit,
  onDismiss,
  evaluationResult,
}) => {
  const [callerResponse, setCallerResponse] = useState('');
  const [hasAsked, setHasAsked] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callerResponse.trim()) return;
    soundEffects.vibrate(25);
    onAnswerSubmit(callerResponse.trim());
  };

  const handleQuickAnswer = (val: string) => {
    setCallerResponse(val);
    onAnswerSubmit(val);
  };

  return (
    <div
      id="active-verification-prompt"
      className="w-full mx-auto p-3.5 bg-gradient-to-b from-[#1F1B24] to-[#16141A] border-2 border-[#ED4245]/70 rounded-2xl shadow-2xl flex flex-col gap-3 text-left animate-slideUp backdrop-blur-md"
    >
      {/* Header Warning */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#ED4245]/20 text-[#ED4245] animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#ED4245]">
                Active Verification Recommended
              </span>
            </div>
            <p className="text-[10px] text-[#949BA4] leading-tight mt-0.5">
              High-risk financial intent or mismatch detected. Ask this question aloud to caller.
            </p>
          </div>
        </div>
      </div>

      {/* Verification Question Box */}
      <div className="p-3 rounded-xl bg-[#121114] border border-[#2B2D31] flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-bold text-[#FEE75C] flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Ask {contactName} out loud:</span>
        </span>
        <p className="text-xs font-semibold text-white leading-relaxed">
          "{question.question}"
        </p>
        {question.hint && (
          <span className="text-[10px] text-[#23A55A] font-mono mt-0.5">
            (Expected answer: {question.hint})
          </span>
        )}
      </div>

      {/* Caller Response Evaluation Display */}
      {evaluationResult && evaluationResult !== 'PENDING' ? (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            evaluationResult === 'CORRECT'
              ? 'bg-[#23A55A]/15 border-[#23A55A]/40 text-[#23A55A]'
              : 'bg-[#ED4245]/15 border-[#ED4245]/40 text-[#ED4245]'
          }`}
        >
          {evaluationResult === 'CORRECT' ? (
            <CheckCircle2 className="w-6 h-6 shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 shrink-0" />
          )}
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-tight">
              {evaluationResult === 'CORRECT'
                ? 'Verification Passed: Answer Matched!'
                : 'Verification Failed: Incorrect Answer Given!'}
            </span>
            <span className="text-[10px] opacity-80 mt-0.5">
              {evaluationResult === 'CORRECT'
                ? 'Caller confirmed private knowledge. Financial risk reduced.'
                : 'HIGH RISK: Caller failed to answer trusted security question.'}
            </span>
          </div>
        </div>
      ) : (
        /* Evaluation Input / Quick Responses */
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-[#949BA4]">
            Caller's verbal response:
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder='Type what caller answered (e.g., "Spice Garden")'
              value={callerResponse}
              onChange={(e) => setCallerResponse(e.target.value)}
              className="flex-1 bg-[#121114] border border-[#2B2D31] rounded-xl px-3 py-2 text-xs text-white placeholder-[#72767D] focus:outline-none focus:border-[#5865F2]"
            />
            <button
              type="submit"
              className="p-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Demo Simulator Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleQuickAnswer(question.hint || 'Correct Answer')}
              className="flex-1 py-1 bg-[#23A55A]/20 hover:bg-[#23A55A]/30 text-[#23A55A] border border-[#23A55A]/40 text-[10px] font-semibold rounded-lg"
            >
              ✓ Simulate Correct Answer
            </button>
            <button
              type="button"
              onClick={() => handleQuickAnswer('McDonalds')}
              className="flex-1 py-1 bg-[#ED4245]/20 hover:bg-[#ED4245]/30 text-[#ED4245] border border-[#ED4245]/40 text-[10px] font-semibold rounded-lg"
            >
              ✗ Simulate Wrong Answer
            </button>
          </div>
        </form>
      )}

      {/* Dismiss / Minimize button */}
      <button
        type="button"
        onClick={onDismiss}
        className="text-center text-[10px] text-[#949BA4] hover:text-white pt-1"
      >
        Dismiss Verification Box
      </button>
    </div>
  );
};
