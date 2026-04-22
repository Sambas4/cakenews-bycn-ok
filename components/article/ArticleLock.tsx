
import React from 'react';
import { AlertTriangle, Eye, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface ArticleLockProps {
  isActive: boolean;
  isUnlocked: boolean;
  isSensitive?: boolean;
  onUnlock: () => void;
  onSkip: () => void;
}

const ArticleLock: React.FC<ArticleLockProps> = ({
  isActive,
  isUnlocked,
  isSensitive,
  onUnlock,
  onSkip
}) => {
  const { t } = useTranslation();

  if (isUnlocked || !isSensitive || !isActive) return null;

  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/95">
       <div className="w-full max-w-md bg-zinc-900 border-t-4 border-[#ffcc00] rounded-t-[50px] p-10 pb-32 flex flex-col items-center">
         
         <div className="w-20 h-20 bg-[#ffcc00] rounded-[28px] flex items-center justify-center mb-8">
           <AlertTriangle className="w-10 h-10 text-black" />
         </div>
         
         <div className="flex flex-col items-center">
           <h2 className="text-[32px] font-[1000] text-[#ffcc00] uppercase tracking-tighter text-center leading-[0.9] mb-4">
             {t('LOCK_TITLE').split(' ').map((word, i) => <span key={i} className="block">{word}</span>)}
           </h2>
           <p className="text-white text-[12px] font-bold uppercase tracking-[0.2em] text-center leading-relaxed mb-12 opacity-60 max-w-[240px]">
             {t('LOCK_DESC')}
           </p>
         </div>
         
         <div className="flex flex-col gap-4 w-full px-2">
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onUnlock();
             }}
             className="w-full py-6 bg-[#ffcc00] text-black font-black uppercase text-[14px] tracking-[0.4em] rounded-[24px] flex items-center justify-center gap-4 active:scale-90 transition-all"
           >
             <Eye className="w-6 h-6" /> {t('LOCK_UNLOCK')}
           </button>
           <button 
             onClick={onSkip}
             className="w-full py-5 bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-[24px] flex items-center justify-center gap-3 active:scale-95 transition-opacity opacity-30 hover:opacity-100"
           >
             {t('LOCK_SKIP')} <ArrowRight className="w-5 h-5" />
           </button>
         </div>
       </div>
    </div>
  );
};

export default ArticleLock;
