import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackButtonsProps {
  segmentId?: string; // Optional: useful if we want to tie feedback to a specific segment later
  onFeedback: (score: 'up' | 'down') => void;
  className?: string;
}

export const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({
  segmentId,
  onFeedback,
  className = ''
}) => {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  const handleVote = (score: 'up' | 'down') => {
    if (voted) return; // Prevent multiple votes per instance
    setVoted(score);
    onFeedback(score);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => handleVote('up')}
        disabled={!!voted}
        className={`p-1.5 rounded-full transition-colors ${
          voted === 'up'
            ? 'bg-green-500/20 text-green-400'
            : voted
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-green-400 hover:bg-white/5'
        }`}
        title="Good translation"
      >
        <ThumbsUp size={16} />
      </button>

      <button
        onClick={() => handleVote('down')}
        disabled={!!voted}
        className={`p-1.5 rounded-full transition-colors ${
          voted === 'down'
            ? 'bg-red-500/20 text-red-400'
            : voted
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-red-400 hover:bg-white/5'
        }`}
        title="Bad translation"
      >
        <ThumbsDown size={16} />
      </button>
      
      {voted && (
        <span className="text-xs text-gray-500 animate-fade-in">
          Thanks!
        </span>
      )}
    </div>
  );
};

export default FeedbackButtons;
