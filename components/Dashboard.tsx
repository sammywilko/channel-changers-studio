
import React, { useState, useEffect } from 'react';
import { Project, User, ProjectType } from '../types';
import { DEFAULT_TEAM } from '../constants';
import { FolderPlus, FolderOpen, Trash2, Upload, Image as ImageIcon, Film, ShoppingBag, Cloud, CheckCircle, Settings, LogOut, X, ExternalLink } from 'lucide-react';
import { authenticateGoogle, isConnected, disconnectGoogle } from '../services/googleDriveService';
import clsx from 'clsx';

interface DashboardProps {
  projects: Project[];
  onCreateProject: (name: string, type: ProjectType, templateId?: 'channelChangers' | 'blank') => void;
  onLoadProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  currentUser: User;
  onSwitchUser: (user: User) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onCreateProject, onLoadProject, onDeleteProject, currentUser, onSwitchUser }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('narrative');
  const [selectedTemplate, setSelectedTemplate] = useState<'channelChangers' | 'blank'>('channelChangers');
  const [brandingImage, setBrandingImage] = useState<string | null>(null);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [isDriveEnabled, setIsDriveEnabled] = useState(false); // Feature Flag
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);

  useEffect(() => {
    const savedBrand = localStorage.getItem('nano_os_branding');
    if (savedBrand) setBrandingImage(savedBrand);
    
    // Load Feature Flags
    const savedDriveEnabled = localStorage.getItem('cc_drive_enabled') === 'true';
    setIsDriveEnabled(savedDriveEnabled);
    setIsDriveConnected(isConnected());
  }, []);

  const toggleDriveFeature = (enabled: boolean) => {
      setIsDriveEnabled(enabled);
      localStorage.setItem('cc_drive_enabled', String(enabled));
      if (!enabled && isDriveConnected) {
          disconnectGoogle();
          setIsDriveConnected(false);
      }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreateProject(
        newProjectName,
        newProjectType,
        newProjectType === 'narrative' ? selectedTemplate : undefined
      );
      setNewProjectName('');
      setSelectedTemplate('channelChangers'); // Reset to default
    }
  };

  const handleBrandUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBrandingImage(result);
        localStorage.setItem('nano_os_branding', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDriveConnect = async () => {
     if (isDriveConnected) {
        disconnectGoogle();
        setIsDriveConnected(false);
     } else {
        setIsConnectingDrive(true);
        await authenticateGoogle();
        setIsDriveConnected(true);
        setIsConnectingDrive(false);
     }
  };

  return (
    <div className="min-h-screen bg-nano-900 text-white flex flex-col items-center justify-center p-8 relative overflow-y-auto">
      
      {/* Top Right Controls */}
      <div className="absolute top-8 right-8 flex items-center gap-4 z-20">
         {/* User Switcher */}
         <div className="flex items-center gap-3 bg-gray-800/80 backdrop-blur p-2 rounded-full border border-gray-700">
            <span className="text-xs text-gray-400 pl-2">Role:</span>
            <div className="flex space-x-1">
                {DEFAULT_TEAM.map(user => (
                <button 
                    key={user.id}
                    onClick={() => onSwitchUser(user)}
                    className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all relative group", 
                        currentUser.id === user.id ? "border-white scale-110 z-10" : "border-transparent opacity-50 hover:opacity-100",
                        user.avatarColor
                    )}
                    title={`${user.name} (${user.role})`}
                >
                    {user.name.charAt(0)}
                </button>
                ))}
            </div>
         </div>

         {/* Settings Button */}
         <button 
            onClick={() => setShowSettings(true)}
            className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors shadow-lg"
         >
            <Settings size={20} />
         </button>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} /> Studio Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
               </div>

               <div className="space-y-6">
                  {/* Branding Section */}
                  <div>
                     <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Custom Branding</h3>
                     <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-800 rounded-lg border border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
                           {brandingImage ? <img src={brandingImage} className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-gray-600"/>}
                        </div>
                        <label className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded cursor-pointer border border-gray-700 transition-colors">
                           Upload Logo
                           <input type="file" className="hidden" accept="image/*" onChange={handleBrandUpload} />
                        </label>
                     </div>
                  </div>

                  {/* Cloud Sync Section */}
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                     <div className="flex justify-between items-start mb-3">
                        <div>
                           <h3 className="text-sm font-bold text-white flex items-center gap-2"><Cloud size={16} /> Optional Cloud Sync</h3>
                           <p className="text-[10px] text-gray-400 mt-1">Connect Google Drive for team backup & sharing.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input type="checkbox" className="sr-only peer" checked={isDriveEnabled} onChange={(e) => toggleDriveFeature(e.target.checked)} />
                           <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-nano-accent"></div>
                        </label>
                     </div>

                     {isDriveEnabled && (
                        <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-700/50">
                           <button 
                              onClick={handleDriveConnect}
                              className={clsx("w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors", 
                                 isDriveConnected 
                                    ? "bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900" 
                                    : "bg-white text-black hover:bg-gray-200"
                              )}
                           >
                              {isConnectingDrive ? <span className="animate-pulse">Connecting...</span> : 
                                 isDriveConnected ? <><LogOut size={14}/> Disconnect Drive</> : <><Cloud size={14}/> Connect Google Account</>
                              }
                           </button>
                           {isDriveConnected && (
                              <p className="text-[10px] text-green-400 mt-2 text-center flex items-center justify-center gap-1">
                                 <CheckCircle size={10} /> Connected. Auto-sync enabled.
                              </p>
                           )}
                        </div>
                     )}
                  </div>
               </div>
               
               <div className="mt-6 text-center">
                   <span className="text-[10px] text-gray-600">Channel Changers Studio v10.0 • Local Storage Only Default</span>
               </div>
            </div>
         </div>
      )}

      <div className="max-w-4xl w-full space-y-8 mt-10">
        
        <div className="text-center space-y-4 mb-8">
          <div className="relative inline-block group w-full max-w-lg mx-auto">
             <div className="absolute -inset-2 bg-gradient-to-r from-nano-pink to-nano-accent rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition duration-500"></div>
             <div className="relative bg-gray-800/30 rounded-xl border-2 border-dashed border-transparent hover:border-gray-600 transition-all overflow-hidden min-h-[200px] flex items-center justify-center">
                {brandingImage ? (
                   <img src={brandingImage} alt="Studio Branding" className="w-full h-auto max-h-[300px] object-contain drop-shadow-2xl" />
                ) : (
                   <div className="flex flex-col items-center text-gray-600 p-10">
                      <ImageIcon size={48} className="mb-2 opacity-50" />
                      <span className="text-sm font-bold">UPLOAD STUDIO LOGO</span>
                   </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                   <div className="bg-nano-accent text-black px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                      <Upload size={14} /> {brandingImage ? 'CHANGE LOGO' : 'UPLOAD LOGO'}
                   </div>
                   <input type="file" className="hidden" accept="image/*" onChange={handleBrandUpload} />
                </label>
             </div>
          </div>
          
          <div>
             <h1 className="text-4xl font-bold tracking-tight mt-4">Channel Changer <span className="text-nano-accent">Studio</span></h1>
             <p className="text-gray-400 font-mono">Dual-Brain Production System v10.0</p>
          </div>
        </div>

        {/* Create New */}
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 backdrop-blur-sm shadow-xl">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FolderPlus className="text-nano-accent" /> New Production
          </h2>
          
          {/* Type Selector */}
          <div className="flex gap-4 mb-4">
             <button
               onClick={() => setNewProjectType('narrative')}
               className={clsx("flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all",
                  newProjectType === 'narrative' ? "bg-nano-pink/20 border-nano-pink text-white" : "bg-black/20 border-gray-700 text-gray-500 hover:bg-gray-800"
               )}
             >
                <Film size={24} className={newProjectType === 'narrative' ? 'text-nano-pink' : 'text-gray-600'} />
                <span className="text-xs font-bold uppercase">Narrative Episode</span>
             </button>
             <button
               onClick={() => setNewProjectType('product')}
               className={clsx("flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all",
                  newProjectType === 'product' ? "bg-nano-accent/20 border-nano-accent text-white" : "bg-black/20 border-gray-700 text-gray-500 hover:bg-gray-800"
               )}
             >
                <ShoppingBag size={24} className={newProjectType === 'product' ? 'text-nano-accent' : 'text-gray-600'} />
                <span className="text-xs font-bold uppercase">Product Campaign</span>
             </button>
          </div>

          {/* Template Selector (Narrative Only) */}
          {newProjectType === 'narrative' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Choose Template
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Channel Changers Template */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('channelChangers')}
                  className={clsx(
                    "p-4 border-2 rounded-lg text-left transition-all",
                    selectedTemplate === 'channelChangers'
                      ? 'border-nano-pink bg-nano-pink/10'
                      : 'border-gray-600 hover:border-gray-500 bg-black/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⭐</span>
                    <h3 className="font-semibold text-white">Channel Changers Series</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    Your flagship YouTube series
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Characters: Sam, Sam G, Ivan, Oliver
                  </p>
                </button>

                {/* Blank Template */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('blank')}
                  className={clsx(
                    "p-4 border-2 rounded-lg text-left transition-all",
                    selectedTemplate === 'blank'
                      ? 'border-nano-pink bg-nano-pink/10'
                      : 'border-gray-600 hover:border-gray-500 bg-black/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📄</span>
                    <h3 className="font-semibold text-white">Blank Narrative</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    Start from scratch
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    No default characters
                  </p>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} className="flex gap-4">
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={newProjectType === 'narrative' ? "Episode Name (e.g. The Glitch)" : "Campaign Name (e.g. SS25 Golf Launch)"}
              className="flex-1 bg-black/40 border border-gray-600 rounded px-4 py-3 focus:outline-none focus:border-nano-accent text-white"
            />
            <button 
              type="submit" 
              disabled={!newProjectName.trim()}
              className="bg-nano-accent hover:bg-cyan-400 text-black font-bold px-8 py-3 rounded transition-colors disabled:opacity-50"
            >
              Initialize
            </button>
          </form>
        </div>

        {/* Project List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div key={p.id} className="group bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-nano-pink transition-all relative cursor-pointer hover:-translate-y-1 shadow-lg" onClick={() => onLoadProject(p)}>
               <div className="flex justify-between items-start mb-4">
                 <div className="overflow-hidden">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-nano-pink transition-colors truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">Modified: {new Date(p.lastModified).toLocaleDateString()}</p>
                 </div>
                 {p.type === 'product' ? (
                    <div className="bg-nano-accent/20 text-nano-accent p-1.5 rounded"><ShoppingBag size={16} /></div>
                 ) : (
                    <div className="bg-nano-pink/20 text-nano-pink p-1.5 rounded"><Film size={16} /></div>
                 )}
               </div>
               
               <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2">
                 <FolderOpen size={16} /> Open Studio
               </button>
               
               <button onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }} className="absolute top-4 right-12 text-gray-600 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={16} />
               </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
