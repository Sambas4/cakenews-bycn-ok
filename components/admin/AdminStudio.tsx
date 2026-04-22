
import React, { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Article, Category, ExternalVoice, BroadcastCampaign } from '../../types';
import { CATEGORIES } from '../../constants';
import { MOCK_USERS } from '../../data/mockData';
import { Save, PlusSquare, Archive, Clock, Calendar, FileEdit, Trash2, Eye, Globe, Twitter, Mic, Video, Plus, X, AlignLeft, Image as ImageIcon, MessageCircle, PlaySquare, PenTool, Zap, AlertTriangle, Radio, Target, MapPin, PieChart } from 'lucide-react';
import { AdminTabHandle } from './AdminView';
import { useBroadcast } from '../../context/BroadcastContext';
import { useTranslation } from '../../context/TranslationContext';

type StudioSubTab = 'EDITEUR' | 'PROGRAMME' | 'BROUILLONS' | 'ARCHIVES';

interface AdminStudioProps {
  articles: Article[];
  onPublish: (article: Article) => Promise<void> | void; // CHANGED to support async
  onPreview: (article: Article) => void;
}

const SubTabButton = ({ id, label, icon: Icon, activeSubTab, setActiveSubTab }: { id: StudioSubTab; label: string; icon: any, activeSubTab: StudioSubTab, setActiveSubTab: (id: StudioSubTab) => void }) => (
    <button
      onClick={() => setActiveSubTab(id)}
      className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 text-[9px] font-black uppercase tracking-widest transition-colors ${
        activeSubTab === id
          ? 'border-white text-white'
          : 'border-transparent text-zinc-600 hover:text-zinc-400'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );

const AdminStudio = forwardRef<AdminTabHandle, AdminStudioProps>(({ onPublish, articles, onPreview }, ref) => {
  const { t } = useTranslation();
  const { addCampaign } = useBroadcast();
  const [activeSubTab, setActiveSubTab] = useState<StudioSubTab>('EDITEUR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const [broadcastConfig, setBroadcastConfig] = useState<{
      active: boolean;
      mode: 'STANDARD' | 'URGENT' | 'FLASH';
  }>({ active: false, mode: 'STANDARD' });

  const [targeting, setTargeting] = useState<{
      locations: string[];
      interests: Category[];
  }>({ locations: [], interests: [] });
  const [locInput, setLocInput] = useState('');

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (activeSubTab !== 'EDITEUR') {
        setActiveSubTab('EDITEUR');
        return true;
      }
      return false;
    }
  }));

  const [echoForm, setEchoForm] = useState({
      title: '', 
      author: '',
      source: '',
      content: '',
      type: 'tweet' as 'tweet' | 'video' | 'audio' | 'text',
      avatar: 'https://i.pravatar.cc/150'
  });

  const [coverType, setCoverType] = useState<'image' | 'video'>('image');

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
    category: 'Tech' as Category,
    isExclusive: false,
    author: t('STUDIO_AUTHOR_DEFAULT'), 
    voices: [] as ExternalVoice[]
  });

  const availableLocations = useMemo(() => {
      const locs = new Set<string>();
      MOCK_USERS.forEach(user => {
          if (user.location?.isSet) {
              if (user.location.neighborhood) locs.add(user.location.neighborhood);
              if (user.location.city) locs.add(user.location.city);
          }
      });
      return Array.from(locs).sort();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addLocation = (loc: string) => {
      if (!loc) return;
      const cleanLoc = loc.trim();
      if (!targeting.locations.includes(cleanLoc)) {
          setTargeting(prev => ({ ...prev, locations: [...prev.locations, cleanLoc] }));
      }
      setLocInput('');
  };

  const removeLocation = (loc: string) => {
      setTargeting(prev => ({ ...prev, locations: prev.locations.filter(l => l !== loc) }));
  };

  const toggleInterest = (cat: Category) => {
      setTargeting(prev => {
          const exists = prev.interests.includes(cat);
          return {
              ...prev,
              interests: exists ? prev.interests.filter(c => c !== cat) : [...prev.interests, cat]
          };
      });
  };

  const handleAddVoice = () => {
    if(!echoForm.author || !echoForm.content) return;
    
    const newVoice: ExternalVoice = {
        id: `v-${Date.now()}`,
        author: echoForm.author,
        source: echoForm.source || 'Social',
        content: echoForm.content,
        title: echoForm.title,
        type: echoForm.type,
        avatar: echoForm.avatar,
        url: '#'
    };

    setFormData(prev => ({
        ...prev,
        voices: [...prev.voices, newVoice]
    }));

    setEchoForm(prev => ({ ...prev, content: '', title: '', author: '' }));
  };

  const handleRemoveVoice = (id: string) => {
    setFormData(prev => ({
        ...prev,
        voices: prev.voices.filter(v => v.id !== id)
    }));
  };

  const getPreviewArticle = (): Article => {
    return {
      id: `preview-${Date.now()}`,
      title: formData.title || t('STUDIO_PREVIEW_TITLE'),
      summary: formData.summary || t('STUDIO_PREVIEW_SUMMARY'),
      content: formData.content || t('STUDIO_CONTENT_PLACEHOLDER'),
      imageUrl: formData.imageUrl || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
      videoUrl: coverType === 'video' ? formData.videoUrl : undefined,
      author: formData.author,
      category: formData.category,
      timestamp: "Prévisualisation",
      likes: 0,
      comments: 0,
      isExclusive: formData.isExclusive,
      externalVoices: formData.voices,
      status: 'draft'
    };
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.content) return;
    if (isScheduled && !scheduledDate) return; 
    
    setIsSubmitting(true);
    
    // UPDATED: Async/Await direct, plus de setTimeout simulé
    try {
        let displayTimestamp = "À l'instant";
        if (isScheduled && scheduledDate) {
            const dateObj = new Date(scheduledDate);
            displayTimestamp = `Prévu : ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }

        const articleId = `art-${Date.now()}`;

        const newArticle: Article = {
            id: articleId,
            title: formData.title,
            summary: formData.summary,
            content: formData.content,
            imageUrl: formData.imageUrl || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
            videoUrl: coverType === 'video' ? formData.videoUrl : undefined,
            author: formData.author,
            category: formData.category,
            timestamp: displayTimestamp,
            likes: 0,
            comments: 0,
            isExclusive: formData.isExclusive,
            externalVoices: formData.voices, 
            status: isScheduled ? 'scheduled' : 'published',
            scheduledDate: isScheduled ? scheduledDate : undefined
        };

        await onPublish(newArticle);

        if (broadcastConfig.active && !isScheduled) {
            const isFlash = broadcastConfig.mode === 'FLASH';
            const isUrgent = broadcastConfig.mode === 'URGENT' || isFlash;

            const campaign: BroadcastCampaign = {
                id: `cp-${Date.now()}`,
                name: `AUTO: ${formData.title.substring(0, 20)}`,
                message: formData.title.toUpperCase(),
                type: isFlash ? 'ALERT' : 'INFO',
                priority: isFlash ? 10 : (isUrgent ? 8 : 5),
                capping: { maxViews: 0, resetPeriod: 'never' },
                targeting: { 
                    locations: targeting.locations,
                    interests: targeting.interests
                },
                schedule: { startDate: new Date().toISOString(), isActive: true },
                createdAt: new Date().toISOString(),
                linkedArticleId: articleId
            };
            addCampaign(campaign);
        }

        // Reset form on success
        setFormData({
            title: '', summary: '', content: '', imageUrl: '', videoUrl: '', category: 'Tech', isExclusive: false, author: t('STUDIO_AUTHOR_DEFAULT'), voices: []
        });
        setCoverType('image');
        setIsScheduled(false);
        setScheduledDate('');
        setBroadcastConfig({ active: false, mode: 'STANDARD' });
        setTargeting({ locations: [], interests: [] });

    } catch (e) {
        console.error("Erreur publication studio", e);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative">
        <div className="flex bg-black border-b border-zinc-800 shrink-0">
          <SubTabButton id="EDITEUR" label="Nouveau" icon={PlusSquare} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
          <SubTabButton id="PROGRAMME" label="Programmé" icon={Clock} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
          <SubTabButton id="BROUILLONS" label="Brouillons" icon={FileEdit} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
          <SubTabButton id="ARCHIVES" label="Archives" icon={Archive} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
        </div>

        <div className="flex-1 overflow-y-auto pb-32">
            
            {activeSubTab === 'EDITEUR' && (
                <div>
                    <div className="p-4 space-y-6 bg-zinc-950">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div className="flex items-center gap-2 text-zinc-500">
                                <AlignLeft className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">CONTENU PRINCIPAL</h3>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <input 
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    placeholder={t('STUDIO_TITLE_PLACEHOLDER')}
                                    className="w-full bg-black border border-zinc-800 p-4 text-white font-bold text-xl outline-none focus:border-white transition-colors rounded-none placeholder:text-zinc-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <select 
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 p-3 text-white text-xs font-mono outline-none rounded-none h-14 uppercase"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => handleChange('isExclusive', !formData.isExclusive)}
                                    className={`w-full h-14 flex items-center justify-center border text-xs font-black uppercase tracking-widest ${formData.isExclusive ? 'bg-red-600 text-white border-red-600' : 'bg-black text-zinc-500 border-zinc-800'}`}
                                >
                                    {formData.isExclusive ? 'EXCLUSIVE' : 'STANDARD'}
                                </button>
                            </div>

                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={formData.author}
                                    onChange={(e) => handleChange('author', e.target.value)}
                                    placeholder={t('DOSSIER_SIGNATURE')}
                                    className="w-full bg-black border border-zinc-800 p-4 pl-12 text-white text-xs font-mono outline-none focus:border-white rounded-none h-14"
                                />
                                <PenTool className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            </div>

                            <div>
                                <div className="flex bg-black border border-zinc-800 p-1 mb-2">
                                    <button 
                                        onClick={() => setCoverType('image')}
                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${coverType === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-white'}`}
                                    >
                                        <ImageIcon className="w-3 h-3" /> Image
                                    </button>
                                    <button 
                                        onClick={() => setCoverType('video')}
                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${coverType === 'video' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-white'}`}
                                    >
                                        <PlaySquare className="w-3 h-3" /> Vidéo (MP4)
                                    </button>
                                </div>

                                <div className="relative">
                                    {coverType === 'image' ? (
                                        <>
                                            <input 
                                                type="text" 
                                                value={formData.imageUrl}
                                                onChange={(e) => handleChange('imageUrl', e.target.value)}
                                                placeholder="URL IMAGE (Format 1:1)..."
                                                className="w-full bg-black border border-zinc-800 p-4 pl-12 text-white text-xs font-mono outline-none focus:border-white rounded-none h-14"
                                            />
                                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                        </>
                                    ) : (
                                        <>
                                            <input 
                                                type="text" 
                                                value={formData.videoUrl}
                                                onChange={(e) => handleChange('videoUrl', e.target.value)}
                                                placeholder="URL VIDÉO MP4 (Format 1:1)..."
                                                className="w-full bg-black border border-zinc-800 p-4 pl-12 text-white text-xs font-mono outline-none focus:border-white rounded-none h-14"
                                            />
                                            <PlaySquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                        </>
                                    )}
                                </div>
                            </div>

                            <textarea 
                                value={formData.summary}
                                onChange={(e) => handleChange('summary', e.target.value)}
                                className="w-full bg-black border border-zinc-800 p-4 text-white text-sm font-medium outline-none focus:border-white min-h-[100px] rounded-none placeholder:text-zinc-700"
                                placeholder={t('STUDIO_SUMMARY_PLACEHOLDER')}
                            />

                            <textarea 
                                value={formData.content}
                                onChange={(e) => handleChange('content', e.target.value)}
                                className="w-full bg-black border border-zinc-800 p-4 text-zinc-300 text-sm leading-relaxed outline-none focus:border-white min-h-[250px] font-mono rounded-none placeholder:text-zinc-700"
                                placeholder={t('STUDIO_CONTENT_PLACEHOLDER')}
                            />
                        </div>
                    </div>

                    <div className="h-4 bg-zinc-900 border-y border-zinc-800 flex items-center justify-center">
                        <div className="h-[1px] w-full bg-zinc-800"></div>
                    </div>

                    <div className="p-4 bg-zinc-950">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div className="flex items-center gap-2 text-zinc-500">
                                <Target className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ANT_TARGET_AUDIENCE')}</h3>
                            </div>
                            <span className="text-[8px] font-mono text-zinc-600">
                                {(targeting.locations.length === 0 && targeting.interests.length === 0) ? t('ANT_GLOBAL') : t('ANT_TARGETED')}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="text" 
                                            value={locInput}
                                            onChange={(e) => setLocInput(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') addLocation(locInput); }}
                                            placeholder="Ajouter une zone (Ville, Quartier...)"
                                            className="w-full bg-black border border-zinc-800 px-3 py-3 pl-10 text-xs text-white outline-none focus:border-white/20"
                                        />
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                                    </div>
                                    <button onClick={() => addLocation(locInput)} className="px-4 bg-zinc-800 text-white hover:bg-zinc-700">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                    {availableLocations.slice(0, 5).map(loc => (
                                        <button key={loc} onClick={() => addLocation(loc)} className="whitespace-nowrap px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500 hover:text-white uppercase font-bold">
                                            {loc}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {targeting.locations.map(loc => (
                                        <span key={loc} className="flex items-center gap-1 px-2 py-1 bg-sky-900/30 border border-sky-500/30 text-sky-400 rounded-md text-[10px] font-bold uppercase">
                                            {loc}
                                            <button onClick={() => removeLocation(loc)}><X className="w-3 h-3 hover:text-white" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2 flex items-center gap-1">
                                    <PieChart className="w-3 h-3" /> Intérêts (Optionnel)
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => toggleInterest(cat)}
                                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                                                targeting.interests.includes(cat) 
                                                ? 'bg-purple-600 text-white border-purple-500' 
                                                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-4 bg-zinc-900 border-y border-zinc-800 flex items-center justify-center">
                        <div className="h-[1px] w-full bg-zinc-800"></div>
                    </div>

                    <div className="p-4 bg-zinc-925">
                       <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div className="flex items-center gap-2 text-zinc-500">
                                <Globe className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">RÉSEAU D'ÉCHOS</h3>
                            </div>
                            <span className="text-[9px] font-bold bg-zinc-800 px-2 py-1 rounded text-white">{formData.voices.length} Actifs</span>
                       </div>
                       
                        {formData.voices.length > 0 && (
                            <div className="space-y-3 mb-8">
                                {formData.voices.map((voice, idx) => (
                                    <div key={voice.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-start gap-4">
                                        <div className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded text-xs font-mono text-zinc-500 shrink-0">{idx + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-bold text-white truncate block">{voice.author}</span>
                                            <p className="text-xs text-zinc-400 line-clamp-1">{voice.content}</p>
                                        </div>
                                        <button onClick={() => handleRemoveVoice(voice.id)} className="text-zinc-600 hover:text-red-500"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="bg-zinc-900 border-2 border-dashed border-zinc-800 p-5 rounded-2xl relative">
                            <span className="absolute -top-3 left-4 bg-zinc-900 px-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Créer un nouvel écho</span>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {[{ id: 'tweet', icon: Twitter }, { id: 'video', icon: Video }, { id: 'audio', icon: Mic }, { id: 'text', icon: MessageCircle }].map((t) => (
                                    <button key={t.id} onClick={() => setEchoForm(prev => ({...prev, type: t.id as any}))} className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-all active:scale-95 ${echoForm.type === t.id ? 'bg-zinc-800 border-white/20' : 'bg-black border-transparent'}`}>
                                        <t.icon className={`w-5 h-5 mb-1 ${echoForm.type === t.id ? 'text-white' : 'text-zinc-600'}`} />
                                        <span className="text-[8px] font-black uppercase text-zinc-500">{t.id}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-3 mb-4">
                                <input type="text" value={echoForm.author} onChange={(e) => setEchoForm(prev => ({...prev, author: e.target.value}))} placeholder="Auteur..." className="w-full bg-black border border-zinc-800 p-3 text-white text-xs rounded-lg" />
                                <input type="text" value={echoForm.title} onChange={(e) => setEchoForm(prev => ({...prev, title: e.target.value}))} placeholder="Titre..." className="w-full bg-black border border-zinc-800 p-3 text-white text-xs rounded-lg" />
                                <textarea value={echoForm.content} onChange={(e) => setEchoForm(prev => ({...prev, content: e.target.value}))} placeholder="Contenu..." className="w-full bg-black border border-zinc-800 p-3 text-white text-xs rounded-lg min-h-[80px]" />
                            </div>
                            <button onClick={handleAddVoice} disabled={!echoForm.author || !echoForm.content} className="w-full py-3 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-zinc-200">Ajouter</button>
                        </div>
                    </div>

                    <div className="p-4 mt-4 bg-zinc-950 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div className="flex items-center gap-2 text-zinc-500">
                                <Radio className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ANT_ANTENNE_PROPULSION') || "PROPULSION ANTENNE"}</h3>
                            </div>
                            <button 
                                onClick={() => setBroadcastConfig(prev => ({...prev, active: !prev.active}))}
                                className={`w-10 h-6 rounded-full p-1 transition-colors ${broadcastConfig.active ? 'bg-sky-500' : 'bg-zinc-800'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${broadcastConfig.active ? 'translate-x-4' : ''}`} />
                            </button>
                        </div>

                        {broadcastConfig.active && (
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    onClick={() => setBroadcastConfig(prev => ({...prev, mode: 'STANDARD'}))}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${broadcastConfig.mode === 'STANDARD' ? 'bg-sky-900/20 border-sky-500 text-sky-500' : 'bg-black border-zinc-800 text-zinc-500'}`}
                                >
                                    <Radio className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase">Standard</span>
                                </button>
                                <button 
                                    onClick={() => setBroadcastConfig(prev => ({...prev, mode: 'URGENT'}))}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${broadcastConfig.mode === 'URGENT' ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-black border-zinc-800 text-zinc-500'}`}
                                >
                                    <Zap className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase">Urgent</span>
                                </button>
                                <button 
                                    onClick={() => setBroadcastConfig(prev => ({...prev, mode: 'FLASH'}))}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${broadcastConfig.mode === 'FLASH' ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black border-zinc-800 text-zinc-500'}`}
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase">Flash TV</span>
                                </button>
                            </div>
                        )}
                        <p className="text-[9px] text-zinc-600 mt-2 italic px-1">
                            * Activez ceci pour envoyer directement le titre du dossier dans le bandeau défilant ou l'overlay.
                        </p>
                    </div>

                    <div className="p-4 mt-4 bg-zinc-950 border-t border-zinc-800 pb-8">
                         <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                            <div className="flex items-center gap-2 text-zinc-500">
                                <Clock className="w-4 h-4" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">TIMING PUBLICATION</h3>
                            </div>
                            <div className="flex bg-black p-1 border border-zinc-800 rounded-lg">
                                <button 
                                    onClick={() => setIsScheduled(false)}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded ${!isScheduled ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Immédiat
                                </button>
                                <button 
                                    onClick={() => setIsScheduled(true)}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded ${isScheduled ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Programmer
                                </button>
                            </div>
                         </div>

                        {isScheduled && (
                            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                <div className="relative">
                                    <input 
                                        type="datetime-local"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="w-full bg-black border border-zinc-700 p-4 text-white font-mono text-sm outline-none focus:border-white rounded-lg appearance-none h-14"
                                        style={{ colorScheme: 'dark' }} 
                                    />
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeSubTab !== 'EDITEUR' && (
                <div className="p-4 text-center text-zinc-600 pt-20">
                    <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-mono uppercase">Module d'historique (Mock)</p>
                </div>
            )}
        </div>

        {activeSubTab === 'EDITEUR' && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800 z-20 flex gap-2">
                <button 
                    onClick={() => onPreview(getPreviewArticle())}
                    className="flex-1 py-4 bg-zinc-800 text-white font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-700"
                >
                    <Eye className="w-4 h-4" /> APERÇU
                </button>
                <button 
                    onClick={handlePublish}
                    disabled={isSubmitting || !formData.title || (isScheduled && !scheduledDate)}
                    className={`flex-[2] py-4 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 ${
                        isSubmitting || !formData.title || (isScheduled && !scheduledDate)
                            ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800' 
                            : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                >
                    {isSubmitting ? 'TRAITEMENT...' : (
                        <>
                            {isScheduled ? <Clock className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
                            {isScheduled ? 'PROGRAMMER' : 'PUBLIER'}
                        </>
                    )}
                </button>
            </div>
        )}
    </div>
  );
});

export default AdminStudio;
