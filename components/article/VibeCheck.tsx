
import React from 'react';
import { ArticleVibe, useInteraction } from '../../context/InteractionContext';
import { useTranslation } from '../../context/TranslationContext';

interface VibeCheckProps {
  articleId: string;
  accentColor: string;
}

const VibeCheck: React.FC<VibeCheckProps> = ({ articleId, accentColor }) => {
  const { articleVibes, setArticleVibe } = useInteraction();
  const { t } = useTranslation();
  const currentVibe = articleVibes[articleId] || null;

  const VIBES: { id: ArticleVibe; emoji: string; label: string }[] = [
    { id: 'shocked', emoji: '🤯', label: t('VIBE_SHOCKED') },
    { id: 'skeptical', emoji: '🤨', label: t('VIBE_SKEPTICAL') },
    { id: 'bullish', emoji: '🚀', label: t('VIBE_BULLISH') },
    { id: 'validated', emoji: '✅', label: t('VIBE_VALIDATED') },
  ];

  return (
    <div className="mt-16 mb-8 p-8 bg-zinc-950 border-2 border-white/5 rounded-[40px] relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <span className="text-4xl">🗳️</span>
      </div>
      
      <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-8 text-center">
        {t('VIBE_TITLE')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {VIBES.map((vibe) => (
          <button
            key={vibe.id}
            onClick={() => setArticleVibe(articleId, currentVibe === vibe.id ? null : vibe.id)}
            className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 active:scale-95 ${
              currentVibe === vibe.id 
                ? 'bg-white border-white text-black' 
                : 'bg-zinc-900 border-white/5 text-white/40'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className={`text-[9px] font-black uppercase tracking-widest ${currentVibe === vibe.id ? 'text-black/60' : 'text-white/20'}`}>
                {vibe.label}
              </span>
              <span className="text-xs font-[1000] mt-1">{vibe.id === 'bullish' ? '+12%' : 'Active'}</span>
            </div>
            <span className={`text-2xl transition-transform duration-500 ${currentVibe === vibe.id ? 'scale-125 rotate-12' : 'grayscale opacity-50'}`}>
              {vibe.emoji}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-8 text-[9px] font-bold text-center text-white/20 uppercase tracking-[0.2em] leading-relaxed">
        {t('VIBE_DESC')}
      </p>
    </div>
  );
};

export default VibeCheck;
