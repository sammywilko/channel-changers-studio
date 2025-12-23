/**
 * IndexedDB Service - Large storage for projects with images
 *
 * IndexedDB provides 50MB-250MB+ storage (vs localStorage's 5-10MB)
 * Perfect for storing projects with base64 images
 */

import { Project } from '../types';

const DB_NAME = 'ChannelChangersStudio';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const CURRENT_PROJECT_STORE = 'currentProject';

// Open/create database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create projects store
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectsStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        projectsStore.createIndex('lastModified', 'lastModified', { unique: false });
        projectsStore.createIndex('name', 'name', { unique: false });
        console.log('✅ Created projects store');
      }

      // Create current project store (single item)
      if (!db.objectStoreNames.contains(CURRENT_PROJECT_STORE)) {
        db.createObjectStore(CURRENT_PROJECT_STORE);
        console.log('✅ Created current project store');
      }
    };
  });
};

// Save project to IndexedDB
export const saveProjectToDB = async (project: Project): Promise<void> => {
  try {
    const db = await openDB();

    // Update timestamp
    const updatedProject = { ...project, lastModified: Date.now() };

    // Save to projects store
    const projectsTransaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const projectsStore = projectsTransaction.objectStore(PROJECTS_STORE);
    await new Promise<void>((resolve, reject) => {
      const request = projectsStore.put(updatedProject);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Save as current project
    const currentTransaction = db.transaction([CURRENT_PROJECT_STORE], 'readwrite');
    const currentStore = currentTransaction.objectStore(CURRENT_PROJECT_STORE);
    await new Promise<void>((resolve, reject) => {
      const request = currentStore.put(updatedProject, 'current');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    console.log('💾 Saved project to IndexedDB:', project.name);

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('projectSaved', { detail: updatedProject }));
  } catch (error) {
    console.error('❌ Failed to save to IndexedDB:', error);
    throw error;
  }
};

// Get all projects from IndexedDB
export const getProjectsFromDB = async (): Promise<Project[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);

    const projects = await new Promise<Project[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    console.log('📂 Loaded projects from IndexedDB:', projects.length);
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('❌ Failed to load from IndexedDB:', error);
    return [];
  }
};

// Get current project from IndexedDB
export const getCurrentProjectFromDB = async (): Promise<Project | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([CURRENT_PROJECT_STORE], 'readonly');
    const store = transaction.objectStore(CURRENT_PROJECT_STORE);

    const project = await new Promise<Project | null>((resolve, reject) => {
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    db.close();
    if (project) {
      console.log('📂 Loaded current project from IndexedDB:', project.name);
    }
    return project;
  } catch (error) {
    console.error('❌ Failed to load current project from IndexedDB:', error);
    return null;
  }
};

// Delete project from IndexedDB
export const deleteProjectFromDB = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    console.log('🗑️ Deleted project from IndexedDB:', id);
  } catch (error) {
    console.error('❌ Failed to delete from IndexedDB:', error);
    throw error;
  }
};

// Get storage usage estimate
export const getStorageEstimate = async (): Promise<{ used: number; quota: number }> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usedMB = (estimate.usage || 0) / (1024 * 1024);
    const quotaMB = (estimate.quota || 0) / (1024 * 1024);
    console.log(`💾 Storage: ${usedMB.toFixed(2)} MB / ${quotaMB.toFixed(2)} MB`);
    return { used: usedMB, quota: quotaMB };
  }
  return { used: 0, quota: 0 };
};

// Migrate from localStorage to IndexedDB
export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    console.log('🔄 Starting migration from localStorage to IndexedDB...');

    // Get data from localStorage
    const projectsData = localStorage.getItem('nano_flash_projects');
    const currentProjectData = localStorage.getItem('channelchangers_current_project');

    if (projectsData) {
      const projects: Project[] = JSON.parse(projectsData);
      console.log('📦 Found', projects.length, 'projects in localStorage');

      // Save each project to IndexedDB
      for (const project of projects) {
        await saveProjectToDB(project);
      }
      console.log('✅ Migrated', projects.length, 'projects to IndexedDB');
    }

    if (currentProjectData) {
      const currentProject: Project = JSON.parse(currentProjectData);
      await saveProjectToDB(currentProject);
      console.log('✅ Migrated current project to IndexedDB');
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Clear all IndexedDB data
export const clearAllDB = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      console.log('🗑️ Cleared all IndexedDB data');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};
