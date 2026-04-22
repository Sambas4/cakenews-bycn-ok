
import React, { useState } from 'react';
import { Article } from '../../types';
import { Eye, Activity, List, Server, TrendingUp, Zap, Users, UserPlus, MapPin, Hash, BarChart2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

type DashboardSubTab = 'SYNTHESE' | 'LIVE' | 'SYSTEME';

const SubTabButton = ({ id, label, icon: Icon, activeSubTab, setActiveSubTab }: { id: DashboardSubTab; label: string; icon: any, activeSubTab: DashboardSubTab, setActiveSubTab: (id: DashboardSubTab) => void }) => (
    <button
      onClick={() => setActiveSubTab(id)}
      className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
        activeSubTab === id 
          ? 'border-white text-white' 
          : 'border-transparent text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

const KPICard = ({ label, value, subValue, icon: Icon, color = 'white' }: any) => (
      <div className="bg-zinc-900 p-5 border border-zinc-800 relative overflow-hidden group rounded-2xl">
          <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon className="w-8 h-8" />
          </div>
          <div className="relative z-10">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-2">
                  <Icon className="w-3 h-3" /> {label}
              </span>
              <p className={`text-3xl font-[1000] tracking-tight ${color === 'green' ? 'text-emerald-500' : color === 'red' ? 'text-red-500' : 'text-white'}`}>
                  {value}
              </p>
              {subValue && (
                  <p className="text-[9px] font-mono text-zinc-400 mt-1 uppercase">
                      {subValue}
                  </p>
              )}
          </div>
      </div>
  );

const AdminDashboard: React.FC<{ articles: Article[] }> = ({ articles }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<DashboardSubTab>('SYNTHESE');

  // MOCK DATA CALCULATED
  const totalComments = articles.reduce((acc, curr) => acc + curr.comments, 0);
  const liveUsers = 1420; // Mock live users
  const newUsersToday = 342; // Mock acquisition

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-sans">
      <div className="flex bg-black border-b border-zinc-800 shrink-0">
        <SubTabButton id="SYNTHESE" label="Pilotage" icon={Activity} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
        <SubTabButton id="LIVE" label="Flux Direct" icon={List} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        
        {activeSubTab === 'SYNTHESE' && (
          <div className="space-y-4">
            
            {/* TOP KPIs GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <KPICard 
                label="Audience Live" 
                value={liveUsers} 
                subValue="Lecteurs Actifs" 
                icon={Users}
                color="white"
              />
              <KPICard 
                label="Acquisition (24h)" 
                value={`+${newUsersToday}`} 
                subValue="Nouveaux Comptes" 
                icon={UserPlus} 
                color="green" 
              />
              <KPICard 
                label="Viralité" 
                value="9.2" 
                subValue="Index / 10" 
                icon={TrendingUp} 
                color="green" 
              />
              <KPICard 
                label="Débats" 
                value={(totalComments / 1000).toFixed(1) + 'k'} 
                subValue="Messages échangés" 
                icon={Zap} 
                color="white" 
              />
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="flex flex-col lg:flex-row gap-4">
                
                {/* LEFT: ACTIVITY & GEO */}
                <div className="flex-1 space-y-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-5">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Pic de Lecture (24h)
                            </h3>
                            <span className="text-[9px] bg-emerald-900/30 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded">EN DIRECT</span>
                        </div>
                        {/* Graph Bars */}
                        <div className="flex items-end justify-between h-32 gap-1">
                            {[40, 25, 30, 45, 60, 85, 70, 90, 60, 50, 40, 55, 75, 95, 100, 85, 70, 60, 45, 30].map((h, i) => (
                                <div key={i} className="flex-1 bg-zinc-800 hover:bg-white transition-colors cursor-crosshair group relative" style={{ height: `${h}%` }}>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-[8px] font-mono text-zinc-600 uppercase">
                            <span>00:00</span>
                            <span>12:00</span>
                            <span>23:59</span>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Pénétration Géographique
                        </h3>
                        <div className="space-y-3">
                            {[
                                { name: 'Libreville / Louis', val: 45, col: 'bg-emerald-500' },
                                { name: 'Libreville / Nzeng Ayong', val: 32, col: 'bg-blue-500' },
                                { name: 'Port-Gentil / Centre', val: 18, col: 'bg-purple-500' },
                                { name: 'Paris / 16ème (Diaspora)', val: 12, col: 'bg-zinc-500' }
                            ].map((zone, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-[9px] font-mono text-zinc-400 w-6">0{idx + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-bold text-white uppercase">{zone.name}</span>
                                            <span className="text-[9px] font-mono text-zinc-500">{zone.val}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-black rounded-full overflow-hidden">
                                            <div className={`h-full ${zone.col}`} style={{ width: `${zone.val}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: EDITORIAL INTELLIGENCE */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    
                    {/* VIBE MÉTÉO - Remplaçant CPU/RAM */}
                    <div className="bg-zinc-900 border border-zinc-800 p-5 flex-1">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                            <BarChart2 className="w-3 h-3" /> Météo de l'Opinion
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🤯</span>
                                    <div>
                                        <span className="text-[10px] font-bold text-white uppercase block">Choqué</span>
                                        <span className="text-[8px] text-zinc-500 font-mono">Dominant sur "Politique"</span>
                                    </div>
                                </div>
                                <span className="text-xl font-[1000] text-white">42%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-[42%]"></div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🚀</span>
                                    <div>
                                        <span className="text-[10px] font-bold text-white uppercase block">Bullish</span>
                                        <span className="text-[8px] text-zinc-500 font-mono">Dominant sur "Crypto"</span>
                                    </div>
                                </div>
                                <span className="text-xl font-[1000] text-white">28%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[28%]"></div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🤨</span>
                                    <div>
                                        <span className="text-[10px] font-bold text-white uppercase block">Sceptique</span>
                                        <span className="text-[8px] text-zinc-500 font-mono">Dominant sur "Tech"</span>
                                    </div>
                                </div>
                                <span className="text-xl font-[1000] text-white">15%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-[15%]"></div>
                            </div>
                        </div>
                    </div>

                    {/* SIGNAUX FAIBLES - Remplaçant Logs */}
                    <div className="bg-zinc-900 border border-zinc-800 p-5 flex-1">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <Hash className="w-3 h-3" /> Signaux Faibles (Trending)
                        </h3>
                        <div className="space-y-2">
                            {[
                                { tag: "CoupureEau", count: "+450%", status: "critical" },
                                { tag: "CAN2025", count: "+120%", status: "rising" },
                                { tag: "Starlink", count: "+85%", status: "stable" },
                                { tag: "PrixEssence", count: "+60%", status: "stable" }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-black border border-zinc-800 rounded-lg">
                                    <span className="text-[10px] font-bold text-white uppercase">#{item.tag}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                        item.status === 'critical' ? 'bg-red-500 text-white' : 
                                        item.status === 'rising' ? 'bg-emerald-500 text-black' : 
                                        'text-zinc-500'
                                    }`}>
                                        {item.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
          </div>
        )}

        {activeSubTab === 'LIVE' && (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Flux de Publication</h3>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">LIVE</span>
                </div>
            </div>
            <div className="flex flex-col gap-1">
              {articles.map(article => (
                <div key={article.id} className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 cursor-pointer transition-colors group">
                  <span className="text-[9px] font-mono text-zinc-600 group-hover:text-white">{article.timestamp}</span>
                  <div className={`w-1 h-8 ${article.isExclusive ? 'bg-red-600' : 'bg-zinc-700'}`}></div>
                  <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{article.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase bg-black px-1.5 py-0.5 rounded border border-zinc-800">{article.category}</span>
                        <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {article.likes}
                        </span>
                      </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[9px] font-black uppercase bg-white text-black px-3 py-1.5 rounded hover:bg-zinc-200">Éditer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
