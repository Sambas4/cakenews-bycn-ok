
import React from 'react';
import { AlertTriangle, ChevronRight, FileText } from 'lucide-react';
import { useBroadcast } from '../../context/BroadcastContext';
import { useTranslation } from '../../context/TranslationContext';

interface BreakingNewsOverlayProps {
  onNavigate?: (articleId: string) => void;
}

const BreakingNewsOverlay: React.FC<BreakingNewsOverlayProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { activeAlert, dismissAlert } = useBroadcast();

  // Suppression de la logique d'état local (isVisible) et des timeouts d'animation.
  // Affichage direct basé sur le contexte.
  if (!activeAlert) return null;

  const handlePrimaryAction = () => {
    dismissAlert(activeAlert.id);
    if (activeAlert.linkedArticleId && onNavigate) {
        onNavigate(activeAlert.linkedArticleId!);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black pointer-events-auto">
      {/* FOND ROUGE SOLIDE - Pas de dégradé, pas d'animation */}
      <div className="absolute inset-0 bg-[#8a0000]"></div>

      <div className="relative z-20 w-full max-w-md p-8 flex flex-col items-center text-center">
        {/* ICONE STATIQUE */}
        <div className="mb-8 relative">
            <div className="relative w-24 h-24 bg-white text-red-600 rounded-full flex items-center justify-center border-4 border-red-500">
                <AlertTriangle className="w-12 h-12 fill-current" />
            </div>
        </div>

        {/* HEADER */}
        <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-black border border-white/20 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">{t('OVERLAY_INTERRUPTION')}</span>
            </div>
            <h1 className="text-5xl font-[1000] uppercase tracking-tighter leading-[0.85] text-white italic">
                {t('OVERLAY_FLASH_TITLE').split(' ').map((word, i) => (
                    <React.Fragment key={i}>
                        {word}<br/>
                    </React.Fragment>
                ))}
            </h1>
        </div>

        {/* CONTENU MESSAGE */}
        <div className="mb-12 w-full">
            <div className="bg-black border-l-4 border-white p-6 rounded-r-2xl text-left">
                <p className="text-2xl md:text-3xl font-[1000] uppercase leading-[0.95] text-white">
                    {activeAlert.message}
                </p>
                {activeAlert.targeting.locations.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-white px-2 py-0.5 rounded">
                            ZONE IMPACTÉE
                        </span>
                        <span className="text-[10px] font-bold text-white/70 uppercase">
                            {activeAlert.targeting.locations.join(', ')}
                        </span>
                    </div>
                )}
            </div>
        </div>

        {/* ACTIONS */}
        <div className="w-full space-y-3">
            {activeAlert.linkedArticleId ? (
                <button 
                    onClick={handlePrimaryAction}
                    className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3 active:bg-zinc-200"
                >
                    {t('OVERLAY_OPEN')} <FileText className="w-5 h-5" />
                </button>
            ) : (
                <div className="h-4"></div>
            )}
            
            <button 
                onClick={() => dismissAlert(activeAlert.id)}
                className="w-full py-4 text-white/60 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white flex items-center justify-center gap-2"
            >
                {activeAlert.linkedArticleId ? t('OVERLAY_IGNORE') : t('OVERLAY_IGNORE')} <ChevronRight className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default BreakingNewsOverlay;
