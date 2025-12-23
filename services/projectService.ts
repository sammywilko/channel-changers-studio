
import { Project, Character, Location, Gem, Resolution, AspectRatio, ProjectType } from '../types';
import { WORLD_BIBLE_CHARACTERS, PRODUCT_CATALOG, DEFAULT_GEMS, PRODUCT_GEMS, DEFAULT_WORLD_LOOK, DEFAULT_PRODUCT_LOOK, DEFAULT_PROMPT_GUIDELINES, DEFAULT_TEAM, PRODUCT_TEAM, DEFAULT_MODELS, PROJECT_TEMPLATES, getTemplateCharacters } from '../constants';
import {
  saveProjectToDB,
  getProjectsFromDB,
  getCurrentProjectFromDB,
  deleteProjectFromDB,
  getStorageEstimate,
  migrateFromLocalStorage
} from './indexedDBService';

const STORAGE_KEY = 'nano_flash_projects';
const CURRENT_PROJECT_KEY = 'channelchangers_current_project';
const MAX_PROJECTS_IN_STORAGE = 5; // Keep only 5 most recent projects in localStorage

// Helper: Estimate storage size in MB
const getStorageSize = (): number => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total / (1024 * 1024); // Convert to MB
};

// Helper: Strip large data from projects for list storage
const stripLargeData = (project: Project): Project => {
  return {
    ...project,
    // Keep only essential data for project list
    // Remove images from beats to save space
    structure: project.structure ? {
      ...project.structure,
      acts: project.structure.acts.map(act => ({
        ...act,
        scenes: act.scenes.map(scene => ({
          ...scene,
          beats: scene.beats.map(beat => ({
            ...beat,
            image_url: undefined, // Remove generated images from list storage
            video_url: undefined
          }))
        }))
      }))
    } : null,
    // Remove reference images from locations (keep IDs only)
    locations: project.locations.map(loc => ({
      ...loc,
      referenceImages: [], // Clear reference images
      shotBank: { isGenerating: false } // Clear shot bank
    })),
    // Remove reference images from characters
    characters: project.characters.map(char => ({
      ...char,
      referenceImages: [] // Clear reference images
    })),
    // Keep style references but remove image data
    styleReferences: project.styleReferences?.map(ref => ({
      ...ref,
      imageUrl: undefined
    })) || []
  };
};

// 🔄 USE INDEXEDDB - Async wrapper for getProjects
export const getProjects = (): Project[] => {
  // Return empty array synchronously, use getProjectsAsync() for actual data
  console.warn('⚠️ getProjects() is synchronous - use getProjectsAsync() instead');
  return [];
};

// ✅ IndexedDB version (async)
export const getProjectsAsync = async (): Promise<Project[]> => {
  try {
    const projects = await getProjectsFromDB();
    const { used, quota } = await getStorageEstimate();
    console.log('📂 Loaded projects from IndexedDB:', projects.length);
    console.log(`💾 Storage: ${used.toFixed(2)} MB / ${quota.toFixed(2)} MB`);
    return projects;
  } catch (error) {
    console.error('Failed to load projects from IndexedDB:', error);
    return [];
  }
};

// ✅ IndexedDB version - handles large projects with images
export const saveProject = async (project: Project): Promise<void> => {
  try {
    await saveProjectToDB(project);
    const { used, quota } = await getStorageEstimate();
    console.log(`💾 Saved to IndexedDB: ${used.toFixed(2)} MB / ${quota.toFixed(2)} MB`);

    if (used > quota * 0.8) {
      console.warn('⚠️ Storage usage over 80%! Consider clearing old projects.');
    }
  } catch (error: any) {
    console.error('❌ Failed to save project:', error);
    alert('Failed to save project. Please export your work and contact support.');
    throw error;
  }
};

// ✅ IndexedDB version (async)
export const getCurrentProjectAsync = async (): Promise<Project | null> => {
  try {
    const project = await getCurrentProjectFromDB();
    return project;
  } catch (error) {
    console.error('Error loading current project from IndexedDB:', error);
    return null;
  }
};

// Legacy sync version (deprecated)
export const getCurrentProject = (): Project | null => {
  console.warn('⚠️ getCurrentProject() is deprecated - use getCurrentProjectAsync() instead');
  return null;
};

// ✅ IndexedDB version (async)
export const deleteProject = async (id: string): Promise<void> => {
  try {
    await deleteProjectFromDB(id);
    console.log('🗑️ Deleted project from IndexedDB:', id);
  } catch (error) {
    console.error('Failed to delete project from IndexedDB:', error);
    throw error;
  }
};

// Export project as JSON file
export const exportProject = (project: Project): void => {
  const dataStr = JSON.stringify(project, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  console.log('📥 Exported project:', project.name);
};

// Import project from JSON file
export const importProject = (jsonString: string): Project => {
  try {
    const project = JSON.parse(jsonString);
    // Generate new ID to avoid conflicts
    project.id = `proj_${Date.now()}`;
    project.lastModified = Date.now();
    saveProject(project);
    console.log('📤 Imported project:', project.name);
    return project;
  } catch (error) {
    console.error('Error importing project:', error);
    throw new Error('Invalid project file');
  }
};

// 🔄 Migrate existing localStorage data to IndexedDB (run once on app load)
export const migrateToIndexedDB = async (): Promise<void> => {
  try {
    // Check if migration already happened
    const migrated = localStorage.getItem('indexeddb_migrated');
    if (migrated) {
      console.log('✅ Already migrated to IndexedDB');
      return;
    }

    console.log('🔄 Starting localStorage → IndexedDB migration...');
    await migrateFromLocalStorage();
    localStorage.setItem('indexeddb_migrated', 'true');
    console.log('✅ Migration complete! You can now use IndexedDB storage.');

    // Clear localStorage projects to save space (keep migration flag)
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CURRENT_PROJECT_KEY);
    console.log('🧹 Cleared old localStorage data');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

export const createNewProject = (
  name: string,
  type: ProjectType = 'narrative',
  templateId?: keyof typeof PROJECT_TEMPLATES
): Project => {
  const isProduct = type === 'product';

  // For narrative mode: use template if specified, otherwise default to 'channelChangers'
  const activeTemplateId: keyof typeof PROJECT_TEMPLATES | undefined = isProduct
    ? undefined
    : templateId || 'channelChangers'; // Default to Channel Changers template

  const characters = isProduct
    ? PRODUCT_CATALOG
    : getTemplateCharacters(activeTemplateId!);

  return {
    id: `proj_${Date.now()}`,
    type,
    name,
    lastModified: Date.now(),
    templateId: activeTemplateId, // Store which template was used
    idea: '',
    script: '',
    productBrief: '',
    structure: null,

    // Initialize based on type
    characters,
    locations: [],
    models: isProduct ? DEFAULT_MODELS : [],
    gems: isProduct ? PRODUCT_GEMS : DEFAULT_GEMS,

    styleReferences: [],
    worldLook: isProduct ? DEFAULT_PRODUCT_LOOK : DEFAULT_WORLD_LOOK,
    promptGuidelines: DEFAULT_PROMPT_GUIDELINES,

    resolution: isProduct ? '4k' : '1080p', // Products default to higher res
    aspectRatio: isProduct ? '4:3' : '16:9',

    team: isProduct ? PRODUCT_TEAM : DEFAULT_TEAM
  };
};
