
import React, { useMemo } from 'react';
import { Play, Volume2, Mic, Twitter, Globe, Video } from 'lucide-react';

interface EchoMediaProps {
  type: 'video' | 'audio' | 'text' | 'tweet';
  imageUrl?: string;
}

const EchoMedia: React.FC<EchoMediaProps> = ({ type, imageUrl }) => {
  // OPTIMISATION: Même logique que pour ArticleCover
  const optimizedUrl = useMemo(() => {
    const rawUrl = imageUrl || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=800";
    if (!rawUrl.includes('unsplash.com')) return rawUrl;
    
    try {
      const url = new URL(rawUrl);
      url.searchParams.set('w', '800');
      url.searchParams.set('q', '70'); // Qualité un peu plus basse pour les miniatures secondaires
      url.searchParams.set('fm', 'webp');
      return url.toString();
    } catch (e) {
      return rawUrl;
    }
  }, [imageUrl]);

  const renderMedia = () => {
    try {
      switch (type) {
        case 'video':
          return (
            <div className="relative w-full h-full">
              <div className="absolute inset-0 flex items-center justify-center z-10">
                {/* CORRECTION: Suppression de animate-attention-pulse */}
                <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center border border-white/20">
                  <Play className="w-10 h-10 text-white fill-current" />
                </div>
              </div>
              <img src={optimizedUrl} className="w-full h-full object-cover opacity-60" loading="lazy" decoding="async" />
            </div>
          );
        case 'audio':
          return (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-zinc-800 to-black">
              {/* CORRECTION: Suppression de animate-pulse */}
              <Volume2 className="w-20 h-20 text-white mb-8" />
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-6 max-w-[200px]">
                {/* L'animation marquee est acceptable ici car c'est une barre de progression fictive, pas une icône */}
                <div className="w-1/2 h-full bg-white animate-marquee-left" style={{animationDuration: '3s'}}></div>
              </div>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.6em]">Flux Audio Mastered</span>
            </div>
          );
        default:
          return (
            <div className="relative w-full h-full p-12 flex items-center justify-center">
               <Twitter className="w-24 h-24 text-white/5 absolute opacity-20 rotate-12" />
               <img src={optimizedUrl} className="w-full h-full object-cover opacity-40 rounded-[40px]" loading="lazy" decoding="async" />
            </div>
          );
      }
    } catch (e) {
      return (
        <div className="flex items-center justify-center h-full bg-zinc-900">
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Erreur de chargement média</span>
        </div>
      );
    }
  };

  return (
    <div className="w-full aspect-video bg-zinc-950 rounded-[40px] overflow-hidden relative border border-white/5">
      {renderMedia()}
    </div>
  );
};

export default EchoMedia;
