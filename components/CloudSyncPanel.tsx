/**
 * DIRECTOR - Cloud Sync Panel
 * 
 * UI for Supabase cloud storage:
 * - Toggle cloud sync on/off
 * - Manual sync button
 * - Browse cloud projects
 * - Sync status indicator
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  FolderOpen,
  X,
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  isCloudEnabled,
  saveProjectToCloud,
  listCloudProjects,
  loadProjectFromCloud,
  deleteProjectFromCloud,
  syncAllToCloud,
  pullFromCloud,
  getCloudStatus
} from '../services/supabaseService';
import { Project } from '../types';

// ===========================================
// TYPES
// ===========================================

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface CloudProject {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
}

interface CloudSyncPanelProps {
  currentProject: Project | null;
  allProjects: Project[];
  onLoadProject: (project: Project) => void;
  onProjectsUpdated: () => void;
}

// ===========================================
// CLOUD SYNC TOGGLE (Header Button)
// ===========================================

interface CloudToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  syncStatus: SyncStatus;
  onSyncNow: () => void;
}

export const CloudToggle: React.FC<CloudToggleProps> = ({
  isEnabled,
  onToggle,
  syncStatus,
  onSyncNow
}) => {
  const cloudAvailable = isCloudEnabled();
  
  if (!cloudAvailable) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-500">
        <CloudOff size={14} />
        <span>Cloud N/A</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sync Status Indicator */}
      <button
        onClick={onSyncNow}
        disabled={syncStatus === 'syncing' || !isEnabled}
        className={`
          px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 border transition-all
          ${syncStatus === 'syncing' ? 'bg-blue-900/30 border-blue-700 text-blue-400' : ''}
          ${syncStatus === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' : ''}
          ${syncStatus === 'error' ? 'bg-red-900/30 border-red-700 text-red-400' : ''}
          ${syncStatus === 'idle' && isEnabled ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : ''}
          ${!isEnabled ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed' : ''}
        `}
      >
        {syncStatus === 'syncing' && <Loader2 size={14} className="animate-spin" />}
        {syncStatus === 'success' && <Check size={14} />}
        {syncStatus === 'error' && <AlertCircle size={14} />}
        {syncStatus === 'idle' && (isEnabled ? <Cloud size={14} /> : <CloudOff size={14} />)}
        
        {syncStatus === 'syncing' ? 'Syncing...' : 
         syncStatus === 'success' ? 'Synced' :
         syncStatus === 'error' ? 'Sync Error' :
         isEnabled ? 'Sync Now' : 'Cloud Off'}
      </button>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          p-1.5 rounded border transition-all
          ${isEnabled 
            ? 'bg-cyan-900/30 border-cyan-700 text-cyan-400 hover:bg-cyan-800/30' 
            : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'}
        `}
        title={isEnabled ? 'Disable Cloud Sync' : 'Enable Cloud Sync'}
      >
        {isEnabled ? <Wifi size={14} /> : <WifiOff size={14} />}
      </button>
    </div>
  );
};

// ===========================================
// CLOUD PROJECTS BROWSER MODAL
// ===========================================

interface CloudBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: Project) => void;
  localProjects: Project[];
}

export const CloudBrowser: React.FC<CloudBrowserProps> = ({
  isOpen,
  onClose,
  onLoadProject,
  localProjects
}) => {
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCloudProjects();
    }
  }, [isOpen]);

  const loadCloudProjects = async () => {
    setIsLoading(true);
    const projects = await listCloudProjects();
    setCloudProjects(projects);
    setIsLoading(false);
  };

  const handleDownload = async (projectId: string) => {
    setIsDownloading(true);
    const project = await loadProjectFromCloud(projectId);
    if (project) {
      onLoadProject(project);
      onClose();
    } else {
      alert('Failed to load project from cloud');
    }
    setIsDownloading(false);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Delete this project from cloud? Local copy will be kept.')) return;
    
    const success = await deleteProjectFromCloud(projectId);
    if (success) {
      setCloudProjects(prev => prev.filter(p => p.id !== projectId));
    } else {
      alert('Failed to delete project');
    }
  };

  const isInLocal = (cloudId: string) => {
    return localProjects.some(p => p.id === cloudId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cloud className="w-5 h-5 text-cyan-400" />
            Cloud Projects
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCloudProjects}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : cloudProjects.length === 0 ? (
            <div className="text-center py-12">
              <Cloud className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No projects in cloud storage</p>
              <p className="text-xs text-gray-500 mt-2">
                Enable cloud sync to backup your projects
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cloudProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedId(project.id)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedId === project.id 
                      ? 'bg-cyan-900/20 border-cyan-700' 
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-bold text-white">{project.name}</h3>
                        <p className="text-xs text-gray-500">
                          {project.type} • Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isInLocal(project.id) && (
                        <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                          Local ✓
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(project.id); }}
                        disabled={isDownloading}
                        className="p-2 text-cyan-400 hover:bg-cyan-900/30 rounded"
                        title="Load from cloud"
                      >
                        {isDownloading && selectedId === project.id 
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Download size={16} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded"
                        title="Delete from cloud"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 shrink-0">
          <p className="text-xs text-gray-500">
            ☁️ Cloud storage: <span className="text-cyan-400">{getCloudStatus().url}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ===========================================
// MAIN CLOUD SYNC PANEL (Sidebar)
// ===========================================

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  currentProject,
  allProjects,
  onLoadProject,
  onProjectsUpdated
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Load preference
    const saved = localStorage.getItem('cc_cloud_sync_enabled') === 'true';
    setIsEnabled(saved && isCloudEnabled());
  }, []);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem('cc_cloud_sync_enabled', String(newValue));
    
    if (newValue && currentProject) {
      // Auto-sync on enable
      handleSyncNow();
    }
  };

  const handleSyncNow = async () => {
    if (!currentProject || !isEnabled) return;
    
    setSyncStatus('syncing');
    const result = await saveProjectToCloud(currentProject);
    
    if (result.success) {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
      console.error('Cloud sync failed:', result.error);
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handleSyncAll = async () => {
    if (!isEnabled || allProjects.length === 0) return;
    
    setSyncStatus('syncing');
    const result = await syncAllToCloud(allProjects);
    
    if (result.failed === 0) {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handlePullAll = async () => {
    if (!isEnabled) return;
    
    setSyncStatus('syncing');
    const cloudProjects = await pullFromCloud();
    
    if (cloudProjects.length > 0) {
      // Merge with local (cloud wins for conflicts)
      // This would need proper merge logic in production
      setSyncStatus('success');
      onProjectsUpdated();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('idle');
    }
  };

  const cloudAvailable = isCloudEnabled();

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Cloud size={14} />
          Cloud Sync
        </h3>
        {cloudAvailable && (
          <button
            onClick={handleToggle}
            className={`
              relative w-10 h-5 rounded-full transition-colors
              ${isEnabled ? 'bg-cyan-600' : 'bg-gray-700'}
            `}
          >
            <span
              className={`
                absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow
                ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}
              `}
            />
          </button>
        )}
      </div>

      {!cloudAvailable ? (
        <div className="bg-gray-800 rounded p-3 text-xs text-gray-500">
          <p className="mb-2">☁️ Cloud sync not configured</p>
          <p className="text-gray-600">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable</p>
        </div>
      ) : !isEnabled ? (
        <div className="bg-gray-800 rounded p-3 text-xs text-gray-500">
          <p>Enable cloud sync to backup projects to Supabase</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Status:</span>
            <span className={`
              flex items-center gap-1
              ${syncStatus === 'syncing' ? 'text-blue-400' : ''}
              ${syncStatus === 'success' ? 'text-green-400' : ''}
              ${syncStatus === 'error' ? 'text-red-400' : ''}
              ${syncStatus === 'idle' ? 'text-gray-400' : ''}
            `}>
              {syncStatus === 'syncing' && <Loader2 size={12} className="animate-spin" />}
              {syncStatus === 'success' && <Check size={12} />}
              {syncStatus === 'error' && <AlertCircle size={12} />}
              {syncStatus === 'idle' && <Cloud size={12} />}
              {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
            </span>
          </div>

          {lastSyncTime && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Last sync:</span>
              <span className="text-gray-400">
                {lastSyncTime.toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSyncNow}
              disabled={syncStatus === 'syncing' || !currentProject}
              className="flex-1 bg-cyan-900/30 hover:bg-cyan-800/30 border border-cyan-700 text-cyan-400 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Upload size={12} />
              Push
            </button>
            <button
              onClick={() => setIsBrowserOpen(true)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1"
            >
              <FolderOpen size={12} />
              Browse
            </button>
          </div>
        </div>
      )}

      {/* Cloud Browser Modal */}
      <CloudBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onLoadProject={onLoadProject}
        localProjects={allProjects}
      />
    </div>
  );
};

export default CloudSyncPanel;
