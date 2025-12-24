/**
 * DIRECTOR - Supabase Cloud Storage Service
 * 
 * Syncs projects to Supabase for:
 * - Cross-device access
 * - Team collaboration
 * - Enterprise backup
 * - FREMANTLE-ready security
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project } from '../types';

// ===========================================
// CONFIGURATION
// ===========================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ajsbopbuejhhaxwtbbku.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const TENANT_ID = 'cc-internal-001';

let supabase: SupabaseClient | null = null;

// ===========================================
// INITIALIZATION
// ===========================================

export function initSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  
  if (!SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase not configured - cloud sync disabled');
    console.warn('   Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable');
    return null;
  }
  
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('☁️ Supabase connected');
  return supabase;
}

export function isCloudEnabled(): boolean {
  return !!SUPABASE_ANON_KEY;
}

// ===========================================
// PROJECT OPERATIONS
// ===========================================

/**
 * Save project to Supabase
 */
export async function saveProjectToCloud(project: Project): Promise<{ success: boolean; error?: string }> {
  const client = initSupabase();
  if (!client) {
    return { success: false, error: 'Cloud sync not configured' };
  }
  
  try {
    // Transform Project to DB format
    const dbProject = {
      id: project.id,
      tenant_id: TENANT_ID,
      name: project.name,
      project_type: project.type,
      idea: project.idea,
      script: project.script,
      structure: project.structure,
      characters: project.characters,
      locations: project.locations,
      models: project.models,
      style_references: project.styleReferences,
      style_analysis: project.styleAnalysis,
      brand_assets: project.brandAssets,
      world_look: project.worldLook,
      prompt_guidelines: project.promptGuidelines,
      resolution: project.resolution,
      aspect_ratio: project.aspectRatio,
      gems: project.gems,
      team: project.team,
      orchestrator_context: project.orchestratorContext,
      owner_email: 'sam@channelchangers.co', // TODO: Get from auth
      last_synced_at: new Date().toISOString(),
    };
    
    const { error } = await client
      .from('director_projects')
      .upsert(dbProject, { onConflict: 'id' });
    
    if (error) {
      console.error('☁️ Cloud save failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('☁️ Saved to cloud:', project.name);
    return { success: true };
    
  } catch (err) {
    console.error('☁️ Cloud save error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Load project from Supabase
 */
export async function loadProjectFromCloud(projectId: string): Promise<Project | null> {
  const client = initSupabase();
  if (!client) return null;
  
  try {
    const { data, error } = await client
      .from('director_projects')
      .select('*')
      .eq('id', projectId)
      .eq('tenant_id', TENANT_ID)
      .single();
    
    if (error || !data) {
      console.error('☁️ Cloud load failed:', error);
      return null;
    }
    
    // Transform DB format to Project
    return transformDbToProject(data);
    
  } catch (err) {
    console.error('☁️ Cloud load error:', err);
    return null;
  }
}

/**
 * List all projects from Supabase
 */
export async function listCloudProjects(): Promise<Array<{ id: string; name: string; type: string; updatedAt: string }>> {
  const client = initSupabase();
  if (!client) return [];
  
  try {
    const { data, error } = await client
      .from('director_projects')
      .select('id, name, project_type, updated_at')
      .eq('tenant_id', TENANT_ID)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('☁️ Cloud list failed:', error);
      return [];
    }
    
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      type: p.project_type,
      updatedAt: p.updated_at,
    }));
    
  } catch (err) {
    console.error('☁️ Cloud list error:', err);
    return [];
  }
}

/**
 * Delete project from Supabase
 */
export async function deleteProjectFromCloud(projectId: string): Promise<boolean> {
  const client = initSupabase();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('director_projects')
      .delete()
      .eq('id', projectId)
      .eq('tenant_id', TENANT_ID);
    
    if (error) {
      console.error('☁️ Cloud delete failed:', error);
      return false;
    }
    
    console.log('☁️ Deleted from cloud:', projectId);
    return true;
    
  } catch (err) {
    console.error('☁️ Cloud delete error:', err);
    return false;
  }
}

// ===========================================
// SYNC OPERATIONS
// ===========================================

/**
 * Full sync: Push all local projects to cloud
 */
export async function syncAllToCloud(projects: Project[]): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  
  for (const project of projects) {
    const result = await saveProjectToCloud(project);
    if (result.success) {
      synced++;
    } else {
      failed++;
    }
  }
  
  console.log(`☁️ Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Pull: Get latest from cloud, merge with local
 */
export async function pullFromCloud(): Promise<Project[]> {
  const client = initSupabase();
  if (!client) return [];
  
  try {
    const { data, error } = await client
      .from('director_projects')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('☁️ Cloud pull failed:', error);
      return [];
    }
    
    return (data || []).map(transformDbToProject);
    
  } catch (err) {
    console.error('☁️ Cloud pull error:', err);
    return [];
  }
}

// ===========================================
// HELPERS
// ===========================================

function transformDbToProject(data: any): Project {
  return {
    id: data.id,
    name: data.name,
    type: data.project_type || 'narrative',
    idea: data.idea || '',
    script: data.script || '',
    structure: data.structure,
    characters: data.characters || [],
    locations: data.locations || [],
    models: data.models || [],
    styleReferences: data.style_references || [],
    styleAnalysis: data.style_analysis,
    brandAssets: data.brand_assets || [],
    worldLook: data.world_look || '',
    promptGuidelines: data.prompt_guidelines || '',
    resolution: data.resolution || '1080p',
    aspectRatio: data.aspect_ratio || '16:9',
    gems: data.gems || [],
    team: data.team || [{ id: 'u1', name: 'User', role: 'Director', avatarColor: 'bg-blue-500' }],
    orchestratorContext: data.orchestrator_context,
    createdAt: new Date(data.created_at).getTime(),
  };
}

// ===========================================
// EXPORT STATUS
// ===========================================

export function getCloudStatus(): { enabled: boolean; url: string } {
  return {
    enabled: isCloudEnabled(),
    url: SUPABASE_URL,
  };
}
