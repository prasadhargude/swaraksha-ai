import React from 'react';
import { DEMO_SCENARIOS } from '../services/demoScenarios';
import { DemoScenarioId } from '../types/speakerFingerprint';
import { soundEffects } from '../services/soundEffects';
import {
  Sparkles,
  ShieldCheck,
  UserX,
  Bot,
  AlertTriangle,
  Play,
  CheckCircle2,
} from 'lucide-react';

interface DemoScenariosSelectorProps {
  onSelectScenario: (scenarioId: DemoScenarioId) => void;
  onClose: () => void;
}

export const DemoScenariosSelector: React.FC<DemoScenariosSelectorProps> = ({
  onSelectScenario,
  onClose,
}) => {
  const scenarios = Object.values(DEMO_SCENARIOS);

  const getIcon = (id: DemoScenarioId) => {
    switch (id) {
      case 'trusted_caller':
        return <ShieldCheck className="w-5 h-5 text-[#23A55A]" />;
      case 'different_speaker':
        return <UserX className="w-5 h-5 text-[#FEE75C]" />;
      case 'ai_banking_scam':
        return <Bot className="w-5 h-5 text-[#ED4245]" />;
      case 'real_voice_scam':
        return <AlertTriangle className="w-5 h-5 text-[#EB459E]" />;
    }
  };

  const handleSelect = (id: DemoScenarioId) => {
    soundEffects.vibrate(25);
    onSelectScenario(id);
    onClose();
  };

  return (
    <div
      id="demo-scenarios-modal"
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="w-full max-w-md bg-[#181A1D] border border-[#2B2D31] rounded-2xl p-5 shadow-2xl flex flex-col gap-3 text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#2B2D31]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#5865F2]/20 text-[#5865F2]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Interactive Security Scenarios</h3>
              <p className="text-[11px] text-[#949BA4]">Demonstrate multi-signal voice & risk pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="text-xs text-[#949BA4] px-2 py-1 bg-[#232428] rounded">
            Close
          </button>
        </div>

        <p className="text-xs text-[#DBDEE1]">
          Select any of the 4 benchmark test scenarios to test continuous speaker verification,
          speaker change detection, and context-aware active questions:
        </p>

        {/* List of 4 scenarios */}
        <div className="flex flex-col gap-2.5 my-1">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleSelect(sc.id)}
              className="p-3.5 rounded-2xl bg-[#121316] border border-[#2B2D31] hover:border-[#5865F2] hover:bg-[#1A1C24] transition-all text-left flex items-start gap-3 group"
            >
              <div className="p-2 rounded-xl bg-[#1E2025] shrink-0 mt-0.5">{getIcon(sc.id)}</div>
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-[#5865F2] transition-colors">
                    {sc.title}
                  </span>
                  <span className="text-[10px] text-[#5865F2] font-semibold flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" />
                    Simulate
                  </span>
                </div>
                <p className="text-[11px] text-[#949BA4] mt-1 leading-snug">{sc.description}</p>
                <div className="mt-2 pt-2 border-t border-[#232428] flex items-center justify-between text-[10px]">
                  <span className="text-[#72767D]">Expected:</span>
                  <span className="text-[#23A55A] font-medium">{sc.expectedOutcome}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
