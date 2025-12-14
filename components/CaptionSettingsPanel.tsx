import React from 'react';
import { X, Type, Sliders } from 'lucide-react';
import { CaptionSettings as CaptionSettingsType } from '../types';
import LanguageSelector from './LanguageSelector';

interface CaptionSettingsPanelProps {
  settings: CaptionSettingsType;
  onSettingsChange: (settings: CaptionSettingsType) => void;
  onClose: () => void;
}

const CaptionSettingsPanel: React.FC<CaptionSettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose
}) => {
  const updateSetting = <K extends keyof CaptionSettingsType>(
    key: K,
    value: CaptionSettingsType[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-neon/5 to-neon-purple/5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-neon/10 rounded-xl">
              <Type size={24} className="text-neon" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-white">Caption Settings</h2>
              <p className="text-sm text-secondary">Customize your live caption experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close settings"
            aria-label="Close settings"
            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Enable Captions */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <div className="font-bold text-white">Enable Captions</div>
              <div className="text-sm text-secondary">Show live captions during meeting</div>
            </div>
            <button
              onClick={() => updateSetting('enabled', !settings.enabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                settings.enabled ? 'bg-neon' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-Translate */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <div className="font-bold text-white">Auto-Translate</div>
              <div className="text-sm text-secondary">Translate captions to your language</div>
            </div>
            <button
              onClick={() => updateSetting('autoTranslate', !settings.autoTranslate)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                settings.autoTranslate ? 'bg-neon' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  settings.autoTranslate ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Target Language */}
          {settings.autoTranslate && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <LanguageSelector
                value={settings.targetLanguage}
                onChange={(lang) => updateSetting('targetLanguage', lang)}
                label="Translate to"
              />
            </div>
          )}

          {/* Font Size */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Type size={14} className="mr-2" />
              Font Size
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updateSetting('fontSize', size)}
                  className={`p-3 rounded-lg border transition-all ${
                    settings.fontSize === size
                      ? 'bg-neon/20 border-neon text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium capitalize">{size}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Background Opacity */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Sliders size={14} className="mr-2" />
              Background Opacity
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.backgroundOpacity}
                onChange={(e) => updateSetting('backgroundOpacity', parseFloat(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none bg-white/10 cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00f3ff ${settings.backgroundOpacity * 100}%, rgba(255,255,255,0.1) ${settings.backgroundOpacity * 100}%)`
                }}
              />
              <span className="text-sm text-white font-mono w-12 text-right">
                {Math.round(settings.backgroundOpacity * 100)}%
              </span>
            </div>
          </div>

          {/* Show Original + Translation */}
          {settings.autoTranslate && (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <div className="font-bold text-white">Show Both Languages</div>
                <div className="text-sm text-secondary">Display original and translation</div>
              </div>
              <button
                onClick={() => updateSetting('showOriginalAndTranslation', !settings.showOriginalAndTranslation)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  settings.showOriginalAndTranslation ? 'bg-neon' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    settings.showOriginalAndTranslation ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* TTS Options */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Audio Options (Optional)</h3>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <div className="font-bold text-white">Hear Translated Audio</div>
                <div className="text-sm text-secondary">Play TTS for incoming translations</div>
              </div>
              <button
                onClick={() => updateSetting('incomingTranslatedVoiceEnabled', !settings.incomingTranslatedVoiceEnabled)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  settings.incomingTranslatedVoiceEnabled ? 'bg-neon' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    settings.incomingTranslatedVoiceEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <div className="font-bold text-white">Hear Own Translation</div>
                <div className="text-sm text-secondary">Play TTS for your own speech</div>
              </div>
              <button
                onClick={() => updateSetting('hearOwnTranslationEnabled', !settings.hearOwnTranslationEnabled)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  settings.hearOwnTranslationEnabled ? 'bg-neon' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    settings.hearOwnTranslationEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
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

export default CaptionSettingsPanel;
