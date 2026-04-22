
import React, { useState } from 'react';
import { Article } from '../../types';
import { Copy, Share2, Check, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ShareModalProps {
  article: Article;
  onClose: () => void;
}

const XLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="w-7 h-7 fill-current">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ShareModal: React.FC<ShareModalProps> = ({ article, onClose }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}#/article/${article.id}`;
  const shareText = `${article.title} - À lire sur Cakenews`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Lien copié', 'success');
      setTimeout(() => {
          setCopied(false);
          onClose();
      }, 500);
    } catch (err) {
      showToast('Erreur copie', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cakenews',
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err) { }
    } else {
      showToast('Non supporté', 'error');
    }
  };

  const openSocial = (platform: 'twitter' | 'whatsapp') => {
    let url = '';
    if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'whatsapp') {
      url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    }
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      {/* FOND NOIR SOLIDE - Pas d'animation */}
      <div 
        className="absolute inset-0 bg-black/95" 
        onClick={onClose} 
      />
      
      {/* Contenu Modal - Pas d'animation slide-in */}
      <div className="relative bg-zinc-950 border-t border-zinc-800 rounded-t-[32px] p-6 pb-12">
        
        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8" />
        
        <div className="text-center mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-2">Partager</h3>
            <h2 className="text-xl font-[1000] uppercase text-white tracking-tighter leading-none">Diffuser l'info</h2>
        </div>

        <div className="flex items-stretch gap-4 bg-black border border-zinc-800 p-3 rounded-[20px] mb-8 overflow-hidden">
            <div className="w-16 h-16 rounded-[14px] overflow-hidden shrink-0 bg-zinc-900">
                <img src={article.imageUrl} className="w-full h-full object-cover" alt="" loading="eager" />
            </div>
            
            <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded tracking-widest border border-zinc-800">
                        {article.category}
                    </span>
                </div>
                <h3 className="text-xs font-bold text-white leading-tight line-clamp-1 mb-1">
                    {article.title}
                </h3>
                <div className="flex items-center gap-1.5 text-zinc-600">
                    <LinkIcon className="w-3 h-3" />
                    <span className="text-[9px] font-mono lowercase truncate">cakenews.app/article/...</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
            <button onClick={handleCopy} className="flex flex-col items-center gap-2 group active:scale-95">
                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center border ${copied ? 'bg-[#ffcc00] text-black border-[#ffcc00]' : 'bg-zinc-900 text-white border-zinc-800'}`}>
                    {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                </div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Copier</span>
            </button>

            <button onClick={() => openSocial('twitter')} className="flex flex-col items-center gap-2 group active:scale-95">
                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-[20px] flex items-center justify-center text-white">
                    <XLogo />
                </div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">X</span>
            </button>

            <button onClick={() => openSocial('whatsapp')} className="flex flex-col items-center gap-2 group active:scale-95">
                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-[20px] flex items-center justify-center text-white">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">WhatsApp</span>
            </button>

            <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 group active:scale-95">
                <div className="w-14 h-14 bg-white text-black border border-white rounded-[20px] flex items-center justify-center">
                    <Share2 className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Plus</span>
            </button>
        </div>

        <button 
            onClick={onClose}
            className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-[16px] font-black uppercase text-xs tracking-[0.2em] text-zinc-400 active:bg-zinc-800"
        >
            Fermer
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
