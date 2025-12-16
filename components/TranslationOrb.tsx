import React from 'react';
import './TranslationOrb.css';

interface TranslationOrbProps {
  /** Current state: idle, listening, or translating */
  state: 'idle' | 'listening' | 'translating';
  /** Optional label to display */
  label?: string;
  /** Size in pixels */
  size?: number;
}

/**
 * Animated orb visualizer for translation states
 * 
 * States:
 * - idle: Static dim orb
 * - listening: Pulsing blue orb (user is speaking)
 * - translating: Spinning purple orb (Gemini is translating)
 */
export const TranslationOrb: React.FC<TranslationOrbProps> = ({
  state,
  label,
  size = 150
}) => {
  const getStatusLabel = () => {
    // 1. Explicit label overrides all (used for 'Reconnecting...', 'Error', etc.)
    if (label) return label;
    
    // 2. Default state labels
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'translating':
        return 'Translating...';
      case 'idle':
      default:
        return 'Ready';
    }
  };

  const getStatusDetail = () => {
    // If there's an explicit label (like "Reconnecting..."), we might want to hide the detail or show a generic message
    if (label) return ''; 

    switch (state) {
      case 'listening':
        return 'Speak now';
      case 'translating':
        return 'Processing your speech';
      case 'idle':
      default:
        return 'Press start to begin';
    }
  };

  return (
    <div className="translation-orb-container">
      <div 
        className="translation-orb-wrapper"
        style={{ width: size + 50, height: size + 50 }}
      >
        <div
          className={`translation-orb ${state}`}
          style={{ width: size, height: size }}
        />
      </div>
      
      <div className={`translation-status ${state}`}>
        {getStatusLabel()}
      </div>
      
      <div className="translation-status-detail">
        {getStatusDetail()}
      </div>
    </div>
  );
};

export default TranslationOrb;

