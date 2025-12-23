
export interface Beat {
  beat_id: string;
  characters: string[]; // In Product Mode: Products involved
  emotion: string;      // In Product Mode: Mood/Vibe
  action: string;       // In Product Mode: Shot Description/Composition
  camera: string;
  lighting: string;
  location: string;     // In Product Mode: Environment
  visual_notes: string;
  prompt_seed: string;
  dialogue?: string; 
  // Image History
  generatedImages: string[]; 
  selectedImageIndex: number;
  isGeneratingImage?: boolean;
  directorNote?: string; 
  // Coverage / Variations
  variations?: Shot[];
  // Feedback
  feedback?: {
    liked: boolean;
    note?: string;
  };
  // Advanced AI Features
  qcFeedback?: string;
  continuityError?: string; 
  smartSuggestions?: string[];
  
  // Collaboration & Workflow
  status: BeatStatus;
  comments: Comment[];
  promptHistory: PromptVersion[];
  
  // Product Mode Specifics
  shotType?: string; // Hero, Detail, Lifestyle
  overlays?: Overlay[];

  // 🎬 NARRATIVE TIMING (NEW)
  duration?: number; // Duration in seconds (for Veo3's 8-second limit)

  // 🎬 SEQUENTIAL CONTEXT (NEW)
  previousShotContext?: string; // Analysis from previous shot for continuity
}

export interface Overlay {
  id: string;
  assetId: string; // Link to BrandAsset
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export type BeatStatus = 'Draft' | 'In Review' | 'Changes Requested' | 'Approved';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface PromptVersion {
  timestamp: number;
  prompt: string;
  author: string;
}

export interface User {
  id: string;
  name: string;
  role: 'Director' | 'Producer' | 'Editor' | 'Viewer' | 'Photographer' | 'Stylist';
  avatarColor: string;
}

export interface Shot {
  type: 'Wide' | 'Medium' | 'Close-Up' | 'OTS' | 'Insert';
  lens: string;
  movement: 'Static' | 'Pan' | 'Tilt' | 'Dolly' | 'Handheld' | 'Crane';
  prompt: string;
  image?: string;
  isGenerating?: boolean;
}

export interface Scene {
  scene_number: number;
  summary: string; // In Product Mode: Shoot Name (e.g. "On-Course Lifestyle")
  beats: Beat[];
}

export interface Act {
  act_number: number;
  scenes: Scene[]; // In Product Mode: Scenes = Shoots
}

export interface EpisodeStructure {
  acts: Act[]; // In Product Mode: Acts = Collections
}

export interface Character {
  id: string;
  name: string;
  handle: string;
  role: string;
  traits: string[];
  visuals: string;
  referenceImage?: string;
  referenceImages?: string[];

  // 🎬 MASTER CHARACTER FEATURES (NEW)
  locked?: boolean; // Locked master characters (like Sam)
  profile?: MasterCharacterProfile; // Detailed character specs
}

// Product extends Character for code reuse, but adds specific SKU fields
export interface Product extends Character {
  sku?: string;
  category?: string;
  features?: string[];
  colourways?: string[];
  techSpecs?: string; // Material properties, fabric weight, specific details
}

export interface Model {
  id: string;
  name: string;
  handle: string; // @handle for reference (e.g., @model_sam)
  sku?: string; // Badge like "MODEL-SAM"
  visuals: string; // Physical description
  type: 'ai_generated' | 'real_person';
  referenceImages: string[];

  // 🎬 MASTER CHARACTER FEATURES (NEW)
  locked?: boolean; // Locked master characters
  profile?: MasterCharacterProfile; // Detailed character specs
}

// 🎬 MASTER CHARACTER PROFILE (Detailed character specs for narrative mode)
export interface MasterCharacterProfile {
  physicalDescription: string;
  outfit: {
    jacket?: string;
    shorts?: string;
    shoes?: string;
    tshirt?: string;
    accessories?: string[];
  };
  expressions: string[]; // e.g., ["happy", "determined", "worried"]
  poses: string[];       // e.g., ["standing", "running", "sitting"]
  backdrop?: string;     // Default backdrop for this character
  style: string;         // Overall visual style
}

// 🎬 SERIES MEMORY (Track episode summaries, character arcs, world state)
export interface SeriesMemory {
  episodeSummaries: {
    episodeNumber: number;
    title: string;
    summary: string;
    keyEvents: string[];
  }[];
  characterDevelopment: {
    characterId: string;
    arc: string;
    majorMoments: string[];
  }[];
  worldState: {
    timestamp: number;
    changes: string[];
  }[];
}

// 🎬 CONCEPT LAB (Manual concept creation - save successful prompts and reuse)
export interface Concept {
  id: string;
  name: string;
  prompt: string;
  selectedAssets: {
    characters?: string[]; // Character IDs
    products?: string[]; // Product IDs
    locations?: string[]; // Location IDs
  };
  generatedImage?: string;
  timestamp: number;
  notes?: string;
}

export interface Location {
  id: string;
  name: string;
  handle?: string; // @handle for reference (e.g., @studio_white)
  visuals: string;
  referenceImage?: string;
  referenceImages?: string[];
  shotBank?: {
    wide?: string;
    medium?: string;
    closeup?: string;
    isGenerating?: boolean;
  };
}

export interface BrandAsset {
  id: string;
  name: string;
  type: 'logo' | 'font' | 'graphic';
  url: string;
}

export interface StyleAnalysis {
  lighting: string;
  composition: string;
  camera: string;
  background: string;
  colorGrading: string;
  mood: string;
  technicalDetails: string;
  replicationPrompt: string;
}

export interface BatchStyleAnalysis {
  commonStyle: string;
  lighting: string;
  colors: string;
  materials: string;
  composition: string;
  summary: string;
}

export interface StyleReference {
  id: string;
  imageUrl: string; // base64
  name: string;
  analysis?: StyleAnalysis;
  isDefault?: boolean;
  isAnalyzing?: boolean;
}

export interface DirectorLog {
  likedBeats: { prompt: string; notes: string }[];
  dislikedBeats: { prompt: string; notes: string }[];
}

export type GemType = 'scriptwriter' | 'world_builder' | 'director' | 'cinematographer' | 'quality_control' | 'creative_director' | 'photographer' | 'stylist';

export interface Gem {
  id: string;
  type: GemType;
  name: string;
  description: string;
  systemInstruction: string;
  icon: 'Pen' | 'Map' | 'Clapperboard' | 'Camera' | 'CheckCircle' | 'Zap' | 'ShoppingBag';
}

export enum GenerationStep {
  IDLE,
  GENERATING_SCRIPT, // Or Generating Brief
  SCRIPT_APPROVAL, // 🎬 Manual review checkpoint before world analysis
  ANALYZING_WORLD,
  REVIEW_WORLD,
  DIRECTOR_ANALYSIS, // Or Shot Planning
  PARSING_STRUCTURE,
  COMPLETE,
  ERROR
}

export type Resolution = '1080p' | '2k' | '4k';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '2.39:1';

export type LibraryCategory = 'characters' | 'locations' | 'gems' | 'styles';

export type ProjectType = 'narrative' | 'product';

export interface TemplateShotSpec {
  order: number;
  shotType: string; // 'Hero', 'Detail', 'Lifestyle', '360'
  name: string;
  camera: string;
  lighting: string;
  environment: string;
  promptSeed: string;
}

export interface ShotTemplate {
  id: string;
  name: string;
  category: string; // 'golf_apparel', 'footwear', 'accessories'
  description: string;
  shots: TemplateShotSpec[];
}

export interface Project {
  id: string;
  type: ProjectType;
  name: string;
  lastModified: number;

  // Narrative Fields
  idea: string; // Logline
  script: string;
  templateId?: 'channelChangers' | 'blank'; // 🎬 Track which narrative template was used

  // Product Fields
  productBrief?: string;
  brandAssets?: BrandAsset[];
  activeTemplate?: ShotTemplate;

  // Shared Data
  structure: EpisodeStructure | null;
  characters: Product[]; // Can hold Characters or Products
  locations: Location[]; // Can hold Locations or Environments
  models: Model[]; // Human models for Product Mode
  gems: Gem[];
  styleReferences: StyleReference[]; // UPDATED to Object Array
  styleAnalysis?: BatchStyleAnalysis; // AI-analyzed style guide from batch reference analysis
  worldLook: string;
  promptGuidelines: string;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  team: User[];

  // 🎬 NARRATIVE TIMING (NEW)
  totalRuntime?: number; // Total runtime in seconds (auto-calculated)

  // 🎬 SERIES MEMORY (NEW)
  seriesMemory?: SeriesMemory; // Track episode summaries, character arcs, world state

  // 🎬 CONCEPT LAB (NEW)
  concepts?: Concept[]; // Saved concept prompts for reuse

  // 🧠 META-ORCHESTRATOR (NEW)
  orchestratorContext?: OrchestratorProjectContext; // Workflow intelligence and conversation history
}

// 🧠 META-ORCHESTRATOR CONTEXT
export interface OrchestratorProjectContext {
  insights?: {
    scale: 'micro' | 'short' | 'medium' | 'feature';
    budget: 'experimental' | 'standard' | 'premium';
    style: 'rough_cut' | 'polished' | 'cinematic';
    urgency: 'exploratory' | 'normal' | 'deadline';
    purpose: string;
    constraints: string[];
    priorities: string[];
  };
  workflowPlan?: {
    phases: Array<{
      name: string;
      agents: Array<{
        type: GemType;
        depth: 'quick_pass' | 'standard' | 'deep_dive';
        reason: string;
        optional: boolean;
      }>;
      checkpoints: string[];
    }>;
    estimatedComplexity: string;
    recommendations: string[];
  };
  conversationHistory?: Array<{
    role: 'producer' | 'user';
    content: string;
    timestamp: number;
  }>;
  executionState?: {
    currentPhaseIndex: number;
    completedAgents: GemType[];
    lastCheckpoint: string;
  };
}
