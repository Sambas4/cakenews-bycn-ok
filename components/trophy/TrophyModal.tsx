
import React, { useState } from 'react';
import { X, Share2, Download, ShieldCheck, QrCode } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface TrophyData {
  rank: number;
  name: string;
  score: string;
  label: string;
  category: string;
  color: string;
  avatar: string;
}

interface TrophyModalProps {
  data: TrophyData;
  onClose: () => void;
}

const TrophyModal: React.FC<TrophyModalProps> = ({ data, onClose }) => {
  const { t } = useTranslation();
  const [isShared, setIsShared] = useState(false);
  
  const certificateId = `CN-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://cakenews.app/verify/${certificateId}&color=000000&bgcolor=FFFFFF&margin=0`;

  const handleShare = () => {
    setIsShared(true);
    setTimeout(() => setIsShared(false), 2000);
  };

  const getRankLabel = (rank: number) => {
    if (rank === 1) return t('RANK_LEGEND');
    if (rank <= 3) return t('RANK_ELITE');
    if (rank <= 10) return t('RANK_TOP10');
    return t('RANK_RANKED');
  };

  const rankLabel = getRankLabel(data.rank);

  return (
    <div className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-center p-6 pb-24">
      
      <div className="absolute top-0 w-full p-6 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">{t('HOF_SUB')}</span>
          <span className="text-white font-black uppercase tracking-widest text-sm">{t('TROPHY_LABEL')}</span>
        </div>
        <button onClick={onClose} className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-all border border-zinc-800">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="w-full max-w-sm aspect-[3/4] relative">
        <div 
          className="w-full h-full rounded-[40px] relative overflow-hidden bg-black border-2 border-zinc-800"
        >
          <div 
            className="absolute inset-0 opacity-10 z-0" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', 
              backgroundSize: '20px 20px' 
            }}
          />

          <div className="relative z-10 flex flex-col items-center justify-between h-full p-8 py-8">
            
            <div className="flex flex-col items-center">
               <div className="relative mb-4">
                 <div className="w-20 h-20 rounded-full p-1 bg-zinc-900 border border-zinc-800">
                   <img src={data.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                 </div>
                 <div 
                   className="absolute -bottom-3 -right-3 w-10 h-10 flex items-center justify-center rounded-xl font-[1000] text-lg border-2 border-black"
                   style={{ backgroundColor: data.color, color: '#000' }}
                 >
                   #{data.rank}
                 </div>
               </div>
               
               <h2 className="text-2xl font-[1000] uppercase text-white tracking-tight mb-2 text-center leading-none">
                 {data.name}
               </h2>
               <div className="px-4 py-1 rounded-full border border-white/20 bg-zinc-900">
                 <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60">
                   {rankLabel} • {data.category.split('(')[0]}
                 </span>
               </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6 w-full border-y border-zinc-800 my-2">
               <span 
                 className="text-[48px] font-[1000] leading-none tracking-tighter"
                 style={{ color: data.color }}
               >
                 {data.score}
               </span>
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-2">
                 {data.label}
               </span>
            </div>

            <div className="w-full flex items-end justify-between mt-auto">
               <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2 opacity-50">
                   <ShieldCheck className="w-4 h-4 text-white" />
                   <span className="text-[8px] font-bold text-white uppercase tracking-widest">{t('HOF_VERIFIED')}</span>
                 </div>
                 <div className="p-2 bg-white rounded-lg w-fit">
                   <img src={qrCodeUrl} className="w-16 h-16 mix-blend-multiply opacity-90" alt="QR Code de vérification" />
                 </div>
                 <span className="text-[6px] font-mono text-white/30 uppercase tracking-widest">{certificateId}</span>
               </div>
               
               <div className="flex flex-col items-end">
                  <div className="w-10 h-10 border border-white/20 rounded flex items-center justify-center mb-1 bg-zinc-900">
                   <span className="font-[1000] text-xs text-white">CN</span>
                  </div>
                  <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em]">Scanner pour vérifier</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-8 w-full max-w-sm">
        <button 
          onClick={handleShare}
          className="flex-1 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          {isShared ? t('TROPHY_COPIED') : (
            <>
              {t('TROPHY_SHARE_BTN')} <Share2 className="w-4 h-4" />
            </>
          )}
        </button>
        <button className="py-5 px-6 bg-zinc-900 text-white rounded-2xl active:scale-95 transition-all border border-zinc-800">
          <Download className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 mt-6 opacity-40">
        <QrCode className="w-3 h-3 text-white" />
        <p className="text-[9px] text-white font-bold uppercase tracking-widest">
           {t('TROPHY_ANTI_FAKE')}
        </p>
      </div>
    </div>
  );
};

export default TrophyModal;
