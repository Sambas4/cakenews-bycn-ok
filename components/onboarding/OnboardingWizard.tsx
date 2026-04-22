
import React, { useState, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Check, ShieldAlert, Target, Zap, Heart, Flame, Monitor, AlertTriangle, Fingerprint, Sparkles, Lock, FileSignature, Globe, ScanFace } from 'lucide-react';
import { THEME_GROUPS, CATEGORY_COLORS, getTextColor } from '../../constants';
import { Category } from '../../types';
import { useInteraction } from '../../context/InteractionContext';

const InterestButton: React.FC<{ cat: Category, userInterests: Category[], toggleUserInterest: (c: Category) => void, triggerHaptic: (type: string) => void }> = ({ cat, userInterests, toggleUserInterest, triggerHaptic }) => {
      const isSelected = userInterests.includes(cat);
      const color = CATEGORY_COLORS[cat];
      const textColor = getTextColor(cat);
      
      return (
          <button
            onClick={() => { triggerHaptic('light'); toggleUserInterest(cat); }}
            className={`
                relative w-full py-4 px-5 rounded-2xl border transition-all duration-200 flex items-center justify-between group
                ${isSelected 
                    ? 'bg-white border-white scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }
            `}
            style={{ backgroundColor: isSelected ? color : undefined, borderColor: isSelected ? color : undefined }}
          >
              <span className={`text-xs font-[1000] uppercase tracking-widest ${isSelected ? textColor : 'text-zinc-400'}`}>
                  {cat}
              </span>
              <div 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${isSelected ? 'scale-125' : 'opacity-20 scale-75'}`}
                style={{ backgroundColor: isSelected ? (textColor === 'text-black' ? '#000' : '#fff') : color }} 
              />
          </button>
      );
  };

// Composant Zone Rouge
const UncensoredToggle: React.FC<{ cat: Category, userInterests: Category[], toggleUserInterest: (c: Category) => void, triggerHaptic: (type: string) => void }> = ({ cat, userInterests, toggleUserInterest, triggerHaptic }) => {
      const isSelected = userInterests.includes(cat);
      
      return (
          <button
            onClick={() => { triggerHaptic('medium'); toggleUserInterest(cat); }}
            className={`
                w-full p-5 rounded-xl border-l-4 transition-all duration-200 flex items-center justify-between mb-3
                ${isSelected 
                    ? 'bg-red-900/40 border-l-red-500 border-t border-r border-b border-red-500/50' 
                    : 'bg-black border-l-zinc-800 border-t border-r border-b border-zinc-900'
                }
            `}
          >
              <div className="flex items-center gap-3">
                  {isSelected ? <Lock className="w-4 h-4 text-red-500" /> : <ShieldAlert className="w-4 h-4 text-zinc-700" />}
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-red-500' : 'text-zinc-600'}`}>
                      {cat}
                  </span>
              </div>
              
              <div className={`w-10 h-1 transition-all ${isSelected ? 'bg-red-500 w-16' : 'bg-zinc-800'}`} />
          </button>
      );
  };

const OnboardingWizard: React.FC = () => {
  const { toggleUserInterest, userInterests, completeOnboarding, triggerHaptic } = useInteraction();
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  // Étapes Mimo : 
  // 0: Intro
  // 1: Intérêts Généraux (Actu, Culture, Tech, Sport)
  // 2: Zone Rouge (Sensible & Adulte)
  // 3: Validation (Récap & Disclaimer Responsabilité)
  // 4: Loading

  const sensitiveSelectedCount = useMemo(() => {
      const redZone = [...THEME_GROUPS.SENSITIVE, ...THEME_GROUPS.UNCENSORED];
      return userInterests.filter(i => redZone.includes(i)).length;
  }, [userInterests]);

  // ANALYSE DU PROFIL (NOUVEAU SCRIPT)
  const profileAnalysis = useMemo(() => {
      if (userInterests.length < 4) {
          return {
              type: 'INCOMPLET',
              title: 'PROFIL INCOMPLET',
              desc: "Tu n'as pas sélectionné assez de catégories. Retourne en arrière pour en choisir au moins 4.",
              icon: AlertTriangle,
              color: 'text-red-400',
              border: 'border-red-500',
              bg: 'bg-red-500/10'
          };
      }
      if (userInterests.length >= 4 && userInterests.length <= 6) {
          return {
              type: 'SNIPER',
              title: 'MODE FOCUS',
              desc: `Sélection ciblée : ${userInterests.length} sujets. Ton flux sera précis et direct.`,
              icon: Target,
              color: 'text-amber-400',
              border: 'border-amber-500',
              bg: 'bg-amber-500/10'
          };
      }
      return {
          type: 'STANDARD',
          title: 'PROFIL SUR MESURE',
          desc: `${userInterests.length} canaux d'information actifs.`,
          icon: ScanFace,
          color: 'text-emerald-400',
          border: 'border-emerald-500',
          bg: 'bg-emerald-500/10'
      };
  }, [userInterests]);

  const handleNext = () => {
    triggerHaptic('medium');
    
    // Validation minimale à l'étape 2 (Dernière étape de sélection)
    if (step === 2 && userInterests.length < 4) {
        alert("Mimo a besoin d'au moins 4 sujets pour démarrer. Choisis plus de catégories.");
        return;
    }

    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (step > 0) setStep(prev => prev - 1);
  };

  const handleFinish = () => {
      if (!hasAgreed || userInterests.length < 4) return;
      triggerHaptic('success');

      setIsExiting(true);
      setTimeout(() => {
          completeOnboarding();
      }, 1500); 
  };

  // Composant Bouton QCM
  // (Moved outside)

  // Composant Zone Rouge
  // (Moved outside)

  // --- RENDU DES ÉTAPES ---

  if (isExiting) {
      return (
          <div className="fixed inset-0 bg-black z-[1000] flex flex-col items-center justify-center font-sans">
              <div className="text-center space-y-6 animate-pulse">
                  <Fingerprint className="w-24 h-24 text-white mx-auto" strokeWidth={1} />
                  <div>
                      <h2 className="text-3xl font-[1000] uppercase text-white tracking-tighter leading-none mb-2">IDENTITÉ<br/>CONFIRMÉE</h2>
                      <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Génération du flux...</p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black z-[1000] flex flex-col font-sans">
        {/* Header Mimo */}
        <div className="pt-12 px-6 pb-4 border-b border-white/5 bg-black flex justify-between items-end">
            <div className="flex flex-col">
                <span className="text-[9px] font-mono text-emerald-500 mb-1 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> ASSISTANT MIMO
                </span>
                <div className="h-1 w-24 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
                </div>
            </div>
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">ÉTAPE 0{step} / 04</span>
        </div>

        {/* Contenu Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
            
            {step === 0 && (
                <div className="h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-[1000] uppercase text-white tracking-tighter leading-[0.9] mb-6">
                            TES RÈGLES.<br/><span className="text-zinc-600">TON INFO.</span>
                        </h1>
                        <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-xs border-l-2 border-white/20 pl-4">
                            Moi c'est Mimo. Ici, pas de censure morale.<br/><br/>
                            Tu décides ce que tu vois. De la politique au hardcore, c'est toi qui pilotes.
                        </p>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
                    <div className="mb-8">
                        <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest bg-sky-500/10 px-2 py-1 rounded">Intérêts</span>
                        <h2 className="text-3xl font-[1000] text-white uppercase tracking-tight mt-4 leading-none">
                            TES PRÉFÉRENCES
                        </h2>
                        <p className="text-zinc-500 text-xs font-bold mt-2">Sélectionne tes sujets favoris (minimum 4).</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3 opacity-50">
                                <Monitor className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest">SOCIÉTÉ & FUTUR</span>
                            </div>
                            <div className="grid gap-3">
                                {[...THEME_GROUPS.ACTUALITES, ...THEME_GROUPS.FUTUR].map(cat => <InterestButton key={cat} cat={cat} userInterests={userInterests} toggleUserInterest={toggleUserInterest} triggerHaptic={triggerHaptic} />)}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-3 opacity-50">
                                <Heart className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest">LIFESTYLE & VIBE</span>
                            </div>
                            <div className="grid gap-3">
                                {[...THEME_GROUPS.LIFESTYLE, ...THEME_GROUPS.DIVERTISSEMENT].map(cat => <InterestButton key={cat} cat={cat} userInterests={userInterests} toggleUserInterest={toggleUserInterest} triggerHaptic={triggerHaptic} />)}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-3 opacity-50">
                                <Flame className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest">ADRÉNALINE</span>
                            </div>
                            <div className="grid gap-3">
                                {THEME_GROUPS.SPORTS.map(cat => <InterestButton key={cat} cat={cat} userInterests={userInterests} toggleUserInterest={toggleUserInterest} triggerHaptic={triggerHaptic} />)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="mb-10 p-6 bg-red-900/10 border border-red-500/20 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <ShieldAlert className="w-24 h-24 text-red-500" />
                        </div>
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Sans Filtre</span>
                        <h2 className="text-3xl font-[1000] text-white uppercase tracking-tight mt-4 leading-none">
                            Contenu Explicite.
                        </h2>
                        <p className="text-xs text-red-200/60 font-medium mt-4 leading-relaxed max-w-[80%]">
                            Attention : CakeNews ne floute rien. Guerre, Violence, Nudité.<br/><br/>
                            <span className="text-white font-bold">Si tu actives ces options, tu verras la réalité brute.</span>
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Réalité Difficile</span>
                            <div className="space-y-2">
                                {THEME_GROUPS.SENSITIVE.map(cat => <UncensoredToggle key={cat} cat={cat} userInterests={userInterests} toggleUserInterest={toggleUserInterest} triggerHaptic={triggerHaptic} />)}
                            </div>
                        </div>
                        
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 mb-2 block mt-6">Adulte (18+)</span>
                            <div className="space-y-2">
                                {THEME_GROUPS.UNCENSORED.map(cat => <UncensoredToggle key={cat} cat={cat} userInterests={userInterests} toggleUserInterest={toggleUserInterest} triggerHaptic={triggerHaptic} />)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 h-full flex flex-col">
                    <div className="mb-8 text-center">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full border-2 border-white/10 flex items-center justify-center mx-auto mb-6">
                            <FileSignature className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-[1000] text-white uppercase tracking-tighter mb-2">
                            VALIDATION
                        </h2>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                            CONFIRMATION D'ACCÈS
                        </p>
                    </div>

                    {/* SCRIPT ANALYSE PROFIL */}
                    <div className={`p-6 rounded-[24px] border mb-6 flex flex-col gap-4 ${profileAnalysis.bg} ${profileAnalysis.border}`}>
                        <div className="flex items-center gap-3">
                            <profileAnalysis.icon className={`w-6 h-6 ${profileAnalysis.color}`} />
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${profileAnalysis.color}`}>
                                    ANALYSE MIMO
                                </span>
                                <h3 className="text-xl font-[1000] text-white uppercase tracking-tight leading-none">
                                    {profileAnalysis.title}
                                </h3>
                            </div>
                        </div>
                        <p className="text-xs text-white/80 font-medium leading-relaxed">
                            {profileAnalysis.desc}
                        </p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                        <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 border-b border-zinc-800 pb-2">
                            Tes choix de contenu
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {userInterests.length > 0 ? userInterests.map(cat => {
                                const isSensitive = [...THEME_GROUPS.SENSITIVE, ...THEME_GROUPS.UNCENSORED].includes(cat);
                                return (
                                    <span 
                                        key={cat} 
                                        className={`text-[9px] font-bold px-2 py-1 rounded uppercase border ${isSensitive ? 'text-red-500 border-red-500/30 bg-red-900/10' : 'text-zinc-300 border-zinc-700 bg-black'}`}
                                    >
                                        {cat}
                                    </span>
                                );
                            }) : (
                                <span className="text-[10px] text-zinc-600 italic">Aucune catégorie sélectionnée.</span>
                            )}
                        </div>
                        
                        {sensitiveSelectedCount > 0 && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 items-start">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-red-200 leading-tight">
                                    Tu as activé <span className="font-bold text-white">{sensitiveSelectedCount} catégories sensibles</span>. Attends-toi à des images choquantes.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto">
                        <label className="flex items-start gap-4 p-4 border border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-900 transition-colors">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${hasAgreed ? 'bg-white border-white' : 'border-zinc-600'}`}>
                                {hasAgreed && <Check className="w-4 h-4 text-black" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={hasAgreed} onChange={() => setHasAgreed(!hasAgreed)} />
                            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                Je certifie être majeur et comprends que <span className="text-white font-bold">CakeNews diffuse sans filtre ni censure</span>. Je suis seul responsable du contenu que je consulte.
                            </p>
                        </label>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="h-full flex flex-col justify-center items-center text-center animate-in zoom-in duration-500">
                    <div className="w-20 h-20 border-4 border-white/10 border-t-white rounded-full animate-spin mb-8" />
                    <h2 className="text-3xl font-[1000] text-white uppercase tracking-tighter mb-4">
                        FINALISATION...
                    </h2>
                    <div className="space-y-2 text-left bg-zinc-900 p-6 rounded-2xl border border-white/5 w-full max-w-xs">
                        <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-mono text-zinc-400 uppercase">Sources : CONNECTÉES</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-mono text-zinc-400 uppercase">Filtres : {userInterests.length > 0 ? `${userInterests.length} ACTIFS` : 'PACK GLOBAL'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-mono text-zinc-400 uppercase">Responsabilité : ACCEPTÉE</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-black flex gap-3">
            {step > 0 && step < 4 && (
                <button 
                    onClick={handleBack}
                    className="px-6 py-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            )}
            
            {step < 4 ? (
                <button 
                    onClick={step === 3 ? handleFinish : handleNext}
                    disabled={(step === 3 && !hasAgreed) || (step === 3 && userInterests.length < 4)}
                    className={`flex-1 py-5 rounded-2xl font-black uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 ${
                        (step === 3 && !hasAgreed) || (step === 3 && userInterests.length < 4)
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                >
                    {step === 0 ? "C'EST PARTI" : (step === 3 ? "CONFIRMER & ENTRER" : "CONTINUER")} 
                    {step !== 3 && <ArrowRight className="w-5 h-5" />}
                    {step === 3 && <Check className="w-5 h-5" />}
                </button>
            ) : (
                <div className="w-full text-center text-[10px] font-mono text-zinc-600 uppercase animate-pulse">
                    Accès au réseau en cours...
                </div>
            )}
        </div>
    </div>
  );
};

export default OnboardingWizard;
