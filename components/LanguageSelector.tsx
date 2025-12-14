import React, { useState, useMemo } from 'react';
import { Search, Check, Globe2 } from 'lucide-react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' }
];

interface LanguageSelectorProps {
  value: string;
  onChange: (langCode: string) => void;
  label?: string;
  showAutoDetect?: boolean;
  recentLanguages?: string[];
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  label = 'Select Language',
  showAutoDetect = false,
  recentLanguages = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedLanguage = useMemo(
    () => LANGUAGES.find(l => l.code === value) || LANGUAGES[0],
    [value]
  );

  const filteredLanguages = useMemo(() => {
    if (!searchQuery) return LANGUAGES;
    const query = searchQuery.toLowerCase();
    return LANGUAGES.filter(
      l =>
        l.name.toLowerCase().includes(query) ||
        l.nativeName.toLowerCase().includes(query) ||
        l.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const recentLangs = useMemo(
    () => LANGUAGES.filter(l => recentLanguages.includes(l.code)),
    [recentLanguages]
  );

  return (
    <div className="relative">
      <label className="text-xs text-secondary font-bold uppercase mb-1 block">{label}</label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white hover:border-neon transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{selectedLanguage.flag}</span>
          <div className="text-left">
            <div className="text-sm font-medium">{selectedLanguage.name}</div>
            <div className="text-xs text-white/50">{selectedLanguage.nativeName}</div>
          </div>
        </div>
        <Globe2 size={16} className="text-white/30 group-hover:text-neon transition-colors" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-2 w-full bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-neon outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {showAutoDetect && (
                <button
                  onClick={() => {
                    onChange('auto');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🔍</span>
                    <div>
                      <div className="text-sm font-medium text-neon">Auto-Detect</div>
                      <div className="text-xs text-white/50">Automatically detect language</div>
                    </div>
                  </div>
                  {value === 'auto' && <Check size={16} className="text-neon" />}
                </button>
              )}

              {recentLangs.length > 0 && (
                <div className="border-b border-white/5">
                  <div className="px-3 py-2 text-xs font-bold text-white/30 uppercase tracking-wider">Recent</div>
                  {recentLangs.map(lang => (
                    <button
                      key={`recent-${lang.code}`}
                      onClick={() => {
                        onChange(lang.code);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">{lang.name}</div>
                          <div className="text-xs text-white/50">{lang.nativeName}</div>
                        </div>
                      </div>
                      {value === lang.code && <Check size={16} className="text-neon" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-3 py-2 text-xs font-bold text-white/30 uppercase tracking-wider">
                All Languages
              </div>
              {filteredLanguages.length === 0 ? (
                <div className="p-6 text-center text-white/30 text-sm">No languages found</div>
              ) : (
                filteredLanguages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onChange(lang.code);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">{lang.name}</div>
                        <div className="text-xs text-white/50">{lang.nativeName}</div>
                      </div>
                    </div>
                    {value === lang.code && <Check size={16} className="text-neon" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
export { LANGUAGES };
