
import { Project } from '../types';

// GOOGLE DRIVE INTEGRATION SERVICE
// ================================
// SETUP INSTRUCTIONS:
// 1. Go to console.cloud.google.com
// 2. Create Project > Enable "Google Drive API"
// 3. Credentials > Create OAuth 2.0 Client ID (Web App)
// 4. Add authorized origins (http://localhost:3000)
// 5. Add Scope: https://www.googleapis.com/auth/drive.file

const CLIENT_ID = 'YOUR_REAL_CLIENT_ID_HERE'; 
const API_KEY = 'YOUR_REAL_API_KEY_HERE';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// FEATURE FLAG: Set to true to attempt real API calls, false for robust simulation
const USE_REAL_API = false; 

export const initGoogleDrive = async (): Promise<boolean> => {
  if (!USE_REAL_API) {
     console.log("[Drive] Mock Init");
     return true;
  }
  // Real GAPI loading logic would go here
  return true;
};

export const authenticateGoogle = async (): Promise<boolean> => {
  if (!USE_REAL_API) {
    console.log("[Drive] Simulating OAuth Flow...");
    await new Promise(r => setTimeout(r, 1500)); // Fake popup delay
    localStorage.setItem('nano_gdrive_token', 'mock_token_' + Date.now());
    return true;
  }
  // Real Auth logic
  return false;
};

export const disconnectGoogle = () => {
  localStorage.removeItem('nano_gdrive_token');
  console.log("[Drive] Disconnected");
};

export const isConnected = (): boolean => {
  return !!localStorage.getItem('nano_gdrive_token');
};

// --- FOLDER MANAGEMENT ---

const findOrCreateFolder = async (folderName: string, parentId?: string): Promise<string> => {
   console.log(`[Drive] Ensuring folder exists: ${folderName} (Parent: ${parentId || 'root'})`);
   if (!USE_REAL_API) {
      await new Promise(r => setTimeout(r, 300)); 
      return `mock_folder_id_${folderName}`;
   }
   return "real_folder_id";
};

// --- FILE OPERATIONS ---

export const uploadFileToDrive = async (blob: Blob, filename: string, projectName: string): Promise<string> => {
  if (!isConnected()) throw new Error("Not connected to Drive");

  console.log(`[Drive] Starting Upload: ${filename}`);

  // 1. Ensure Root Folder
  const rootId = await findOrCreateFolder("Channel Changers Projects");
  
  // 2. Ensure Project Folder
  const projectId = await findOrCreateFolder(projectName, rootId);

  // 3. Ensure Exports Folder
  const exportId = await findOrCreateFolder("Exports", projectId);

  if (!USE_REAL_API) {
     // Simulate upload progress
     const size = blob.size;
     console.log(`[Drive] Uploading ${size} bytes to folder ${exportId}...`);
     await new Promise(r => setTimeout(r, 2000));
     return "https://drive.google.com/file/d/mock_file_id/view";
  }

  return "real_file_link";
};

export const saveProjectToDrive = async (project: Project): Promise<string> => {
   if (!isConnected()) throw new Error("Not connected");
   
   const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
   const rootId = await findOrCreateFolder("Channel Changers Projects");
   const projectId = await findOrCreateFolder(project.name, rootId);
   
   console.log(`[Drive] Syncing Project JSON for ${project.name}...`);
   if (!USE_REAL_API) {
      await new Promise(r => setTimeout(r, 800));
      return "synced_ok";
   }
   return "synced_ok";
};

export const pickFileFromDrive = async (): Promise<string | null> => {
  if (!isConnected()) throw new Error("Not connected");
  console.log("[Drive] Opening File Picker...");
  
  if (!USE_REAL_API) {
     await new Promise(r => setTimeout(r, 1000));
     // Return a random placeholder for testing
     const placeholders = [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?q=80&w=2070&auto=format&fit=crop",
        "https://upload.wikimedia.org/wikipedia/commons/a/a6/Log_Under_Armour.svg"
     ];
     return placeholders[Math.floor(Math.random() * placeholders.length)];
  }
  return null;
};
