/**
 * DIRECTOR - Integration Service
 * 
 * Enables data flow between Script Engine and Director:
 * - Export from Script Engine → Import to Director
 * - Shared character/location libraries
 * - Project sync
 */

// ============================================
// EXPORT FORMAT VERSION
// ============================================

export const CC_EXPORT_VERSION = '1.0.0';

// ============================================
// SCRIPT ENGINE → DIRECTOR EXPORT
// ============================================

export interface CCScriptExport {
  version: string;
  type: 'cc-script-export';
  exportedAt: number;
  exportedFrom: 'script-engine';
  
  script: {
    title: string;
    rawContent: string;
    format: string;
    pageCount?: number;
  };
  
  characters: CCCharacter[];
  locations: CCLocation[];
  beats?: CCBeat[];
  visuals?: CCVisualAsset[];
  
  metadata: {
    phase: number;
    scenesWritten: number;
    tone?: string;
    logline?: string;
  };
}

export interface CCCharacter {
  name: string;
  handle: string;
  role?: string;
  archetype?: string;
  traits?: string[];
  dialogueDNA?: string;
  visuals?: string;
  referenceImages?: string[];
}

export interface CCLocation {
  name: string;
  handle: string;
  interior: boolean;
  timeOfDay?: string;
  visuals?: string;
  referenceImages?: string[];
}

export interface CCBeat {
  id: string;
  sceneNumber: number;
  action: string;
  characters: string[];
  dialogue?: string;
  location: string;
  camera?: string;
  lighting?: string;
  emotion?: string;
}

export interface CCVisualAsset {
  id: string;
  type: 'reference' | 'generated' | 'concept';
  data: string;
  label: string;
  linkedTo?: string;
}

// ============================================
// DIRECTOR → SCRIPT ENGINE EXPORT
// ============================================

export interface CCDirectorExport {
  version: string;
  type: 'cc-director-export';
  exportedAt: number;
  exportedFrom: 'director';
  
  project: {
    id: string;
    name: string;
    type: 'narrative' | 'product';
  };
  
  characters: CCCharacter[];
  locations: CCLocation[];
  styleReferences: CCVisualAsset[];
  
  structure?: {
    acts: Array<{
      actNumber: number;
      scenes: Array<{
        sceneNumber: number;
        summary: string;
        beats: CCBeat[];
      }>;
    }>;
  };
  
  generatedAssets?: Array<{
    beatId: string;
    images: string[];
    selectedIndex: number;
  }>;
}

// ============================================
// EXPORT FROM SCRIPT ENGINE
// ============================================

export const exportFromScriptEngine = (projectData: any): CCScriptExport => {
  const {
    title,
    logline,
    format,
    tone,
    characters,
    characterProfiles,
    locations,
    beats,
    scenesWritten,
    scriptContent,
    visuals,
  } = projectData;
  
  const ccCharacters: CCCharacter[] = (characterProfiles || []).map((cp: any) => ({
    name: cp.name,
    handle: `@${cp.name.replace(/\s/g, '')}`,
    archetype: cp.archetype,
    dialogueDNA: cp.dialogueDNA,
    traits: [],
    visuals: `Character: ${cp.name}`,
  }));
  
  (characters || []).forEach((name: string) => {
    if (!ccCharacters.find(c => c.name === name)) {
      ccCharacters.push({
        name,
        handle: `@${name.replace(/\s/g, '')}`,
        visuals: `Character: ${name}`,
        interior: false,
      } as any);
    }
  });
  
  const ccLocations: CCLocation[] = (locations || []).map((loc: string) => {
    const isInt = loc.toUpperCase().startsWith('INT');
    return {
      name: loc,
      handle: `@${loc.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '')}`,
      interior: isInt,
      visuals: `Location: ${loc}`,
    };
  });
  
  const ccBeats: CCBeat[] = (beats || []).map((beat: string, idx: number) => ({
    id: `beat_${Date.now()}_${idx}`,
    sceneNumber: Math.floor(idx / 3) + 1,
    action: beat,
    characters: [],
    location: 'UNKNOWN',
  }));
  
  const ccVisuals: CCVisualAsset[] = (visuals || []).map((v: any) => ({
    id: v.id,
    type: v.type === 'generated' ? 'generated' : 'reference',
    data: v.data,
    label: v.label,
  }));
  
  return {
    version: CC_EXPORT_VERSION,
    type: 'cc-script-export',
    exportedAt: Date.now(),
    exportedFrom: 'script-engine',
    script: {
      title: title || 'Untitled',
      rawContent: scriptContent || '',
      format: 'custom',
    },
    characters: ccCharacters,
    locations: ccLocations,
    beats: ccBeats,
    visuals: ccVisuals,
    metadata: {
      phase: 0,
      scenesWritten: scenesWritten || 0,
      tone,
      logline,
    },
  };
};

// ============================================
// IMPORT TO DIRECTOR
// ============================================

export const importToDirector = (ccExport: CCScriptExport): any => {
  const directorProject = {
    id: `proj_${Date.now()}`,
    type: 'narrative' as const,
    name: ccExport.script.title,
    lastModified: Date.now(),
    
    idea: ccExport.metadata.logline || '',
    script: ccExport.script.rawContent,
    
    structure: ccExport.beats && ccExport.beats.length > 0 ? {
      acts: [{
        act_number: 1,
        scenes: groupBeatsIntoScenes(ccExport.beats),
      }],
    } : null,
    
    characters: ccExport.characters.map(c => ({
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: c.name,
      handle: c.handle,
      role: c.role || 'Character',
      traits: c.traits || [],
      visuals: c.visuals || '',
      referenceImages: c.referenceImages || [],
    })),
    
    locations: ccExport.locations.map(l => ({
      id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: l.name,
      handle: l.handle,
      visuals: l.visuals || '',
      referenceImages: l.referenceImages || [],
    })),
    
    styleReferences: (ccExport.visuals || [])
      .filter(v => v.type === 'reference')
      .map(v => ({
        id: v.id,
        imageUrl: `data:image/png;base64,${v.data}`,
        name: v.label,
      })),
    
    models: [],
    gems: getDefaultGems(),
    worldLook: ccExport.metadata.tone || '',
    promptGuidelines: '',
    resolution: '1080p' as const,
    aspectRatio: '16:9' as const,
    team: [{ id: 'u1', name: 'Director', role: 'Director', avatarColor: 'bg-blue-500' }],
  };
  
  return directorProject;
};

// ============================================
// HELPER: Group beats into scenes
// ============================================

const groupBeatsIntoScenes = (beats: CCBeat[]): any[] => {
  const sceneMap = new Map<number, CCBeat[]>();
  
  beats.forEach(beat => {
    const sceneNum = beat.sceneNumber || 1;
    if (!sceneMap.has(sceneNum)) {
      sceneMap.set(sceneNum, []);
    }
    sceneMap.get(sceneNum)!.push(beat);
  });
  
  return Array.from(sceneMap.entries()).map(([sceneNum, sceneBeats]) => ({
    scene_number: sceneNum,
    summary: sceneBeats[0]?.location || `Scene ${sceneNum}`,
    beats: sceneBeats.map(b => ({
      beat_id: b.id,
      characters: b.characters,
      emotion: b.emotion || 'Neutral',
      action: b.action,
      camera: b.camera || 'Standard',
      lighting: b.lighting || 'Natural',
      location: b.location,
      visual_notes: '',
      prompt_seed: b.action,
      dialogue: b.dialogue,
      generatedImages: [],
      selectedImageIndex: -1,
      status: 'Draft',
      comments: [],
      promptHistory: [],
    })),
  }));
};

// ============================================
// HELPER: Default gems
// ============================================

const getDefaultGems = () => [
  {
    id: 'gem_scriptwriter',
    type: 'scriptwriter',
    name: 'Scriptwriter',
    description: 'Writes compelling scripts',
    systemInstruction: 'You are a professional screenwriter...',
    icon: 'Pen',
  },
  {
    id: 'gem_director',
    type: 'director',
    name: 'Director',
    description: 'Breaks down scripts into visual beats',
    systemInstruction: 'You are a film director...',
    icon: 'Clapperboard',
  },
  {
    id: 'gem_cinematographer',
    type: 'cinematographer',
    name: 'Cinematographer',
    description: 'Creates visual prompts',
    systemInstruction: 'You are a cinematographer...',
    icon: 'Camera',
  },
];

// ============================================
// FILE DOWNLOAD/UPLOAD HELPERS
// ============================================

export const downloadCCExport = (data: CCScriptExport | CCDirectorExport) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.type === 'cc-script-export' 
    ? (data as CCScriptExport).script.title 
    : (data as CCDirectorExport).project.name}_export.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const loadCCExport = async (file: File): Promise<CCScriptExport | CCDirectorExport> => {
  const text = await file.text();
  const data = JSON.parse(text);
  
  if (!data.type || !data.version) {
    throw new Error('Invalid CC export file');
  }
  
  if (data.type !== 'cc-script-export' && data.type !== 'cc-director-export') {
    throw new Error(`Unknown export type: ${data.type}`);
  }
  
  return data;
};

// ============================================
// VALIDATION
// ============================================

export const validateCCExport = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.version) errors.push('Missing version');
  if (!data.type) errors.push('Missing type');
  if (!data.exportedAt) errors.push('Missing exportedAt');
  
  if (data.type === 'cc-script-export') {
    if (!data.script?.rawContent) errors.push('Missing script content');
    if (!data.characters) errors.push('Missing characters array');
    if (!data.locations) errors.push('Missing locations array');
  }
  
  if (data.type === 'cc-director-export') {
    if (!data.project?.name) errors.push('Missing project name');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
