
import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Search, Shield, Ban, CheckCircle, Mail, Send, Trophy, Filter, List, Heart, MessageSquare, AlertTriangle, Megaphone } from 'lucide-react';
import { AdminTabHandle } from './AdminView';
import { UserData } from '../../types';
import { MOCK_USERS } from '../../data/mockData';

interface AdminUsersProps {
    onSendNotification?: (target: string, content: string) => void;
}

const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50 text-zinc-500">
        <Icon className="w-4 h-4" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
    </div>
);

const AdminUsers = forwardRef<AdminTabHandle, AdminUsersProps>(({ onSendNotification }, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ADMIN' | 'BANNED'>('ALL');
  const [users, setUsers] = useState<UserData[]>(MOCK_USERS);
  
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null); 
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (showMessageForm) {
        setShowMessageForm(false);
        return true;
      }
      return false;
    }
  }));

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.handle.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'ALL') return matchesSearch;
    if (filter === 'ADMIN') return matchesSearch && (user.role === 'ADMIN' || user.role === 'MODERATOR');
    if (filter === 'BANNED') return matchesSearch && user.status === 'BANNED';
    return matchesSearch;
  });

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'BANNED' ? 'ACTIVE' : 'BANNED' };
      }
      return u;
    }));
  };

  const handleOpenMessage = (user: UserData | null) => {
      setSelectedUser(user);
      setShowMessageForm(true);
  };
  
  const handleCertify = (user: UserData) => {
      if(window.confirm(`Attribuer le trophée Hall of Fame à ${user.name} ?`)) {
          onSendNotification?.(user.handle, "FÉLICITATIONS ! Vous avez rejoint le Hall of Fame CakeNews.");
          alert(`Trophée attribué à ${user.name}`);
      }
  }

  const handleSend = () => {
      if(!messageContent.trim()) return;
      setIsSending(true);
      
      const target = selectedUser ? selectedUser.handle : 'ALL';
      
      // Envoi immédiat (mock)
      setTimeout(() => {
          onSendNotification?.(target, messageContent);
          setIsSending(false);
          setShowMessageForm(false);
          setMessageContent('');
      }, 100);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-sans relative">
      {/* HEADER RECHERCHE */}
      <div className="p-4 border-b border-zinc-800 bg-black">
        <SectionTitle icon={Filter} title="RECHERCHE & FILTRES" />
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-colors rounded-none"
          />
        </div>
        
        <div className="flex justify-between mt-4">
            <div className="flex gap-2">
            {['ALL', 'ADMIN', 'BANNED'].map((f) => (
                <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border ${
                    filter === f 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                }`}
                >
                {f}
                </button>
            ))}
            </div>
            <button 
                onClick={() => handleOpenMessage(null)}
                className="px-4 py-1.5 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest border border-zinc-700 hover:bg-zinc-700 flex items-center gap-2"
            >
                <Megaphone className="w-3 h-3" /> Broadcast
            </button>
        </div>
      </div>

      {/* LISTE UTILISATEURS */}
      <div className="flex-1 overflow-y-auto pb-20 p-4">
        <SectionTitle icon={List} title="ANALYSE D'ACTIVITÉ" />
        
        <div className="divide-y divide-zinc-900">
          {filteredUsers.map(user => (
            <div key={user.id} className="py-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors group px-2 rounded-lg">
              
              <div className="flex items-center gap-4 w-1/3">
                <div className="relative">
                  <img src={user.avatar} className={`w-12 h-12 rounded-full object-cover border-2 ${user.status === 'BANNED' ? 'border-red-600 grayscale' : 'border-zinc-800'}`} alt="" />
                  {user.role === 'ADMIN' && (
                    <div className="absolute -bottom-1 -right-1 bg-white text-black p-1 rounded-full">
                      <Shield className="w-3 h-3 fill-current" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{user.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500 truncate block">{user.handle}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      user.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-500' :
                      user.status === 'BANNED' ? 'bg-red-500/20 text-red-500' :
                      'bg-amber-500/20 text-amber-500'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex justify-center gap-6 border-l border-r border-zinc-800/50 px-4">
                  <div className="flex flex-col items-center w-16">
                      <span className="text-xs font-black text-white">{user.stats?.likesGiven || 0}</span>
                      <span className="text-[8px] text-zinc-500 uppercase flex items-center gap-1"><Heart className="w-2 h-2" /> Donnés</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                      <span className="text-xs font-black text-white">{user.stats?.commentsPosted || 0}</span>
                      <span className="text-[8px] text-zinc-500 uppercase flex items-center gap-1"><MessageSquare className="w-2 h-2" /> Posts</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                      <span className={`text-xs font-black ${user.stats?.reportsReceived > 0 ? 'text-red-500' : 'text-zinc-600'}`}>{user.stats?.reportsReceived || 0}</span>
                      <span className="text-[8px] text-zinc-500 uppercase flex items-center gap-1"><AlertTriangle className="w-2 h-2" /> Reports</span>
                  </div>
              </div>

              <div className="flex items-center gap-2 w-1/4 justify-end">
                 <button 
                    onClick={() => handleCertify(user)}
                    className="p-2 text-zinc-600 hover:text-yellow-500 transition-colors"
                    title="Certifier / Hall of Fame"
                 >
                    <Trophy className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => handleOpenMessage(user)}
                    className="p-2 text-zinc-600 hover:text-white transition-colors"
                 >
                    <Mail className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => toggleStatus(user.id)}
                   className={`p-2 transition-colors ${user.status === 'BANNED' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-red-500 hover:bg-red-500/10'}`}
                 >
                    {user.status === 'BANNED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                 </button>
              </div>
            </div>
          ))}
          
          {filteredUsers.length === 0 && (
             <div className="py-20 flex flex-col items-center text-zinc-600">
               <Shield className="w-12 h-12 mb-4 opacity-20" />
               <p className="text-xs font-mono uppercase">Aucun utilisateur trouvé</p>
             </div>
          )}
        </div>
      </div>

      {/* OVERLAY MESSAGE (NO ANIMATION) */}
      {showMessageForm && (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-sm font-black uppercase text-white mb-4 flex items-center gap-2">
                      <Send className="w-4 h-4" /> 
                      {selectedUser ? `Message à ${selectedUser.handle}` : 'Broadcast Général'}
                  </h3>
                  <textarea 
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Contenu du message système..."
                      className="w-full h-32 bg-black border border-zinc-700 rounded-xl p-4 text-white text-sm font-bold outline-none resize-none mb-4 focus:border-white"
                  />
                  <div className="flex gap-2">
                      <button 
                          onClick={() => setShowMessageForm(false)}
                          className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-700"
                      >
                          Annuler
                      </button>
                      <button 
                          onClick={handleSend}
                          disabled={isSending}
                          className="flex-1 py-3 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200"
                      >
                          {isSending ? 'Envoi...' : 'Envoyer'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
});

export default AdminUsers;
