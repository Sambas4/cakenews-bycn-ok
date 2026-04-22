
import React, { useState } from 'react';
import { Send, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface EchoChatProps {
  onClose: () => void;
  author: string;
}

const EchoChat: React.FC<EchoChatProps> = ({ onClose, author }) => {
  const [messages] = useState([
    { id: '1', author: 'Marc_K', text: "L'angle de vue est intéressant mais ils oublient l'aspect éthique.", time: '12:45', isMe: false, votes: { up: 12, down: 2 } },
    { id: '2', author: 'Toi', text: "Totalement d'accord, surtout sur la partie IA générative.", time: '12:48', isMe: true, votes: { up: 0, down: 0 } },
    { id: '3', author: 'Sarah_V', text: "C'est pourtant l'avenir, faut s'adapter.", time: '12:55', isMe: false, votes: { up: 45, down: 12 } },
  ]);

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col">
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black">
        <div>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] block mb-1">Débat Interne</span>
          <h3 className="text-xl font-black uppercase text-white tracking-tighter">Echo de {author}</h3>
        </div>
        <button onClick={onClose} className="p-4 bg-white/5 rounded-full hover:bg-white/10"><X className="w-6 h-6 text-white" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 mb-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">{msg.author}</span>
            </div>
            <div className={`max-w-[85%] p-5 rounded-[24px] text-base font-bold leading-relaxed border ${msg.isMe ? 'bg-white text-black border-transparent rounded-tr-none' : 'bg-zinc-900 text-white border-white/5 rounded-tl-none'}`}>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 pb-12 bg-black">
        <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-[24px] border border-white/10">
          <input type="text" placeholder="Ton avis sur cet écho..." className="flex-1 bg-transparent border-none outline-none px-4 text-base text-white font-bold" />
          <button className="p-4 bg-white text-black rounded-2xl active:scale-95 transition-transform"><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};

export default EchoChat;
