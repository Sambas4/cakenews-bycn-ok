
import React from 'react';
import { AlignLeft, Zap } from 'lucide-react';

interface DossierControlsProps {
  readingMode: 'flash' | 'deep';
  setReadingMode: (mode: 'flash' | 'deep') => void;
}

const DossierControls: React.FC<DossierControlsProps> = ({ 
  readingMode, setReadingMode
}) => {
  return (
    <div className="mb-12">
      <div className="flex bg-zinc-900/50 p-1 border border-white/5 rounded-2xl">
        <button 
          onClick={() => setReadingMode('deep')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${readingMode === 'deep' ? 'bg-white text-black' : 'text-white/40'}`}
        >
          <AlignLeft className="w-4 h-4" /> Immersion
        </button>
        <button 
          onClick={() => setReadingMode('flash')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${readingMode === 'flash' ? 'bg-white text-black' : 'text-white/40'}`}
        >
          <Zap className="w-4 h-4" /> Flash
        </button>
      </div>
    </div>
  );
};

export default React.memo(DossierControls);
