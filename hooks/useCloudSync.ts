/**
 * DIRECTOR - Cloud Sync Hook
 * 
 * Simple integration hook for Supabase cloud storage.
 * Add this to App.tsx for automatic cloud sync.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isCloudEnabled,
  saveProjectToCloud,
  loadProjectFromCloud,
  listCloudProjects,
  syncAllToCloud,
  getCloudStatus
} from '../services/supabaseService';
import { Project } from '../types';

export type CloudSyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'disabled';

export interface CloudSyncState {
  isEnabled: boolean;
  isConfigured: boolean;
  status: CloudSyncStatus;
  lastSyncTime: Date | null;
  error: string | null;
}

export interface UseCloudSyncReturn {
  state: CloudSyncState;
  toggleEnabled: () => void;
  syncNow: (project: Project) => Promise<boolean>;
  syncAll: (projects: Project[]) => Promise<{ synced: number; failed: number }>;
  loadFromCloud: (projectId: string) => Promise<Project | null>;
  listCloud: () => Promise<Array<{ id: string; name: string; type: string; updatedAt: string }>>;
}

/**
 * Hook for cloud sync functionality
 * 
 * Usage in App.tsx:
 * ```tsx
 * const cloudSync = useCloudSync();
 * 
 * // In auto-save effect:
 * if (cloudSync.state.isEnabled) {
 *   cloudSync.syncNow(currentProject);
 * }
 * ```
 */
export function useCloudSync(): UseCloudSyncReturn {
  const [state, setState] = useState<CloudSyncState>({
    isEnabled: false,
    isConfigured: isCloudEnabled(),
    status: isCloudEnabled() ? 'idle' : 'disabled',
    lastSyncTime: null,
    error: null
  });

  // Load preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('cc_cloud_sync_enabled') === 'true';
    setState(prev => ({
      ...prev,
      isEnabled: saved && prev.isConfigured
    }));
  }, []);

  // Toggle cloud sync on/off
  const toggleEnabled = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.isEnabled && prev.isConfigured;
      localStorage.setItem('cc_cloud_sync_enabled', String(newEnabled));
      return {
        ...prev,
        isEnabled: newEnabled,
        status: newEnabled ? 'idle' : 'disabled'
      };
    });
  }, []);

  // Sync single project
  const syncNow = useCallback(async (project: Project): Promise<boolean> => {
    if (!state.isEnabled || !state.isConfigured) return false;

    setState(prev => ({ ...prev, status: 'syncing', error: null }));

    const result = await saveProjectToCloud(project);

    setState(prev => ({
      ...prev,
      status: result.success ? 'success' : 'error',
      lastSyncTime: result.success ? new Date() : prev.lastSyncTime,
      error: result.error || null
    }));

    // Reset to idle after 3 seconds
    if (result.success) {
      setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, 3000);
    }

    return result.success;
  }, [state.isEnabled, state.isConfigured]);

  // Sync all projects
  const syncAll = useCallback(async (projects: Project[]) => {
    if (!state.isEnabled || !state.isConfigured) {
      return { synced: 0, failed: projects.length };
    }

    setState(prev => ({ ...prev, status: 'syncing', error: null }));

    const result = await syncAllToCloud(projects);

    setState(prev => ({
      ...prev,
      status: result.failed === 0 ? 'success' : 'error',
      lastSyncTime: new Date(),
      error: result.failed > 0 ? `${result.failed} project(s) failed to sync` : null
    }));

    // Reset to idle
    setTimeout(() => {
      setState(prev => ({ ...prev, status: 'idle' }));
    }, 3000);

    return result;
  }, [state.isEnabled, state.isConfigured]);

  // Load project from cloud
  const loadFromCloud = useCallback(async (projectId: string): Promise<Project | null> => {
    return await loadProjectFromCloud(projectId);
  }, []);

  // List cloud projects
  const listCloud = useCallback(async () => {
    return await listCloudProjects();
  }, []);

  return {
    state,
    toggleEnabled,
    syncNow,
    syncAll,
    loadFromCloud,
    listCloud
  };
}

export default useCloudSync;
