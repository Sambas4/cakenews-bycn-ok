
import React, { useState } from 'react';
import { ExternalVoice } from '../../../types';
import { X, Heart, MessageCircle, Share2, ExternalLink, Clock } from 'lucide-react';
import EchoMedia from './EchoMedia';
import EchoChat from './EchoChat';
import { useTranslation } from '../../../context/TranslationContext';

interface EchoViewerProps {
  voice: ExternalVoice;
  onClose: () => void;
  accentColor: string;
}

const EchoViewer: React.FC<EchoViewerProps> = ({ voice, onClose, accentColor }) => {
  const { t } = useTranslation();
  const [isLiked, setIsLiked] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const paragraphs = voice.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* HEADER SOLIDE */}
      <div className="sticky top-0 z-10 p-8 flex items-center justify-between bg-black border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-3xl font-[1000] uppercase tracking-[0.4em] text-white">{t('ROOM_TAB_ECHOES')}</span>
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mt-1">{t('ECHO_CERTIFICATION')}</span>
        </div>
        <button onClick={onClose} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-6 h-6 text-white" /></button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pb-24">
        <EchoMedia type={voice.type} />

        <div className="mt-12 flex items-center gap-4 bg-zinc-900 p-4 rounded-[32px] w-fit border border-white/5">
          <img src={voice.avatar} className="w-10 h-10 rounded-full grayscale border border-white/10" alt="" />
          <div>
            <span className="text-[13px] font-black text-white uppercase block leading-none">{voice.author}</span>
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1.5 block">{voice.source}</span>
          </div>
          <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
          <Clock className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[10px] font-bold text-white/30">REC. 14:20</span>
        </div>

        <h2 className="text-[40px] font-[1000] uppercase tracking-tighter text-white leading-[0.9] mt-10 mb-8">
            {voice.title || t('ECHO_TITLE_DEFAULT')}
        </h2>

        <div className="space-y-6 mb-10">
            {paragraphs.map((p, idx) => (
                <p key={idx} className="text-zinc-300 text-lg md:text-xl font-medium leading-relaxed">
                    {p}
                </p>
            ))}
        </div>

        <div className="p-8 bg-zinc-900 rounded-[40px] border border-white/5 mb-10">
          <p className="text-white/60 text-sm font-bold leading-relaxed uppercase tracking-tight">
            L'analyse de <span className="text-white">{voice.author}</span> confirme les signaux captés par notre audit. {voice.source} place cette information dans un contexte global de transformation radicale.
          </p>
        </div>

        <div className="mt-8">
          <div className="bg-zinc-900 border border-white/10 p-3 rounded-[40px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsLiked(!isLiked)} className="p-5 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 transition-all">
                <Heart className={`w-7 h-7 ${isLiked ? 'text-[#ff0000] fill-current' : 'text-white/40'}`} />
              </button>
              <button onClick={() => setShowChat(true)} className="p-5 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 transition-all">
                <MessageCircle className="w-7 h-7 text-white/40" />
              </button>
            </div>
            <div className="flex items-center gap-3 pr-2">
              <button className="p-5 bg-white/5 rounded-full text-white/40 hover:bg-white/10"><Share2 className="w-6 h-6" /></button>
              <button className="bg-white text-black px-8 py-5 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-transform">
                {t('ECHO_SOURCE_BTN')} <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showChat && <EchoChat author={voice.author} onClose={() => setShowChat(false)} />}
    </div>
  );
};

export default EchoViewer;
