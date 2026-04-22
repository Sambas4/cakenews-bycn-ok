
import React, { useState, useEffect } from 'react';
import { X, Search, ShieldCheck, QrCode, ExternalLink, Trophy } from 'lucide-react';
import { MOCK_HALL_OF_FAME } from '../../data/mockData';
import { useTranslation } from '../../context/TranslationContext';

interface HallOfFameProps {
  initialSearchId?: string;
  onClose: () => void;
}

const HallOfFame: React.FC<HallOfFameProps> = ({ initialSearchId, onClose }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(initialSearchId || '');
  const [isScanning, setIsScanning] = useState(false);
  const [filteredResults, setFilteredResults] = useState(MOCK_HALL_OF_FAME);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResults(MOCK_HALL_OF_FAME);
    } else {
      setFilteredResults(
        MOCK_HALL_OF_FAME.filter(item => 
          item.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.user.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm]);

  const handleScanMock = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setSearchTerm('CN-2024-001'); // Simule un scan réussi
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[220] bg-black flex flex-col">
      {/* HEADER */}
      <div className="p-6 border-b border-white/10 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl">
             <Trophy className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <h2 className="text-lg font-[1000] uppercase text-white tracking-tight leading-none">{t('HOF_TITLE')}</h2>
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">{t('HOF_SUB')}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* SEARCH / SCAN */}
      <div className="p-6 bg-zinc-900 border-b border-white/5">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input 
            type="text" 
            placeholder={t('HOF_SEARCH')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-white/30 transition-colors uppercase placeholder:normal-case"
          />
        </div>
        <button 
          onClick={handleScanMock}
          className="w-full py-4 bg-white/5 border border-dashed border-white/20 rounded-2xl flex items-center justify-center gap-3 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
        >
          {isScanning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{t('HOF_SCANNING')}</span>
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('HOF_SCAN_BTN')}</span>
            </>
          )}
        </button>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <ShieldCheck className="w-16 h-16 mb-4 text-red-500" />
            <p className="text-xs font-black uppercase tracking-widest text-center">{t('HOF_EMPTY')}</p>
          </div>
        ) : (
          filteredResults.map((item) => (
            <div 
              key={item.certificateId} 
              className={`relative p-6 rounded-[24px] border border-white/10 bg-zinc-900 overflow-hidden group ${searchTerm === item.certificateId ? 'border-emerald-500' : ''}`}
            >
              {searchTerm === item.certificateId && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {t('HOF_VERIFIED')}
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <img src={item.avatar} className="w-12 h-12 rounded-full border-2 border-white/10 object-cover" alt="" />
                <div>
                  <h3 className="text-base font-[1000] uppercase text-white leading-none mb-1">{item.user}</h3>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.date}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1">Titre Honorifique</span>
                <p className="text-xl font-[1000] uppercase tracking-tight" style={{ color: item.color }}>{item.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">{t('HOF_SCORE')}</span>
                  <span className="text-sm font-bold text-white">{item.score}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">{t('HOF_ID')}</span>
                  <span className="text-sm font-mono text-white/60">{item.certificateId}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="p-6 bg-black border-t border-white/10 pb-24">
        <p className="text-[9px] text-white/30 font-bold text-center uppercase tracking-widest leading-relaxed">
          Base de données immuable.<br/>Seuls les certificats listés ici sont authentiques.
        </p>
      </div>
    </div>
  );
};

export default HallOfFame;
