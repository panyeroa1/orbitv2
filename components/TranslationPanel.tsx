import React, { useState } from 'react';
<

Zap, Volume2, Gauge, Award, BookOpen, X } from 'lucide-react';

interface TranslationPanelProps {
  sourceLang: string;
  targetLang: string;
  onSourceLangChange: (lang: string) => void;
  onTargetLangChange: (lang: string) => void;
  quality: 'speed' | 'balanced' | 'accuracy';
  onQualityChange: (quality: 'speed' | 'balanced' | 'accuracy') => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
  onClose: () => void;
}

const QUALITY_PRESETS = [
  {
    id: 'speed' as const,
    name: 'Speed',
    description: 'Fast translation with Gemini Flash',
    icon: <Zap size={20} />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  {
    id: 'balanced' as const,
    name: 'Balanced',
    description: 'Balance between speed and accuracy',
    icon: <Gauge size={20} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'accuracy' as const,
    name: 'Accuracy',
    description: 'Highest quality with Gemini Pro',
    icon: <Award size={20} />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  }
];

const VOICE_OPTIONS = [
  { id: 'Aoede', name: 'Aoede', description: 'Female, Warm' },
  { id: 'Charon', name: 'Orus', description: 'Male, Professional' },
  { id: 'Puck', name: 'Puck', description: 'Male, Friendly' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Male, Deep' },
  { id: 'Kore', name: 'Kore', description: 'Female, Clear' }
];

const TranslationPanel: React.FC<TranslationPanelProps> = ({
  sourceLang,
  targetLang,
  onSourceLangChange,
  onTargetLangChange,
  quality,
  onQualityChange,
  voice,
  onVoiceChange,
  onClose
}) => {
  const [glossary, setGlossary] = useState<Record<string, string>>({});
  const [newTerm, setNewTerm] = useState('');
  const [newTranslation, setNewTranslation] = useState('');

  const addGlossaryTerm = () => {
    if (newTerm && newTranslation) {
      setGlossary({ ...glossary, [newTerm]: newTranslation });
      setNewTerm('');
      setNewTranslation('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl max-h-[90vh] bg-surface border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-neon/5 to-neon-purple/5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-neon/10 rounded-xl">
              <Languages size={24} className="text-neon" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-white">Translation Settings</h2>
              <p className="text-sm text-secondary">Configure your real-time translation experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Language Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Globe size={18} className="text-neon" />
              <span>Language Pair</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LanguageSelector
                  value={sourceLang}
                  onChange={onSourceLangChange}
                  label="I speak"
                  showAutoDetect={true}
                />
              </div>
              <div>
                <LanguageSelector
                  value={targetLang}
                  onChange={onTargetLangChange}
                  label="Translate to"
                />
              </div>
            </div>
          </div>

          {/* Quality Preset */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Settings size={18} className="text-neon" />
              <span>Translation Quality</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {QUALITY_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onQualityChange(preset.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    quality === preset.id
                      ? `${preset.bgColor} ${preset.borderColor} shadow-lg`
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`mb-2 ${quality === preset.id ? preset.color : 'text-white/50'}`}>
                    {preset.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white mb-1">{preset.name}</div>
                    <div className="text-xs text-white/50">{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Volume2 size={18} className="text-neon" />
              <span>AI Voice</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VOICE_OPTIONS.map(v => (
                <button
                  key={v.id}
                  onClick={() => onVoiceChange(v.id)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    voice === v.id
                      ? 'bg-neon/10 border-neon text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-sm">{v.name}</div>
                  <div className="text-xs opacity-70">{v.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Glossary */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <BookOpen size={18} className="text-neon" />
              <span>Custom Glossary</span>
              <span className="text-xs text-white/30 font-normal">(Optional)</span>
            </h3>
            <p className="text-sm text-secondary">
              Add custom terms and their translations to ensure consistent terminology
            </p>

            <div className="bg-black/20 rounded-xl p-4 border border-white/10 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Original term..."
                  value={newTerm}
                  onChange={e => setNewTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-neon outline-none"
                />
                <input
                  type="text"
                  placeholder="Translation..."
                  value={newTranslation}
                  onChange={e => setNewTranslation(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-neon outline-none"
                />
              </div>
              <button
                onClick={addGlossaryTerm}
                disabled={!newTerm || !newTranslation}
                className="w-full bg-neon/10 text-neon border border-neon/30 rounded-lg py-2 text-sm font-medium hover:bg-neon/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add Term
              </button>

              {Object.keys(glossary).length > 0 && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {Object.entries(glossary).map(([term, translation]) => (
                    <div key={term} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-white">{term}</span>
                        <span className="text-white/30">→</span>
                        <span className="text-neon">{translation}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newGlossary = { ...glossary };
                          delete newGlossary[term];
                          setGlossary(newGlossary);
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="w-full bg-neon text-black font-bold py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,243,255,0.2)]"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;
