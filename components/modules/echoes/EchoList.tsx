
import React from 'react';
import { ExternalVoice } from '../../../types';
import { Video, Mic, Twitter, Globe, ArrowUpRight, Edit2 } from 'lucide-react';
import { useInteraction } from '../../../context/InteractionContext';

interface EchoListProps {
  voices: ExternalVoice[];
  onSelect: (voice: ExternalVoice) => void;
  accentColor: string;
  isEditable?: boolean;
  onEchoUpdate?: (voice: ExternalVoice) => void;
}

const EchoList: React.FC<EchoListProps> = ({ voices, onSelect, accentColor, isEditable, onEchoUpdate }) => {
  const { isRead } = useInteraction();
  
  const getIcon = (type: string) => {
    switch(type) {
      case 'video': return Video;
      case 'audio': return Mic;
      case 'tweet': return Twitter;
      default: return Globe;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6 opacity-40">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Réseau d'Échos</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {voices.map(voice => {
          const Icon = getIcon(voice.type);
          const read = isRead(voice.id);
          
          return (
            <div 
              key={voice.id} 
              onClick={() => onSelect(voice)}
              className={`group relative bg-zinc-900 border border-white/5 p-6 rounded-[32px] transition-all cursor-pointer hover:bg-zinc-800 ${isEditable ? 'hover:border-white/20' : 'active:scale-[0.97]'}`}
            >
              {!read && !isEditable && (
                // CORRECTION: Utilisation de animate-flash pour le point de notification
                <div className="absolute top-5 right-5 w-2 h-2 bg-green-500 rounded-full animate-flash" />
              )}
              {isEditable && (
                  <div className="absolute top-5 right-5 text-[8px] font-black uppercase text-white/20 flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> ÉDITER
                  </div>
              )}
              
              <div className="flex items-center gap-4 mb-6">
                <img src={voice.avatar} className="w-10 h-10 rounded-full border border-white/5 grayscale group-hover:grayscale-0 transition-all" alt="" />
                <div className="flex flex-col min-w-0">
                  <span 
                    className={`text-[12px] font-black text-white uppercase truncate outline-none ${isEditable ? 'border-b border-transparent focus:border-white/20' : ''}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => onEchoUpdate?.({...voice, author: e.currentTarget.innerText})}
                    onClick={(e) => e.stopPropagation()}
                  >
                      {voice.author}
                  </span>
                  
                  {/* SOURCE EDITABLE AVEC MENTION "SELON" */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.1em]">SELON</span>
                    <span 
                        className={`text-[8px] font-bold text-white/50 uppercase tracking-[0.2em] outline-none ${isEditable ? 'border-b border-transparent focus:border-white/20 bg-white/5 px-1 rounded' : ''}`}
                        contentEditable={isEditable}
                        suppressContentEditableWarning
                        onBlur={(e) => onEchoUpdate?.({...voice, source: e.currentTarget.innerText})}
                        onClick={(e) => isEditable && e.stopPropagation()}
                    >
                        {voice.source}
                    </span>
                  </div>
                </div>
                <div className="ml-auto p-3 bg-white/5 rounded-2xl group-hover:bg-white/10">
                  <Icon className="w-4 h-4 text-white/20 group-hover:text-white" />
                </div>
              </div>

              {/* TITRE ÉCHO */}
              <h3 
                  className={`text-[18px] font-[1000] uppercase text-white mb-3 outline-none leading-none tracking-tight ${isEditable ? 'border-b border-transparent focus:border-white/20 hover:bg-white/5' : ''}`}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => onEchoUpdate?.({...voice, title: e.currentTarget.innerText})}
                  onClick={(e) => isEditable && e.stopPropagation()}
              >
                  {voice.title || "Titre de l'écho"}
              </h3>

              {/* CONTENU AVEC SAUTS DE LIGNE (PARAGRAPHES VISUELS) */}
              <div 
                className={`text-[14px] font-medium text-zinc-300 leading-relaxed outline-none whitespace-pre-wrap ${isEditable ? 'border-b border-transparent focus:border-white/20 hover:bg-white/5 p-1 rounded' : 'line-clamp-3'}`}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onBlur={(e) => onEchoUpdate?.({...voice, content: e.currentTarget.innerText})}
                onClick={(e) => isEditable && e.stopPropagation()}
              >
                {voice.content}
              </div>

              <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">Analyse Complète</span>
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EchoList;
