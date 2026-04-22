
import React from 'react';

interface DossierParagraphProps {
  content: string;
  index: number;
  accentColor: string;
  isEditable?: boolean;
  onUpdate?: (text: string) => void;
}

const DossierParagraph: React.FC<DossierParagraphProps> = ({ content, index, accentColor, isEditable = false, onUpdate }) => {
  if (!content.trim() && !isEditable) return null;

  return (
    <div className="relative group mb-10 last:mb-0">
        <p 
          className={`text-zinc-200 text-[19px] md:text-2xl leading-[1.7] font-medium relative text-left outline-none ${isEditable ? 'hover:bg-white/5 p-2 rounded-lg transition-colors border border-transparent focus:border-white/20' : ''}`}
          style={{ contentVisibility: 'auto' }}
          contentEditable={isEditable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.(e.currentTarget.innerText)}
        >
          {index === 0 && !isEditable ? (
            <>
              <span 
                style={{ color: accentColor }} 
                className="float-left text-[85px] font-[1000] mr-4 leading-[0.7] select-none uppercase italic-none"
              >
                {content.charAt(0)}
              </span>
              <span className="normal-case">{content.slice(1)}</span>
            </>
          ) : (
            <span className="normal-case">{content}</span>
          )}
        </p>
        {isEditable && (
            <span className="absolute right-0 top-0 text-[8px] font-black uppercase text-white/20 opacity-0 group-hover:opacity-100 pointer-events-none">
                EDIT
            </span>
        )}
    </div>
  );
};

export default React.memo(DossierParagraph);
