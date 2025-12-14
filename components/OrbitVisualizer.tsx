import React from 'react';

interface OrbitVisualizerProps {
  isActive: boolean;
  state: 'listening' | 'processing' | 'speaking' | 'idle';
}

const OrbitVisualizer: React.FC<OrbitVisualizerProps> = ({ isActive, state }) => {
  // Determine colors and animation speeds based on state
  const getColor = () => {
    switch(state) {
      case 'listening': return 'border-neon';
      case 'processing': return 'border-neon-purple';
      case 'speaking': return 'border-neon-pink';
      default: return 'border-white/20';
    }
  };

  const getShadow = () => {
    switch(state) {
      case 'listening': return 'shadow-[0_0_30px_rgba(0,243,255,0.4)]';
      case 'processing': return 'shadow-[0_0_30px_rgba(189,0,255,0.4)]';
      case 'speaking': return 'shadow-[0_0_50px_rgba(255,0,85,0.6)]';
      default: return '';
    }
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Ring */}
      <div className={`absolute w-full h-full rounded-full border-[1px] ${state === 'idle' ? 'border-white/5' : 'border-white/10'} animate-[spin_10s_linear_infinite]`}>
         <div className="absolute top-0 left-1/2 w-2 h-2 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Middle Ring (Opposite Spin) */}
      <div className={`absolute w-48 h-48 rounded-full border-[1px] border-white/5 animate-[spin_15s_linear_infinite_reverse]`}>
         <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-white/30 rounded-full -translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* Core Ring (Active State) */}
      <div 
        className={`relative w-32 h-32 rounded-full border-4 transition-all duration-500 ease-in-out flex items-center justify-center bg-black/40 backdrop-blur-md ${getColor()} ${getShadow()} ${state === 'listening' || state === 'speaking' ? 'scale-110' : 'scale-100'}`}
      >
        {/* Pulse Effect */}
        {isActive && (
           <div className={`absolute inset-0 rounded-full border-2 ${getColor()} animate-ping opacity-20`}></div>
        )}

        <div className="text-xs font-display tracking-widest text-white/80 uppercase">
          {state}
        </div>
      </div>
    </div>
  );
};

export default OrbitVisualizer;
