
import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { Send, ThumbsUp, Reply, AlertCircle, Trash2, X } from 'lucide-react';
import { useInteraction } from '../../context/InteractionContext';
import { useTranslation } from '../../context/TranslationContext';
import { useArticle } from '../../context/ArticleContext';

interface Comment {
  id: string;
  author: string;
  content: string;
  time: string;
  avatar: string;
  isMe?: boolean;
  votes: { up: number; down: number };
}

const INITIAL_MOCK_COMMENTS: Comment[] = [
  { id: '1', author: 'Sarah_V', content: "L'IA dans la mode c'est cool mais ça va tuer la créativité pure à mon avis. On va tous porter les mêmes trucs générés par algo.", time: '14:20', avatar: 'https://i.pravatar.cc/100?u=sarahv', votes: { up: 42, down: 5 } },
  { id: '2', author: 'Kylian_92', content: "C'est faux, au contraire ça libère du temps pour les créateurs pour se concentrer sur l'ADN de la marque.", time: '14:28', avatar: 'https://i.pravatar.cc/100?u=kylian', votes: { up: 128, down: 2 } },
  { id: '3', author: 'Marc_L', content: "Analyse très juste Kylian. L'IA n'est qu'un outil, pas un remplaçant.", time: '15:10', avatar: 'https://i.pravatar.cc/100?u=marc', votes: { up: 12, down: 0 } }
];

const MessageBubble = memo(({ 
  comment, focusId, onInteract, onReply, onDelete
}: { 
  comment: Comment; focusId?: string; onInteract: (id: string) => void; onReply: (author: string) => void; onDelete?: (id: string) => void;
}) => {
  const { isRead, markAsRead, toggleLike } = useInteraction();
  const { t } = useTranslation();
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusId === comment.id) {
        setShowActions(true);
        setIsHighlighted(true);
        setTimeout(() => setIsHighlighted(false), 2500);
    }
  }, [focusId, comment.id]);

  const toggleActions = useCallback(() => {
    if (isDeleted) return;
    if (isConfirmingDelete) {
        setIsConfirmingDelete(false);
        setShowActions(false);
        return;
    }
    markAsRead(comment.id);
    onInteract(comment.id);
    setShowActions(prev => !prev);
  }, [comment.id, markAsRead, onInteract, isConfirmingDelete, isDeleted]);

  const handleVoteUp = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (userVote !== 'up') {
          toggleLike(`comment-${comment.id}`); 
      }
      setUserVote(userVote === 'up' ? null : 'up');
  };

  const requestDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleted(true);
    if (onDelete) {
      setTimeout(() => onDelete(comment.id), 500); 
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(false);
  };

  const isActive = showActions;
  const isCurrentlyWhite = comment.isMe ? !isActive : isActive;
  
  // Suppression des animations CSS (animate-in, slide-in)
  return (
    <div 
      id={`comment-${comment.id}`} 
      ref={bubbleRef}
      className={`
        flex flex-col w-full transition-none relative
        ${isDeleted ? 'hidden' : 'opacity-100 mb-8 scale-100'}
        ${comment.isMe ? 'items-end' : 'items-start'}
      `}
    >
      <div className={`flex items-center gap-2 mb-2 ${comment.isMe ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
        {!comment.isMe && <img src={comment.avatar} className="w-6 h-6 rounded-full grayscale object-cover border border-white/10" loading="lazy" />}
        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
          {comment.author} <span className="mx-1 opacity-50">•</span> {comment.time}
        </span>
      </div>
      
      <div 
        onClick={toggleActions}
        className={`max-w-[85%] p-5 rounded-[24px] border cursor-pointer active:opacity-80
          ${isConfirmingDelete 
              ? 'border-[#ff0000] border-2 bg-zinc-900 text-white' 
              : (isHighlighted 
                  ? 'bg-zinc-800 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] text-white' 
                  : (isCurrentlyWhite 
                      ? 'bg-white text-black border-transparent' 
                      : 'bg-zinc-900 text-white border-white/5'
                    )
                )
          }
          ${comment.isMe ? 'rounded-tr-none' : 'rounded-tl-none'}
        `}
      >
        <p className="text-base font-bold leading-relaxed">{comment.content}</p>
      </div>

      {isActive && !isDeleted && (
        <div className="w-[85%] mt-3">
           {isConfirmingDelete ? (
             <div className="bg-[#ff0000] border border-[#ff0000] p-1 rounded-2xl flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase text-black tracking-widest pl-4">{t('DEBAT_DELETE_CONFIRM')}</span>
                <div className="flex items-center">
                    <button onClick={cancelDelete} className="px-4 py-2 text-black/50 hover:text-black font-black text-[10px] uppercase transition-colors">{t('UI_CANCEL')}</button>
                    <button onClick={confirmDelete} className="bg-black text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase active:scale-90 transition-transform">{t('UI_CONFIRM')}</button>
                </div>
             </div>
           ) : (
             <div className="flex items-center justify-between gap-2">
               <div className="bg-zinc-900 border border-white/10 p-1 rounded-2xl flex items-center">
                 <button onClick={handleVoteUp} className={`p-3 rounded-xl transition-all ${userVote === 'up' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
                   <ThumbsUp className="w-4 h-4" />
                   {userVote === 'up' && <span className="ml-2 text-xs font-black">{comment.votes.up + 1}</span>}
                 </button>
               </div>
               
               <div className="bg-zinc-900 border border-white/10 p-1 rounded-2xl flex items-center gap-1">
                 <button onClick={(e) => { e.stopPropagation(); onReply(comment.author); }} className="p-3 text-white/40 hover:text-white transition-colors"><Reply className="w-4 h-4" /></button>
                 <button className="p-3 text-white/40 hover:text-amber-500 transition-colors"><AlertCircle className="w-4 h-4" /></button>
                 {comment.isMe && (
                   <button onClick={requestDelete} className="p-3 text-white/40 hover:text-[#ff0000] transition-colors"><Trash2 className="w-4 h-4" /></button>
                 )}
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
});

interface DebatsModuleProps {
  focusId?: string;
  onCommentInteraction: () => void;
}

const DebatsModule: React.FC<DebatsModuleProps> = ({ focusId, onCommentInteraction }) => {
  const { t } = useTranslation();
  const { article } = useArticle();
  const [comments, setComments] = useState<Comment[]>(() => {
    try {
      const saved = localStorage.getItem(`cakenews-debats-${article?.id || 'v1'}`);
      return saved ? JSON.parse(saved) : INITIAL_MOCK_COMMENTS;
    } catch {
      return INITIAL_MOCK_COMMENTS;
    }
  });

  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { triggerHaptic, trackCommentPosted } = useInteraction();

  const scrollToBottom = () => {
      const container = document.getElementById('comments-container');
      if (container) setTimeout(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    if (!article?.id) return;
    try {
      localStorage.setItem(`cakenews-debats-${article.id}`, JSON.stringify(comments));
    } catch (e) { console.error("Storage full"); }
  }, [comments, article?.id]);

  useEffect(() => {
      if (focusId && comments.length > 0) {
          setTimeout(() => {
              const element = document.getElementById(`comment-${focusId}`);
              if (element) {
                  element.scrollIntoView({ behavior: 'auto', block: 'center' });
              }
          }, 100);
      }
  }, [focusId, comments]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    triggerHaptic('success');
    trackCommentPosted();

    const newComment: Comment = {
      id: Date.now().toString(),
      author: 'Moi',
      content: replyTo ? `@${replyTo} ${inputText}` : inputText,
      time: 'À l\'instant',
      avatar: 'https://i.pravatar.cc/150?u=me',
      isMe: true,
      votes: { up: 0, down: 0 }
    };

    setComments(prev => [...prev, newComment]);
    setInputText('');
    setReplyTo(null);
    onCommentInteraction();
    scrollToBottom();
  };

  const handleDelete = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    triggerHaptic('medium');
  };

  return (
    <div className="flex flex-col h-full relative" style={{ minHeight: '60vh' }}>
      <div id="comments-container" className="flex-1 pb-32">
        {comments.map((comment) => (
          <MessageBubble 
            key={comment.id} 
            comment={comment} 
            focusId={focusId} 
            onInteract={onCommentInteraction}
            onReply={setReplyTo}
            onDelete={handleDelete}
          />
        ))}
        
        {comments.length === 0 && (
           <div className="py-20 text-center opacity-30">
              <p className="text-xs font-black uppercase tracking-widest">{t('ROOM_EMPTY')}</p>
           </div>
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-black pt-4 pb-8 border-t border-white/5">
        {replyTo && (
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('ROOM_REPLY_TO')} {replyTo}</span>
            <button onClick={() => setReplyTo(null)}><X className="w-4 h-4 text-white/40" /></button>
          </div>
        )}
        
        <div className="flex items-end gap-3 bg-zinc-900 p-2 rounded-[28px] border border-white/10 relative">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('ROOM_INPUT_PLACEHOLDER')}
            className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-base text-white font-bold placeholder:text-white/20 min-h-[60px] max-h-[120px] resize-none"
            style={{ borderRadius: '20px' }}
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`p-4 rounded-[20px] mb-1 transition-all active:scale-95 ${inputText.trim() ? 'bg-white text-black' : 'bg-white/5 text-white/20'}`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebatsModule;
