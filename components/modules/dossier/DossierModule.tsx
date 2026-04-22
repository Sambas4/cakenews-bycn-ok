
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useArticle } from '../../../context/ArticleContext';
import DossierControls from './DossierControls';
import DossierParagraph from './DossierParagraph';
import VibeCheck from '../../article/VibeCheck';
import { Zap, Info, Play, Pause, Edit3, Volume2 } from 'lucide-react';
import { useTranslation } from '../../../context/TranslationContext';

interface DossierModuleProps {
  content: string;
  isEditable?: boolean;
  onUpdate?: (updates: any) => void;
}

const AudioBriefing: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const DURATION = 42; 

  // Timer logic simple pour l'UI, pas de visualizer complexe
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= DURATION) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`mt-8 p-6 bg-zinc-900 border transition-all duration-300 rounded-[32px] flex items-center gap-5 ${isPlaying ? 'border-white/20 bg-zinc-900' : 'border-white/10'}`}>
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0 group"
        style={{ backgroundColor: accentColor }}
      >
        {isPlaying ? (
            <Pause className="text-black w-6 h-6 fill-current" />
        ) : (
            <Play className="text-black w-6 h-6 fill-current ml-1" />
        )}
      </button>
      
      <div className="flex-1 flex flex-col gap-2 w-full">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
            {isPlaying ? <span className="text-[#ff0000] flex items-center gap-1"><Volume2 className="w-3 h-3" /> ON AIR</span> : t('DOSSIER_AUDIO_READY')}
          </span>
          <span className="text-[9px] font-bold text-white/30 tracking-tighter tabular-nums">
            {formatTime(currentTime)} / 00:42
          </span>
        </div>
        
        {/* Visualizer Statique (Moins de CPU) */}
        <div className="h-8 flex items-end gap-[2px] relative overflow-hidden">
           {Array(20).fill(0).map((_, i) => (
            <div 
              key={`bar-${i}`} 
              className="flex-1 rounded-t-sm"
              style={{ 
                  height: `${30 + (i % 5) * 10}%`,
                  backgroundColor: isPlaying ? accentColor : 'rgba(255,255,255,0.1)'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const EditorialSignature: React.FC<{ author: string; color: string }> = ({ author, color }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center pb-12">
      <div className="mb-6">
        {/* Signature SVG statique */}
        <svg width="140" height="50" viewBox="0 0 140 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M10 35C25 25 45 45 60 25C75 5 110 5 130 35M40 15L100 45" 
            stroke={color} 
            strokeWidth="2.5" 
            strokeLinecap="round" 
          />
        </svg>
      </div>
      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-2">{t('DOSSIER_SIGNATURE')}</span>
      <p 
        className="text-2xl font-[1000] uppercase italic tracking-normal" 
        style={{ color }}
      >
        {author}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{t('DOSSIER_ROLE')}</span>
      </div>
    </div>
  );
};

const DossierModule: React.FC<DossierModuleProps> = ({ 
  content, isEditable = false, onUpdate 
}) => {
  const { article, readingMode, setReadingMode, accentColor } = useArticle();
  const { t } = useTranslation();

  const paragraphs = useMemo(() => {
    return content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }, [content]);

  const handleParagraphChange = (index: number, newText: string) => {
    if (!onUpdate) return;
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = newText;
    const newContent = newParagraphs.join('\n\n');
    onUpdate({ content: newContent });
  };

  const handleTitleChange = (newTitle: string) => {
    if (onUpdate) onUpdate({ title: newTitle });
  };

  const handleSummaryChange = (newSummary: string) => {
    if (onUpdate) onUpdate({ summary: newSummary });
  };

  return (
    <div className="relative min-h-[400px]">
      <DossierControls 
        readingMode={readingMode}
        setReadingMode={setReadingMode}
      />

      {readingMode === 'deep' ? (
        <>
          {isEditable ? (
             <div className="relative group mb-14">
               <h2 
                 contentEditable
                 suppressContentEditableWarning
                 onBlur={(e) => handleTitleChange(e.currentTarget.innerText)}
                 className="text-[36px] font-[1000] leading-[1] tracking-normal uppercase text-white break-words outline-none border-b border-transparent focus:border-white/20 transition-colors"
                 style={{ wordSpacing: '0.15em' }}
               >
                 {article.title}
               </h2>
               <Edit3 className="absolute -left-6 top-2 w-4 h-4 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>
          ) : (
            <h2 
              className="text-[36px] font-[1000] leading-[1] mb-14 tracking-normal uppercase text-white break-words"
              style={{ wordSpacing: '0.15em' }}
            >
              {article.title}
            </h2>
          )}

          <div className="relative">
            {paragraphs.map((para, i) => (
                <DossierParagraph 
                  key={`para-${i}`} 
                  content={para} 
                  index={i} 
                  accentColor={accentColor}
                  isEditable={isEditable}
                  onUpdate={(text) => handleParagraphChange(i, text)}
                />
            ))}
          </div>
          <VibeCheck articleId={article.id} accentColor={accentColor} />
          <EditorialSignature author={article.author} color={accentColor} />
        </>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-white text-black">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-[14px] font-[1000] uppercase tracking-widest text-white">{t('DOSSIER_FLASH_LABEL')}</span>
          </div>
          
          <div className="p-10 bg-white text-black rounded-[40px] relative overflow-hidden mb-12 border border-black/5">
            <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
               <Zap className="w-32 h-32" />
            </div>
            <h2 
              className="text-[28px] font-[1000] leading-[1] uppercase tracking-normal mb-8 outline-none"
              style={{ wordSpacing: '0.15em' }}
              contentEditable={isEditable}
              suppressContentEditableWarning
              onBlur={(e) => handleTitleChange(e.currentTarget.innerText)}
            >
              {article.title}
            </h2>
            <p 
              className="text-xl font-black leading-tight uppercase tracking-tight outline-none"
              contentEditable={isEditable}
              suppressContentEditableWarning
              onBlur={(e) => handleSummaryChange(e.currentTarget.innerText)}
            >
              {article.summary}
            </p>
            
            <AudioBriefing accentColor={accentColor} />

            <div className="mt-10 pt-10 border-t border-black/10 flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest opacity-40">CakeNews Wire • {article.timestamp}</span>
               <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-black/10"></div>
                 <div className="w-2 h-2 rounded-full bg-black/10"></div>
                 <div className="w-2 h-2 rounded-full bg-black/40"></div>
               </div>
            </div>
          </div>

          <div className="py-8 px-6 bg-white/5 border border-dashed border-white/10 rounded-3xl flex items-start gap-4">
             <Info className="w-5 h-5 text-white/20 shrink-0" />
             <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
               Mode Flash : Synthèse rédigée par nos journalistes pour une lecture d'élite en 10s.
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DossierModule);
