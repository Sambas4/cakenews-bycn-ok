
import React, { useState } from 'react';
import { AppNotification, Message as MessageType } from '../../types';
import { Bell, Heart, AtSign, AlertTriangle, ThumbsUp, ThumbsDown, Reply, AlertCircle, Trash2, ShieldCheck, ArrowRight, CheckCircle } from 'lucide-react';

export const NotificationItem: React.FC<{ 
  notification: AppNotification; 
  onNavigate?: (id: string, commentId?: string) => void 
}> = ({ notification, onNavigate }) => {
  const getInteractionStyle = () => {
    switch (notification.type) {
      case 'like': return { icon: Heart, color: 'text-[#ff0000]' };
      case 'mention': return { icon: AtSign, color: 'text-sky-400' };
      case 'report': return { icon: AlertTriangle, color: 'text-amber-500' };
      default: return { icon: Bell, color: 'text-white/40' };
    }
  };

  const style = getInteractionStyle();
  const Icon = style.icon;
  const targetCommentId = notification.type === 'mention' ? '2' : notification.articleId === '1' ? '1' : undefined;

  return (
    <div 
      onClick={() => notification.articleId && onNavigate?.(notification.articleId, targetCommentId)}
      className={`group flex gap-4 p-6 rounded-[32px] border border-white/5 bg-zinc-900 transition-all active:scale-[0.98] mb-4 cursor-pointer hover:bg-zinc-800 ${!notification.isRead ? 'border-white/10' : 'opacity-60'}`}
    >
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 grayscale group-hover:grayscale-0 transition-all">
          <img src={notification.user.avatar} className="w-full h-full object-cover" alt={notification.user.name} />
        </div>
        <div className={`absolute -bottom-1 -right-1 p-1 bg-black rounded-full border border-white/5 ${style.color}`}>
          <Icon className="w-3 h-3 fill-current" />
        </div>
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="font-[1000] uppercase tracking-tight text-white flex items-center gap-2">
            {notification.user.name}
            {!notification.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000]"></span>}
          </span>
          <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">{notification.time}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed font-bold">{notification.content}</p>
      </div>
    </div>
  );
};

export const PrivateMessageBubble: React.FC<{ msg: MessageType; isMe?: boolean }> = ({ msg, isMe }) => {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [votes] = useState({ up: Math.floor(Math.random() * 20), down: Math.floor(Math.random() * 5) });

  const isActive = isSelected;
  const isCurrentlyWhite = isMe ? !isActive : isActive;

  const toggleSelection = () => {
    if (isDeleted) return;
    if (isConfirmingDelete) {
        setIsConfirmingDelete(false);
        setIsSelected(false);
        return;
    }
    setIsSelected(!isSelected);
  };

  const requestDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleted(true);
    setIsConfirmingDelete(false);
    setIsSelected(false);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(false);
  };

  // Suppression animate-in slide-in-from-bottom
  return (
    <div 
      className={`
        flex flex-col w-full transition-none
        ${isDeleted ? 'hidden' : 'opacity-100 mb-8'}
        ${isMe ? 'items-end' : 'items-start'}
      `}
    >
      <div className={`flex items-center gap-2 mb-2 ${isMe ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
        {!isMe && <img src={msg.avatar} className="w-6 h-6 rounded-full grayscale object-cover border border-white/10" alt={msg.sender} />}
        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
          {msg.sender} <span className="mx-1 opacity-50">•</span> {msg.time}
        </span>
      </div>
      
      <div 
        onClick={toggleSelection}
        className={`max-w-[85%] p-5 rounded-[24px] border cursor-pointer active:opacity-80
          ${isConfirmingDelete 
              ? 'border-[#ff0000] border-2 bg-zinc-900 text-white' 
              : (isCurrentlyWhite 
                  ? 'bg-white text-black border-transparent' 
                  : 'bg-zinc-900 text-white border-white/5'
                )
          } 
          ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}
        `}
      >
        <p className="text-base font-bold leading-relaxed">
          {msg.text}
        </p>
      </div>

      {isActive && !isDeleted && (
        <div className="w-[85%] mt-3">
           {isConfirmingDelete ? (
             <div className="bg-[#ff0000] border border-[#ff0000] p-1 rounded-2xl flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase text-black tracking-widest pl-4">Supprimer ?</span>
                <div className="flex items-center">
                    <button onClick={cancelDelete} className="px-4 py-2 text-black/50 hover:text-black font-black text-[10px] uppercase transition-colors">NON</button>
                    <button onClick={confirmDelete} className="bg-black text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase active:scale-90 transition-transform">OUI</button>
                </div>
             </div>
           ) : (
             <div className="bg-zinc-900 border border-white/10 p-1 rounded-2xl flex items-center justify-around">
               <button className="p-3 text-white/40 hover:text-white transition-colors"><Reply className="w-4 h-4" /></button>
               <button className="p-3 text-white/40 hover:text-white transition-colors"><AlertCircle className="w-4 h-4" /></button>
               <button onClick={requestDelete} className="p-3 text-white/40 hover:text-[#ff0000] transition-colors"><Trash2 className="w-4 h-4" /></button>
             </div>
           )}
        </div>
      )}

      {!isDeleted && (
        <div className={`flex items-center gap-2 mt-3 ${isMe ? 'mr-1' : 'ml-1'}`}>
          <button onClick={() => setUserVote(userVote === 'up' ? null : 'up')} className={`flex items-center gap-3 px-5 py-3 rounded-full transition-all active:scale-90 ${userVote === 'up' ? 'bg-white text-black' : 'bg-zinc-800 text-white/40'}`}>
            <ThumbsUp className="w-4 h-4" />
            <span className="text-xs font-black">{votes.up + (userVote === 'up' ? 1 : 0)}</span>
          </button>
          <button onClick={() => setUserVote(userVote === 'down' ? null : 'down')} className={`flex items-center gap-3 px-5 py-3 rounded-full transition-all active:scale-90 ${userVote === 'down' ? 'bg-[#ff0000] text-white' : 'bg-zinc-800 text-white/40'}`}>
            <ThumbsDown className="w-4 h-4" />
            <span className="text-xs font-black">{votes.down + (userVote === 'down' ? 1 : 0)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const OfficialMessageCard: React.FC<{ msg: MessageType; onNavigate?: (id: string) => void }> = ({ msg, onNavigate }) => {
  const isAudit = msg.sender === 'Audit CakeNews';
  
  if (isAudit) {
    return (
      <div className="relative group mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-zinc-900 rounded-[32px] border border-amber-500/20"></div>
        <div className="relative p-6 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-black" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-amber-500 font-[1000] uppercase tracking-tighter text-lg leading-none">AUDIT OFFICIEL</h3>
                <span className="text-amber-500/40 text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                   Investigation en cours
                </span>
              </div>
            </div>
            <span className="text-[10px] text-amber-500/40 font-black uppercase tracking-widest">{msg.time}</span>
          </div>
          <p className="text-base text-white font-bold leading-relaxed uppercase tracking-tight">{msg.text}</p>
          <div className="flex items-center justify-between mt-2 pt-6 border-t border-amber-500/10">
            <div className="flex items-center gap-3 text-amber-500/40">
              <CheckCircle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Preuve Reçue</span>
            </div>
            {msg.articleId && (
              <button onClick={() => onNavigate?.(msg.articleId!)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">
                Accéder <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-6 rounded-[32px] border border-white/5 bg-zinc-900 transition-all mb-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black flex-shrink-0 bg-white text-black text-xl">CN</div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2">
          <span className="font-[1000] uppercase tracking-tight text-white">{msg.sender}</span>
          <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">{msg.time}</span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed font-bold">{msg.text}</p>
      </div>
    </div>
  );
};
