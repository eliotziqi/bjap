import React from 'react';

interface LeaveSummary {
  delta: number;
  multiplier: number;
  achievements: number;
  usedHints: boolean;
  hasPlayed: boolean;
  rounds: number;
}

interface SessionSummaryModalProps {
  leaveSummary: LeaveSummary | null;
  onClose: () => void;
}

const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({ leaveSummary, onClose }) => {
  if (!leaveSummary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl px-6 py-5 max-w-md w-full text-center space-y-3">
        <div className="text-sm uppercase tracking-widest text-gray-400">Session Summary</div>
        <div
          className={`text-2xl md:text-3xl font-black ${
            leaveSummary.delta > 0
              ? 'text-green-400'
              : leaveSummary.delta < 0
              ? 'text-red-400'
              : 'text-gray-200'
          }`}
        >
          {leaveSummary.delta > 0 &&
            `You win $${leaveSummary.delta} in total, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
          {leaveSummary.delta < 0 &&
            `You lose $${Math.abs(leaveSummary.delta)} in total, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
          {leaveSummary.delta === 0 &&
            `You broke even, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
        </div>
        {!leaveSummary.hasPlayed && (
          <div className="text-lg text-gray-400 font-semibold">No rounds played this table.</div>
        )}
        {leaveSummary.hasPlayed && (
          <div className="text-sm text-gray-300">
            Rounds played: {leaveSummary.rounds}
          </div>
        )}
        {leaveSummary.achievements > 0 && (
          <div className="text-yellow-300 font-semibold">
            ({leaveSummary.achievements} more achievement{leaveSummary.achievements > 1 ? 's' : ''} gained!)
          </div>
        )}
        {leaveSummary.usedHints && (
          <div className="text-xs text-red-300">Stats disabled for this session (hints used).</div>
        )}

        <button
          onClick={onClose}
          className="relative w-full mt-2 px-4 py-3 pr-12 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold border border-gray-700 transition"
        >
          <span className="block text-center">Close</span>
          <span className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center text-[11px] font-semibold rounded-md border bg-white/10 border-white/40">
            F
          </span>
        </button>
      </div>
    </div>
  );
};

export default SessionSummaryModal;
