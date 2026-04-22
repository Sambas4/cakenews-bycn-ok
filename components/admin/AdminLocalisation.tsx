
import React, { useState, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react';
import { useTranslation, DEFAULT_DICTIONARY } from '../../context/TranslationContext';
import { AdminTabHandle } from './AdminView';
import { Globe, Plus, Save, RotateCcw, Trash2, Search, Check, Languages, ChevronDown, CheckCircle2 } from 'lucide-react';

// COMPOSANT ROW OPTIMISÉ (évite le re-render de toute la liste à chaque frappe)
const TranslationRow = React.memo(({ 
    k, 
    val, 
    originalVal, 
    isDefaultDict, 
    onUpdate 
}: { 
    k: string, 
    val: string, 
    originalVal: string, 
    isDefaultDict: boolean, 
    onUpdate: (key: string, val: string) => void 
}) => {
    const [localValue, setLocalValue] = useState(val);

    // Synchro si la valeur change depuis l'extérieur (ex: reset)
    useEffect(() => {
        setLocalValue(val);
    }, [val]);

    const handleBlur = () => {
        if (localValue !== val) {
            onUpdate(k, localValue);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors">
            <div className="flex justify-between items-center mb-3">
                {/* MODIFICATION: Force l'affichage de la CLÉ en uppercase pour bien montrer que c'est une constante système */}
                <span className="text-[10px] font-black uppercase text-zinc-500 truncate max-w-[80%] bg-black px-2 py-1 rounded border border-zinc-800 select-all tracking-wider">
                    {k}
                </span>
                <Languages className="w-3 h-3 text-zinc-700" />
            </div>
            
            {!isDefaultDict && (
                <p className="text-[10px] text-zinc-600 mb-2 truncate italic">
                    Orig: "{originalVal}"
                </p>
            )}

            <textarea 
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                rows={2}
                placeholder="Votre traduction..."
                // NOTE: On ne force pas l'uppercase ici (input) pour laisser la liberté sur les descriptions,
                // mais le composant UI final appliquera la transformation CSS si nécessaire (Titre, Bouton, etc.)
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white font-bold focus:border-purple-500 outline-none transition-all resize-none leading-relaxed placeholder:text-zinc-700"
            />
        </div>
    );
});

const AdminLocalisation = forwardRef<AdminTabHandle, {}>((props, ref) => {
  const { 
      currentDictionary, availableDictionaries, updateDictionary, 
      createDictionary, switchDictionary, deleteDictionary, resetToDefault 
  } = useTranslation();

  const [searchTerm, setSearchTerm] = useState('');
  const [newPackName, setNewPackName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showPackListMobile, setShowPackListMobile] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'NAV' | 'ACTION' | 'UI' | 'ADMIN'>('ALL');
  
  // Feedback visuel de sauvegarde
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (isCreating) {
        setIsCreating(false);
        setNewPackName('');
        return true;
      }
      if (showPackListMobile) {
        setShowPackListMobile(false);
        return true;
      }
      return false;
    }
  }));

  // Filtrage des clés
  const filteredKeys = Object.keys(currentDictionary.translations).filter(key => {
      const matchesSearch = key.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            currentDictionary.translations[key].toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (activeCategory === 'NAV') return key.startsWith('NAV_');
      if (activeCategory === 'ACTION') return key.startsWith('ACTION_');
      if (activeCategory === 'UI') return key.startsWith('UI_') || key.startsWith('HOF_') || key.startsWith('TROPHY_');
      if (activeCategory === 'ADMIN') return key.startsWith('ADMIN_');
      
      return true;
  });

  const handleValueChange = useCallback((key: string, value: string) => {
      // On recrée l'objet complet des traductions. C'est lourd mais safe.
      // Comme c'est au blur, c'est acceptable.
      const newTranslations = { ...currentDictionary.translations, [key]: value };
      updateDictionary(currentDictionary.id, { translations: newTranslations });
  }, [currentDictionary, updateDictionary]);

  const handleCreate = () => {
      if (newPackName.trim()) {
          createDictionary(newPackName);
          setNewPackName('');
          setIsCreating(false);
          setShowPackListMobile(false);
      }
  };

  const handleManualSave = () => {
      setSaveStatus('saving');
      // Simulation d'un délai réseau/disque pour le feedback
      setTimeout(() => {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 2000);
      }, 600);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-zinc-950 font-sans relative overflow-hidden">
      
      {/* 1. GESTION DES PACKS (Responsive) */}
      <div className={`
          flex-shrink-0 bg-zinc-925 border-b md:border-b-0 md:border-r border-zinc-800
          ${showPackListMobile ? 'absolute inset-0 z-50 flex flex-col' : 'h-auto md:h-full md:w-80 md:flex flex-col'}
      `}>
          {/* Mobile Header Toggle */}
          <div 
            onClick={() => setShowPackListMobile(!showPackListMobile)}
            className="md:hidden p-4 flex items-center justify-between bg-zinc-950 border-b border-zinc-800 active:bg-zinc-900"
          >
              <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-purple-500" />
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Langue Active</span>
                      <span className="text-sm font-black uppercase text-white tracking-wide">{currentDictionary.name}</span>
                  </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${showPackListMobile ? 'rotate-180' : ''}`} />
          </div>

          {/* List Content */}
          <div className={`${!showPackListMobile ? 'hidden md:flex' : 'flex'} flex-col h-full bg-zinc-950 md:bg-transparent`}>
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 hidden md:flex">
                  <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-purple-500" />
                      <h2 className="text-sm font-black uppercase text-white tracking-widest">Packs de Langue</h2>
                  </div>
              </div>

              <div className="p-4 border-b border-zinc-800 shrink-0">
                  {!isCreating ? (
                      <button 
                        onClick={() => setIsCreating(true)}
                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                          <Plus className="w-4 h-4" /> Créer une langue
                      </button>
                  ) : (
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={newPackName}
                            onChange={(e) => setNewPackName(e.target.value)}
                            placeholder="Nom (ex: Argot)"
                            className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white outline-none"
                            autoFocus
                          />
                          <button onClick={handleCreate} className="p-3 bg-emerald-500 text-black rounded-lg">
                              <Check className="w-5 h-5" />
                          </button>
                      </div>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {availableDictionaries.map(dict => (
                      <div 
                        key={dict.id}
                        onClick={() => { switchDictionary(dict.id); setShowPackListMobile(false); }}
                        className={`p-4 rounded-xl cursor-pointer border-2 transition-all group relative ${currentDictionary.id === dict.id ? 'bg-zinc-800 border-purple-500' : 'bg-transparent border-transparent hover:bg-zinc-900'}`}
                      >
                          <div className="flex justify-between items-center">
                              <span className={`text-xs font-black uppercase tracking-wide ${currentDictionary.id === dict.id ? 'text-white' : 'text-zinc-500'}`}>
                                  {dict.name}
                              </span>
                              {currentDictionary.id === dict.id && <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>}
                          </div>
                          
                          {!dict.isDefault && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); if(confirm('Supprimer définitivement ce pack ?')) deleteDictionary(dict.id); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-zinc-600 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* 2. EDITEUR (Right Panel) */}
      <div className="flex-1 flex flex-col bg-black min-w-0 h-full">
          
          {/* HEADER EDITEUR */}
          <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0 gap-4">
              <div className="flex flex-col overflow-hidden">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Édition en cours</span>
                  <h1 className="text-xl font-black text-white uppercase tracking-tight truncate">
                      <span className="text-purple-500">{currentDictionary.name}</span>
                  </h1>
              </div>
              
              <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => { if(confirm('Réinitialiser toutes les traductions de ce pack ?')) resetToDefault(currentDictionary.id); }}
                    className="p-3 md:px-4 md:py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl transition-colors border border-zinc-800"
                    title="Restaurer par défaut"
                  >
                      <RotateCcw className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={handleManualSave}
                    className={`px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                        saveStatus === 'success' ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                      {saveStatus === 'success' ? (
                          <><CheckCircle2 className="w-4 h-4" /> SUCCÈS</>
                      ) : (
                          <><Save className="w-4 h-4" /> SAUVER</>
                      )}
                  </button>
              </div>
          </div>

          {/* FILTRES & RECHERCHE */}
          <div className="p-4 border-b border-zinc-800 flex flex-col gap-4 bg-zinc-925 shrink-0">
              <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher une clé ou un texte..."
                    className="w-full bg-black border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-purple-500 outline-none h-12"
                  />
              </div>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {['ALL', 'NAV', 'ACTION', 'UI', 'ADMIN'].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat as any)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                            activeCategory === cat 
                            ? 'bg-zinc-800 text-white border-zinc-600' 
                            : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>
          </div>

          {/* LISTE DES CLÉS (SCROLLABLE AREA) */}
          <div className="flex-1 overflow-y-auto p-4 pb-40 md:pb-32 overscroll-contain">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredKeys.slice(0, 100).map(key => (
                      <TranslationRow 
                          key={key} 
                          k={key} 
                          val={currentDictionary.translations[key]} 
                          originalVal={DEFAULT_DICTIONARY.translations[key]} 
                          isDefaultDict={currentDictionary.isDefault}
                          onUpdate={handleValueChange}
                      />
                  ))}
                  {/* Note: Limitation à 100 items pour la perf si filtre vide, la recherche filtre la suite */}
              </div>
              
              {filteredKeys.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-xs font-mono uppercase tracking-widest">Aucune traduction trouvée</p>
                  </div>
              )}
              
              {filteredKeys.length > 100 && (
                  <div className="py-8 text-center">
                      <p className="text-[10px] text-zinc-500 font-mono uppercase">
                          Affichage limité à 100 résultats. Utilisez la recherche pour affiner.
                      </p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
});

export default AdminLocalisation;
