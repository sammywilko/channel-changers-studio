
import React, { useState, useEffect, useCallback } from 'react';
import { generateScript, parseScriptToStructure, generateImage, generateDirectorBreakdown, editGeneratedImage, refinePrompt, extractWorldData, generateShotVariations, generateLocationSet, generateShotListCSV, generatePromptSuggestions, checkVisualContinuity, generateProductShotList, analyzeStyleReference, enhanceBrief, analyzeBatchStyleReferences } from '../services/geminiService';
import { EpisodeStructure, GenerationStep, Character, Resolution, Location, DirectorLog, Gem, Beat, AspectRatio, Project, PromptVersion, BeatStatus, BrandAsset, ShotTemplate, Product, StyleReference } from '../types';
import { getProjects, saveProject, createNewProject, deleteProject, getCurrentProject, exportProject, importProject } from '../services/projectService';
import { applyTemplateToProducts } from '../services/templateService';
import { selectReferencesForShot } from '../services/referenceSelector';
import { uploadFileToDrive, isConnected, saveProjectToDrive } from '../services/googleDriveService';
import { executeWorkflowPlan, WorkflowStepResult } from '../services/workflowEngine';
import { WorkflowPlan, ProjectInsights } from '../services/orchestratorService';
import WorldBiblePanel from '../components/WorldBiblePanel';
import BeatCard from '../components/BeatCard';
import ProductShotCard from '../components/ProductShotCard';
import StoryCanvas from '../components/StoryCanvas';
import ImageEditor from '../components/ImageEditor';
import Dashboard from '../components/Dashboard';
import BriefComposer from '../components/BriefComposer';
import ProducerChat from '../components/ProducerChat';
import { Layers, FileText, Loader2, Cpu, ArrowRight, LayoutDashboard, X, Download, Settings2, Table, RefreshCw, Wand2, AlertTriangle, GripVertical, Archive, Cloud, CheckCircle, Save, AlertCircle, Upload, Check, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const APP_VERSION = "10.0.0";

const App: React.FC = () => {
  // Project System State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Save Status State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'script' | 'board' | 'canvas'>('board');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [step, setStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
  
  // Cloud Sync State (Feature Flags)
  const [isDriveEnabled, setIsDriveEnabled] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  
  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  
  // Director Log (Feedback Memory)
  const [directorLog, setDirectorLog] = useState<DirectorLog>({ likedBeats: [], dislikedBeats: [] });

  // 🧠 META-ORCHESTRATOR State
  const [isProducerChatOpen, setIsProducerChatOpen] = useState(false);
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string>('');
  
  // Export Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);

  // --- INIT ---
  useEffect(() => {
    console.log(`🎬 Channel Changers Studio v${APP_VERSION} - Loaded`);
    setProjects(getProjects());
    // Load current project
    const currentProj = getCurrentProject();
    if (currentProj) {
      setCurrentProject(currentProj);
      console.log('📂 Restored project:', currentProj.name);
    }
    // Load feature preference
    const savedDriveEnabled = localStorage.getItem('cc_drive_enabled') === 'true';
    setIsDriveEnabled(savedDriveEnabled);
    if (savedDriveEnabled) setIsDriveConnected(isConnected());
  }, []);

  // --- AUTO SAVE & CLOUD SYNC ---
  useEffect(() => {
    if (!currentProject) return;

    setSaveStatus('unsaved');

    const timeout = setTimeout(() => {
       try {
          setSaveStatus('saving');
          saveProject(currentProject);
          setProjects(getProjects());
          setLastSaveTime(Date.now());
          setSaveStatus('saved');

          // Optional Cloud Sync
          if (isDriveEnabled && isDriveConnected) {
              saveProjectToDrive(currentProject).catch(e => console.warn("Background Cloud Sync Failed:", e));
          }
       } catch (error) {
          console.error('Auto-save failed:', error);
          setSaveStatus('error');
       }
    }, 3000); // 3 seconds debounce

    return () => clearTimeout(timeout);
  }, [currentProject, isDriveEnabled, isDriveConnected]);

  // --- RESIZING LOGIC ---
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth > 250 && newWidth < 800) { // Min 250px, Max 800px
           setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- SAVE HANDLERS ---
  // Manual save function
  const handleManualSave = () => {
    if (!currentProject) return;

    try {
      setSaveStatus('saving');
      saveProject(currentProject);
      setProjects(getProjects());
      setLastSaveTime(Date.now());
      setSaveStatus('saved');
    } catch (error) {
      console.error('Manual save failed:', error);
      setSaveStatus('error');
      alert('Failed to save project. Please try again.');
    }
  };

  // Helper function for "Last saved: 2 minutes ago"
  const formatTimeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Warn user if they try to close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // --- PROJECT HANDLERS ---
  const handleCreateProject = (name: string, type: any, templateId?: 'channelChangers' | 'blank') => {
    const newProj = createNewProject(name, type, templateId);
    saveProject(newProj);
    setProjects(getProjects());
    setCurrentProject(newProj);
  };

  const handleLoadProject = (project: Project) => {
    setCurrentProject(project);
    setStep(project.structure ? GenerationStep.COMPLETE : GenerationStep.IDLE);
    setActiveTab('board');
    
    // Refresh cloud feature flags on project load
    const savedDriveEnabled = localStorage.getItem('cc_drive_enabled') === 'true';
    setIsDriveEnabled(savedDriveEnabled);
    setIsDriveConnected(isConnected());
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    setProjects(getProjects());
    if (currentProject?.id === id) setCurrentProject(null);
  };

  const handleExitProject = () => {
    if(currentProject) saveProject(currentProject);
    setCurrentProject(null);
  };
  
  const updateProject = (updates: Partial<Project>) => {
     setCurrentProject(prev => prev ? { ...prev, ...updates } : null);
  };

  // --- MULTIPLE IMAGE UPLOAD HANDLER ---
  const handleMultipleImageUpload = (
    files: FileList | null,
    entityId: string,
    entityType: 'model' | 'product' | 'location'
  ) => {
    if (!files || !currentProject) return;

    const fileArray = Array.from(files);
    const newImages: string[] = [];
    let processedCount = 0;

    console.log(`📤 Uploading ${fileArray.length} images for ${entityType}:${entityId}`);

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          processedCount++;

          if (processedCount === fileArray.length) {
            console.log(`✅ All ${fileArray.length} images loaded, updating state...`);

            if (entityType === 'model') {
              const updatedModels = currentProject.models?.map(m =>
                m.id === entityId
                  ? { ...m, referenceImages: [...(m.referenceImages || []), ...newImages] }
                  : m
              );
              setCurrentProject({ ...currentProject, models: updatedModels });
            } else if (entityType === 'product') {
              const updatedProducts = currentProject.characters.map(p =>
                p.id === entityId
                  ? { ...p, referenceImages: [...(p.referenceImages || []), ...newImages] }
                  : p
              );
              setCurrentProject({ ...currentProject, characters: updatedProducts });
            } else if (entityType === 'location') {
              const updatedLocations = currentProject.locations.map(l =>
                l.id === entityId
                  ? { ...l, referenceImages: [...(l.referenceImages || []), ...newImages] }
                  : l
              );
              setCurrentProject({ ...currentProject, locations: updatedLocations });
            }
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // --- GENERATION LOGIC ---
  const handleInitializeGeneration = async () => {
     if (!currentProject) return;

     if (currentProject.type === 'product') {
        if (!currentProject.idea.trim()) return;
        setStep(GenerationStep.GENERATING_SCRIPT);
        
        try {
           const cdGem = currentProject.gems.find(g => g.type === 'creative_director')!;
           const shotList = await generateProductShotList(currentProject.idea, cdGem.systemInstruction);
           updateProject({ structure: shotList });
           
           setStep(GenerationStep.ANALYZING_WORLD);
           const stylistGem = currentProject.gems.find(g => g.type === 'stylist')!;
           const worldData = await extractWorldData(currentProject.idea, stylistGem.systemInstruction);
           
           updateProject({
              locations: [...currentProject.locations, ...worldData.locations],
              characters: [...currentProject.characters, ...worldData.newCharacters]
           });

           setStep(GenerationStep.COMPLETE);
           setActiveTab('board');

        } catch (e) {
           console.error(e);
           setStep(GenerationStep.ERROR);
        }

     } else {
        if (!currentProject.idea.trim()) return;
        setStep(GenerationStep.GENERATING_SCRIPT);
        try {
          const scriptGem = currentProject.gems.find(g => g.type === 'scriptwriter')!;
          const generatedScript = await generateScript(currentProject.idea, scriptGem.systemInstruction);
          updateProject({ script: generatedScript });

          // 🎬 PAUSE for manual script review
          setStep(GenerationStep.SCRIPT_APPROVAL);
          return; // Don't continue automatically
        } catch (error) {
          setStep(GenerationStep.ERROR);
        }
     }
  };

  // 🎬 Script Approval Handlers
  const handleScriptEdit = (newScript: string) => {
    if (!currentProject) return;
    updateProject({ script: newScript });
  };

  const handleApproveScript = async () => {
    if (!currentProject?.script) return;

    try {
      setStep(GenerationStep.ANALYZING_WORLD);
      const worldGem = currentProject.gems.find(g => g.type === 'world_builder')!;
      const worldData = await extractWorldData(currentProject.script, worldGem.systemInstruction);
      updateProject({
        locations: [...currentProject.locations, ...worldData.locations],
        characters: [...currentProject.characters, ...worldData.newCharacters]
      });

      setStep(GenerationStep.DIRECTOR_ANALYSIS);
      const directorGem = currentProject.gems.find(g => g.type === 'director')!;
      const directorNotes = await generateDirectorBreakdown(currentProject.script, directorGem.systemInstruction);

      setStep(GenerationStep.PARSING_STRUCTURE);
      const parsedStructure = await parseScriptToStructure(currentProject.script, directorNotes);
      updateProject({ structure: parsedStructure });

      setStep(GenerationStep.COMPLETE);
      setActiveTab('board');
    } catch (error) {
      console.error('Error continuing from script approval:', error);
      setStep(GenerationStep.ERROR);
    }
  };

  const handleRegenerateScript = async () => {
    if (!currentProject?.idea) return;

    setStep(GenerationStep.GENERATING_SCRIPT);
    try {
      const scriptGem = currentProject.gems.find(g => g.type === 'scriptwriter')!;
      const generatedScript = await generateScript(currentProject.idea, scriptGem.systemInstruction);
      updateProject({ script: generatedScript });
      setStep(GenerationStep.SCRIPT_APPROVAL);
    } catch (error) {
      console.error('Error regenerating script:', error);
      setStep(GenerationStep.ERROR);
    }
  };

  // 🧠 META-ORCHESTRATOR Workflow Handler
  const handleWorkflowPlanGenerated = async (plan: WorkflowPlan, insights: ProjectInsights) => {
    if (!currentProject) return;

    console.log('🧠 Executing workflow plan:', plan);

    // Save orchestrator context to project
    updateProject({
      orchestratorContext: {
        insights,
        workflowPlan: plan,
        conversationHistory: [], // Will be populated by ProducerChat
        executionState: {
          currentPhaseIndex: 0,
          completedAgents: [],
          lastCheckpoint: 'Started'
        }
      }
    });

    setIsExecutingWorkflow(true);
    setIsProducerChatOpen(false); // Minimize chat during execution

    try {
      // Execute the workflow plan
      const result = await executeWorkflowPlan(
        plan,
        insights,
        currentProject,
        // Step completion callback
        (stepResult: WorkflowStepResult) => {
          setWorkflowStatus(`${stepResult.agent}: ${stepResult.message || 'Processing...'}`);
          console.log('📍 Step complete:', stepResult);
        },
        // Phase completion callback
        (phaseIndex: number) => {
          const phaseName = plan.phases[phaseIndex]?.name || `Phase ${phaseIndex + 1}`;
          setWorkflowStatus(`✅ Completed: ${phaseName}`);
        },
        // Checkpoint callback (return true to continue, false to pause)
        async (checkpoint: string) => {
          // For now, auto-approve checkpoints
          // In future, could show modal for user approval
          console.log('🚧 Checkpoint:', checkpoint);
          setWorkflowStatus(`Checkpoint: ${checkpoint}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
          return true; // Continue
        }
      );

      if (result.success) {
        // Update project with final results
        updateProject(result.finalProject);
        setStep(GenerationStep.COMPLETE);
        setActiveTab('board');
        setWorkflowStatus('✅ Workflow complete!');
      } else {
        setWorkflowStatus(`❌ Workflow stopped: ${result.error}`);
        setStep(GenerationStep.ERROR);
      }

    } catch (error) {
      console.error('Workflow execution error:', error);
      setWorkflowStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStep(GenerationStep.ERROR);
    } finally {
      setIsExecutingWorkflow(false);
      setTimeout(() => setWorkflowStatus(''), 3000); // Clear status after 3s
    }
  };

  const handleReparseScript = async () => {
      if(!currentProject?.script) return;
      setStep(GenerationStep.DIRECTOR_ANALYSIS);
      const directorGem = currentProject.gems.find(g => g.type === 'director')!;
      const directorNotes = await generateDirectorBreakdown(currentProject.script, directorGem.systemInstruction);

      setStep(GenerationStep.PARSING_STRUCTURE);
      const parsedStructure = await parseScriptToStructure(currentProject.script, directorNotes);
      updateProject({ structure: parsedStructure });
      setStep(GenerationStep.COMPLETE);
      setActiveTab('board');
  };

  const handleGenerateImage = async (beatId: string, prompt: string) => {
    if (!currentProject || !currentProject.structure) return;

    let beatSummary = "";
    let activeCharacters: string[] = [];
    let locationName = "";
    let currentBeat: Beat | null = null;
    
    currentProject.structure.acts.forEach(act => act.scenes.forEach(scene => scene.beats.forEach(b => {
        if (b.beat_id === beatId) {
          beatSummary = b.action;
          activeCharacters = b.characters;
          locationName = b.location;
          currentBeat = b;
        }
    })));

    if (!currentBeat) return;

    const locationContext = currentProject.locations.find(l => locationName.toLowerCase().includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(locationName.toLowerCase()));

    const tempStructure = { ...currentProject.structure };
    updateBeatInStructure(tempStructure, beatId, { isGeneratingImage: true });
    updateProject({ structure: tempStructure });

    try {
      const cineGem = currentProject.gems.find(g => g.type === 'cinematographer' || g.type === 'photographer')!;
      const refinedPrompt = await refinePrompt(
          prompt, 
          beatSummary, 
          currentProject.worldLook, 
          currentProject.characters, 
          activeCharacters, 
          locationContext, 
          currentProject.promptGuidelines, 
          directorLog, 
          currentProject.models || [], 
          cineGem.systemInstruction
      );

      // --- SMART REF UPDATE: Using StyleReference Objects ---
      const referenceImages: (string | StyleReference)[] = [...currentProject.styleReferences]; 
      
      const primaryProduct = currentProject.characters.find(c => activeCharacters.includes(c.name));

      if (currentProject.type === 'product' && primaryProduct) {
         const smartRefs = selectReferencesForShot(currentBeat, primaryProduct as Product, currentProject.brandAssets || []);
         referenceImages.push(...smartRefs);
      } else {
         activeCharacters.forEach(charHandle => {
           const character = currentProject.characters.find(c => c.handle === charHandle || c.name === charHandle);
           if (character) {
              if (character.referenceImages) referenceImages.push(...character.referenceImages);
              else if (character.referenceImage) referenceImages.push(character.referenceImage);
           }
         });
      }
      
      if (locationContext && referenceImages.length < 8) {
         if (locationContext.shotBank) {
             const cam = prompt.toLowerCase();
             if (cam.includes('wide') || cam.includes('establishing')) {
                if(locationContext.shotBank.wide) referenceImages.push(locationContext.shotBank.wide);
             } else if (cam.includes('close') || cam.includes('face')) {
                if(locationContext.shotBank.closeup) referenceImages.push(locationContext.shotBank.closeup);
             } else {
                if(locationContext.shotBank.medium) referenceImages.push(locationContext.shotBank.medium);
             }
         }
         if (locationContext.referenceImages) {
            referenceImages.push(...locationContext.referenceImages.slice(0, 2));
         }
      }

      const imageUrl = await generateImage(
        refinedPrompt,
        referenceImages,
        currentProject.resolution,
        currentProject.aspectRatio,
        currentProject.worldLook,
        currentProject.promptGuidelines,
        {
          characters: currentProject.type === 'narrative' ? currentProject.characters as Character[] : undefined,
          products: currentProject.type === 'product' ? currentProject.characters as Product[] : undefined,
          models: currentProject.models || [],
          locations: currentProject.locations,
          styles: currentProject.styleReferences
        },
        currentProject.styleAnalysis // 🔒 Pass locked global style analysis
      );

      const finalStructure = { ...currentProject.structure };
      updateBeatInStructure(finalStructure, beatId, { 
         isGeneratingImage: false, 
         generatedImages: imageUrl ? [...(getBeat(finalStructure, beatId)?.generatedImages || []), imageUrl] : (getBeat(finalStructure, beatId)?.generatedImages || []),
         selectedImageIndex: imageUrl ? (getBeat(finalStructure, beatId)?.generatedImages?.length || 0) : -1,
         prompt_seed: refinedPrompt
      });
      updateProject({ structure: finalStructure });

    } catch (error) {
      console.error("Failed to generate image", error);
      const errStructure = { ...currentProject.structure };
      updateBeatInStructure(errStructure, beatId, { isGeneratingImage: false });
      updateProject({ structure: errStructure });
    }
  };

  // --- STYLE HANDLERS (AI Analysis) ---
  const handleAddStyleReference = async (base64: string) => {
     if (!currentProject) return;
     const newId = `style_${Date.now()}`;
     const newRef: StyleReference = {
        id: newId,
        imageUrl: base64,
        name: 'Analyzed Style',
        isAnalyzing: true
     };

     // Fix race condition: Use functional state update
     setCurrentProject(prev => ({
        ...prev,
        styleReferences: [...prev.styleReferences, newRef]
     }));

     // AI Analysis
     try {
        const analysis = await analyzeStyleReference(base64);

        // Fix race condition: Use functional state update again
        setCurrentProject(prev => ({
           ...prev,
           styleReferences: prev.styleReferences.map(s =>
              s.id === newId
                 ? { ...s, analysis, isAnalyzing: false }
                 : s
           )
        }));
     } catch (e) {
        console.error(e);
        // Fix race condition: Use functional state update for error case
        setCurrentProject(prev => ({
           ...prev,
           styleReferences: prev.styleReferences.map(s =>
              s.id === newId
                 ? { ...s, isAnalyzing: false }
                 : s
           )
        }));
     }
  };

  // Add multi-file upload support
  const handleAddMultipleStyleReferences = async (files: FileList) => {
     if (!currentProject || !files || files.length === 0) return;

     // Convert all files to base64
     const newRefs: StyleReference[] = [];
     for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve(reader.result as string);
           reader.readAsDataURL(file);
        });

        newRefs.push({
           id: `style_${Date.now()}_${i}`,
           imageUrl: base64,
           name: `Style Ref ${i + 1}`,
           isAnalyzing: false // Will analyze batch after all uploaded
        });
     }

     // Add all images immediately (functional state update)
     setCurrentProject(prev => ({
        ...prev,
        styleReferences: [...prev.styleReferences, ...newRefs]
     }));

     console.log(`✅ Added ${newRefs.length} style references`);
  };

  // Batch analyze all style references
  const handleAnalyzeBatchStyle = async () => {
     if (!currentProject || currentProject.styleReferences.length === 0) return;

     console.log('🎨 Starting batch style analysis...');

     // Set analyzing state
     setCurrentProject(prev => ({
        ...prev,
        styleReferences: prev.styleReferences.map(ref => ({ ...ref, isAnalyzing: true }))
     }));

     try {
        const images = currentProject.styleReferences.map(ref => ref.imageUrl);
        const analysis = await analyzeBatchStyleReferences(images);

        // Update with analysis results
        setCurrentProject(prev => ({
           ...prev,
           styleAnalysis: analysis,
           styleReferences: prev.styleReferences.map(ref => ({ ...ref, isAnalyzing: false }))
        }));

        console.log('✅ Batch style analysis complete');
     } catch (error) {
        console.error('❌ Batch style analysis failed:', error);

        // Remove analyzing state on error
        setCurrentProject(prev => ({
           ...prev,
           styleReferences: prev.styleReferences.map(ref => ({ ...ref, isAnalyzing: false }))
        }));

        alert('Failed to analyze style references. Check console for details.');
     }
  };

  const handleRemoveStyleReference = (id: string) => {
     if (!currentProject) return;
     updateProject({ styleReferences: currentProject.styleReferences.filter(s => s.id !== id) });
  };

  const handleSetDefaultStyle = (id: string) => {
     if (!currentProject) return;
     updateProject({ 
        styleReferences: currentProject.styleReferences.map(s => ({ ...s, isDefault: s.id === id }))
     });
  };

  // --- BATCH HANDLERS ---
  const handleBatchApplyTemplate = (template: ShotTemplate, productIds: string[]) => {
     if (!currentProject) return;
     const selectedProducts = currentProject.characters.filter(p => productIds.includes(p.id)) as Product[];
     
     const newStructure = applyTemplateToProducts(template, selectedProducts, currentProject.structure);
     updateProject({ structure: newStructure, activeTemplate: template });
     setActiveTab('board');
  };

  const handleBatchGenerate = async () => {
     if (!currentProject || !currentProject.structure) return;
     
     const shotsToGen: Beat[] = [];
     currentProject.structure.acts.forEach(act => act.scenes.forEach(scene => scene.beats.forEach(beat => {
        if (!beat.generatedImages || beat.generatedImages.length === 0) {
           shotsToGen.push(beat);
        }
     })));

     setBatchProgress({ current: 0, total: shotsToGen.length });
     setIsBatchGenerating(true);

     let completed = 0;
     for (const shot of shotsToGen) {
        await handleGenerateImage(shot.beat_id, shot.prompt_seed);
        completed++;
        setBatchProgress({ current: completed, total: shotsToGen.length });
        await new Promise(r => setTimeout(r, 1000));
     }

     setIsBatchGenerating(false);
     setBatchProgress({ current: 0, total: 0 });
  };

  // --- UPDATE HELPERS ---
  const getBeat = (struct: EpisodeStructure, beatId: string) => {
     for(const act of struct.acts) {
        for (const scene of act.scenes) {
           const beat = scene.beats.find(b => b.beat_id === beatId);
           if (beat) return beat;
        }
     }
     return null;
  };

  const updateBeatInStructure = (struct: EpisodeStructure, beatId: string, updates: Partial<Beat>) => {
     struct.acts.forEach(act => {
        act.scenes.forEach(scene => {
           scene.beats = scene.beats.map(beat => {
              if (beat.beat_id === beatId) return { ...beat, ...updates };
              return beat;
           });
        });
     });
  };

  const handleSelectImage = (beatId: string, index: number) => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, { selectedImageIndex: index });
     updateProject({ structure: newStruct });
  };

  const handlePromptChange = (beatId: string, newPrompt: string) => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, { prompt_seed: newPrompt });
     updateProject({ structure: newStruct });
  };

  // Feedback & Smart Refinement
  const handleLikeFeedback = (beatId: string, notes: string) => {
     if (!currentProject?.structure) return;
     const beat = getBeat(currentProject.structure, beatId);
     if (!beat) return;
     
     setDirectorLog(prev => ({ ...prev, likedBeats: [...prev.likedBeats, { prompt: beat.prompt_seed, notes }] }));
     
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, { feedback: { liked: true, note: notes }, status: 'Approved' });
     updateProject({ structure: newStruct });
  };

  const handleDislikeFeedback = (beatId: string, notes: string) => {
     if (!currentProject?.structure) return;
     const beat = getBeat(currentProject.structure, beatId);
     if (!beat) return;

     setDirectorLog(prev => ({ ...prev, dislikedBeats: [...prev.dislikedBeats, { prompt: beat.prompt_seed, notes }] }));
     
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, { feedback: { liked: false, note: notes }, status: 'Changes Requested' });
     updateProject({ structure: newStruct });
  };

  const handleUpdateStatus = (beatId: string, status: BeatStatus) => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, { status });
     updateProject({ structure: newStruct });
  };

  const handleAddComment = (beatId: string, text: string) => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     const beat = getBeat(newStruct, beatId);
     if(beat) {
        const newComment = { id: `c_${Date.now()}`, userId: 'u1', userName: 'User', text, timestamp: Date.now() };
        updateBeatInStructure(newStruct, beatId, { comments: [...(beat.comments || []), newComment] });
        updateProject({ structure: newStruct });
     }
  };

  const handleRestorePrompt = (beatId: string, version: PromptVersion) => {
      if (!currentProject?.structure) return;
      const newStruct = { ...currentProject.structure };
      updateBeatInStructure(newStruct, beatId, { prompt_seed: version.prompt });
      updateProject({ structure: newStruct });
  };

  // Advanced AI Handlers
  const handleGenerateSuggestions = async (beatId: string) => {
     if (!currentProject?.structure) return;
     const beat = getBeat(currentProject.structure, beatId);
     if (!beat) return;

     const suggestions = await generatePromptSuggestions(beat.prompt_seed, currentProject.worldLook);
     
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, { smartSuggestions: suggestions });
     updateProject({ structure: newStruct });
  };

  const handleCheckContinuity = async () => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     
     for(const act of newStruct.acts) {
        for(const scene of act.scenes) {
           for(let i = 1; i < scene.beats.length; i++) {
              const prev = scene.beats[i-1];
              const curr = scene.beats[i];
              const error = await checkVisualContinuity(prev, curr);
              if(error) {
                 updateBeatInStructure(newStruct, curr.beat_id, { continuityError: error });
              } else {
                 updateBeatInStructure(newStruct, curr.beat_id, { continuityError: undefined });
              }
           }
        }
     }
     updateProject({ structure: newStruct });
  };

  // Coverage
  const handleGenerateCoverage = async (beatId: string) => {
     if (!currentProject?.structure) return;
     const beat = getBeat(currentProject.structure, beatId);
     if (!beat) return;

     const tempStruct = { ...currentProject.structure };
     updateBeatInStructure(tempStruct, beatId, { isGeneratingImage: true });
     updateProject({ structure: tempStruct });

     const qcGem = currentProject.gems.find(g => g.type === 'quality_control')!;
     const variations = await generateShotVariations(beat, qcGem.systemInstruction);

     const finalStruct = { ...currentProject.structure };
     updateBeatInStructure(finalStruct, beatId, { 
        isGeneratingImage: false,
        variations: variations.map(v => ({ ...v, isGenerating: false }))
     });
     updateProject({ structure: finalStruct });
  };

  const handleGenerateVariationImage = async (beatId: string, index: number, prompt: string) => {
      if (!currentProject?.structure) return;
      const tempStruct = { ...currentProject.structure };
      const beat = getBeat(tempStruct, beatId);
      if (beat && beat.variations) {
          beat.variations[index].isGenerating = true;
          updateProject({ structure: tempStruct });
      }

      const img = await generateImage(
        prompt,
        currentProject.styleReferences,
        currentProject.resolution,
        currentProject.aspectRatio,
        currentProject.worldLook,
        currentProject.promptGuidelines,
        {
          products: currentProject.characters as Product[],
          models: currentProject.models || [],
          locations: currentProject.locations,
          styles: currentProject.styleReferences
        },
        currentProject.styleAnalysis // 🔒 Pass locked global style analysis
      );

      const finalStruct = { ...currentProject.structure };
      const finalBeat = getBeat(finalStruct, beatId);
      if (finalBeat && finalBeat.variations) {
          finalBeat.variations[index].isGenerating = false;
          if(img) finalBeat.variations[index].image = img;
          updateProject({ structure: finalStruct });
      }
  };

  const handleSelectVariation = (beatId: string, index: number) => {
      if (!currentProject?.structure) return;
      const newStruct = { ...currentProject.structure };
      const beat = getBeat(newStruct, beatId);
      if (beat && beat.variations) {
         const variation = beat.variations[index];
         if (variation.image) {
             beat.generatedImages.push(variation.image);
             beat.selectedImageIndex = beat.generatedImages.length - 1;
             beat.prompt_seed = variation.prompt;
             beat.camera = `${variation.lens} ${variation.movement}`;
             updateProject({ structure: newStruct });
         }
      }
  };

  // --- STORY CANVAS HANDLERS ---
  const handleMoveBeat = (sourceId: string, targetId: string) => {
    if (!currentProject?.structure) return;
    const newStruct = { ...currentProject.structure };
    let sourceBeat: Beat | undefined;

    for (const act of newStruct.acts) {
      for (const scene of act.scenes) {
        const idx = scene.beats.findIndex(b => b.beat_id === sourceId);
        if (idx !== -1) {
          sourceBeat = scene.beats.splice(idx, 1)[0];
          break;
        }
      }
      if (sourceBeat) break;
    }

    if (!sourceBeat) return;

    for (const act of newStruct.acts) {
      for (const scene of act.scenes) {
        const idx = scene.beats.findIndex(b => b.beat_id === targetId);
        if (idx !== -1) {
          scene.beats.splice(idx, 0, sourceBeat);
          updateProject({ structure: newStruct });
          return;
        }
      }
    }
  };

  const handleAddBeat = (sceneNumber: number, afterBeatId: string) => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     const newBeat: Beat = {
        beat_id: `beat_${Date.now()}`,
        characters: [],
        emotion: "Neutral",
        action: "New shot placeholder...",
        camera: "Standard",
        lighting: "Natural",
        location: "Location",
        visual_notes: "",
        prompt_seed: "A cinematic shot of...",
        generatedImages: [],
        selectedImageIndex: -1,
        status: 'Draft',
        comments: [],
        promptHistory: []
     };

     for (const act of newStruct.acts) {
        for (const scene of act.scenes) {
           if (scene.scene_number === sceneNumber) {
              const idx = scene.beats.findIndex(b => b.beat_id === afterBeatId);
              if (idx !== -1) {
                 scene.beats.splice(idx + 1, 0, newBeat);
                 updateProject({ structure: newStruct });
                 return;
              }
           }
        }
     }
  };

  const handleExportCSV = () => {
      if (!currentProject?.structure) return;
      const csv = generateShotListCSV(currentProject.structure);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name}_ShotList.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsExportOpen(false);
  };

  const handleExportScript = () => {
      if (!currentProject?.script) {
        alert("No script to export. Generate a script first.");
        return;
      }
      const blob = new Blob([currentProject.script], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name}_Script.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsExportOpen(false);
  };

  const handleGenerateZIPBlob = async (): Promise<Blob | null> => {
     if (!currentProject?.structure) return null;
     const zip = new JSZip();
     let imgCount = 0;

     currentProject.structure.acts.forEach(act => {
        const actFolder = zip.folder(currentProject.type === 'product' ? `Collection_${act.act_number}` : `Act_${act.act_number}`);
        act.scenes.forEach(scene => {
           const sceneFolder = actFolder?.folder(currentProject.type === 'product' ? `Shoot_${scene.summary.replace(/[^a-z0-9]/gi, '_')}` : `Scene_${scene.scene_number}`);
           scene.beats.forEach(beat => {
              if (beat.generatedImages && beat.generatedImages.length > 0 && beat.selectedImageIndex >= 0) {
                 const imgData = beat.generatedImages[beat.selectedImageIndex];
                 const base64 = imgData.split(',')[1];
                 const safeName = beat.action.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                 const fileName = `${beat.beat_id}_${safeName}.png`;
                 sceneFolder?.file(fileName, base64, {base64: true});
                 imgCount++;
              }
           });
        });
     });

     if (imgCount === 0) return null;
     return await zip.generateAsync({type:"blob"});
  };

  const handleDownloadZIP = async () => {
     setIsExportOpen(false);
     const content = await handleGenerateZIPBlob();
     if (content) {
        saveAs(content, `${currentProject?.name}_Assets.zip`);
     } else {
        alert("No images generated yet!");
     }
  };
  
  const handleExportToDrive = async () => {
     if (!isDriveEnabled || !isDriveConnected) {
        alert("Cloud Sync is not enabled in Settings.");
        return;
     }
     
     setIsExportOpen(false);
     setIsUploadingToDrive(true);
     try {
        const content = await handleGenerateZIPBlob();
        if (content && currentProject) {
           const filename = `${currentProject.name}_Assets.zip`;
           await uploadFileToDrive(content, filename, currentProject.name);
           alert("Successfully exported to Google Drive!");
        } else {
           alert("No images to export.");
        }
     } catch (e) {
        console.error(e);
        alert("Failed to upload to Drive.");
     } finally {
        setIsUploadingToDrive(false);
     }
  };

  const handleGenerateVisualReference = async (type: 'char' | 'loc' | 'model', id: string, prompt: string) => {
      if(!currentProject) return;
      
      if (type === 'model') {
          // Handled elsewhere
      }
      
      const img = await generateImage(
        `Visual Reference Sheet: ${prompt}. Style: ${currentProject.worldLook}`,
        currentProject.styleReferences,
        '1080p',
        '1:1',
        currentProject.worldLook,
        currentProject.promptGuidelines,
        {
          products: currentProject.characters as Product[],
          models: currentProject.models || [],
          locations: currentProject.locations,
          styles: currentProject.styleReferences
        },
        currentProject.styleAnalysis // 🔒 Pass locked global style analysis
      );
      if(img) {
         if(type === 'char') {
            const newChars = currentProject.characters.map(c => c.id === id ? { ...c, referenceImages: [...(c.referenceImages||[]), img] } : c);
            updateProject({ characters: newChars });
         } else if (type === 'loc') {
            const newLocs = currentProject.locations.map(l => l.id === id ? { ...l, referenceImages: [...(l.referenceImages||[]), img] } : l);
            updateProject({ locations: newLocs });
         } else if (type === 'model') {
            const newModels = currentProject.models?.map(m => m.id === id ? { ...m, referenceImages: [...(m.referenceImages||[]), img] } : m);
            updateProject({ models: newModels });
         }
      }
  };

  const handleBuildLocationSet = async (locId: string) => {
      if(!currentProject) return;
      const loc = currentProject.locations.find(l => l.id === locId);
      if(!loc) return;
      
      const tempLocs = currentProject.locations.map(l => l.id === locId ? { ...l, shotBank: { ...l.shotBank, isGenerating: true } } : l);
      updateProject({ locations: tempLocs });

      const setAssets = await generateLocationSet(loc, currentProject.worldLook, currentProject.styleReferences);
      
      const finalLocs = currentProject.locations.map(l => l.id === locId ? { ...l, shotBank: { isGenerating: false, ...setAssets } } : l);
      updateProject({ locations: finalLocs });
  };

  const handleUpdateBeatImage = (beatId: string, newImage: string) => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, { 
        generatedImages: [...(getBeat(newStruct, beatId)?.generatedImages || []), newImage],
        selectedImageIndex: (getBeat(newStruct, beatId)?.generatedImages?.length || 0)
     });
     updateProject({ structure: newStruct });
  }
  
  const handleUpdateBeat = (beatId: string, updates: Partial<Beat>) => {
     if (!currentProject?.structure) return;
     const newStruct = { ...currentProject.structure };
     updateBeatInStructure(newStruct, beatId, updates);
     updateProject({ structure: newStruct });
  };
  
  const handleAddBrandAsset = (asset: BrandAsset) => {
     if(!currentProject) return;
     updateProject({ brandAssets: [...(currentProject.brandAssets || []), asset] });
  };

  const handleDeleteBrandAsset = (id: string) => {
     if(!currentProject) return;
     updateProject({ brandAssets: currentProject.brandAssets?.filter(a => a.id !== id) });
  };

  const getEditingBeat = () => {
    if (!currentProject?.structure || !editingBeatId) return null;
    return getBeat(currentProject.structure, editingBeatId);
  };

  const editingBeat = getEditingBeat();
  const editingImage = editingBeat?.generatedImages?.[editingBeat.selectedImageIndex];

  // --- RENDER ---
  if (!currentProject) {
    return <Dashboard projects={projects} onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} onDeleteProject={handleDeleteProject} currentUser={projects[0]?.team?.[0] || {id:'u1',name:'User',role:'Director',avatarColor:'bg-blue-500'}} onSwitchUser={()=>{}} />;
  }

  const isProduct = currentProject.type === 'product';

  return (
    <div className="flex h-screen w-full bg-nano-900 text-gray-100 overflow-hidden font-sans select-none">
      {/* Sidebar: World Bible */}
      <div 
        className="h-full hidden md:block shrink-0 border-r border-gray-800 bg-nano-800 shadow-2xl z-20 overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        <WorldBiblePanel
          currentProject={currentProject}
          onUpdateProject={setCurrentProject}
          onUploadMultipleImages={handleMultipleImageUpload}
          onAddStyleReference={handleAddStyleReference}
          onAddMultipleStyleReferences={handleAddMultipleStyleReferences}
          onAnalyzeBatchStyle={handleAnalyzeBatchStyle}
          onRemoveStyleReference={handleRemoveStyleReference}
          onSetDefaultStyle={handleSetDefaultStyle}
          onGenerateReference={handleGenerateVisualReference}
          onBuildLocationSet={handleBuildLocationSet}
          onAddBrandAsset={handleAddBrandAsset}
          onDeleteBrandAsset={handleDeleteBrandAsset}
          onBatchApplyTemplate={handleBatchApplyTemplate}
          onBatchGenerate={handleBatchGenerate}
          isBatchGenerating={isBatchGenerating}
          batchProgress={batchProgress}
          isDriveEnabled={isDriveEnabled}
        />
      </div>
      
      {/* Resizer Handle */}
      <div
        className="w-1 bg-gray-800 hover:bg-nano-accent cursor-col-resize transition-colors z-30 hidden md:block active:bg-nano-accent"
        onMouseDown={startResizing}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-gray-800 bg-nano-900/95 backdrop-blur flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center space-x-3">
             <button onClick={handleExitProject} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white"><ArrowRight size={18} className="rotate-180" /></button>
             <div className="w-8 h-8 rounded bg-gradient-to-br from-nano-pink to-purple-600 flex items-center justify-center shadow-lg shadow-nano-pink/20"><Cpu size={18} className="text-white" /></div>
             <div>
               <h1 className="text-lg font-bold tracking-tight text-white truncate max-w-[200px]">{currentProject.name}</h1>
               <p className="text-[10px] text-gray-500 font-mono tracking-wider flex items-center gap-2"><span className={clsx("w-2 h-2 rounded-full", currentProject.structure ? "bg-green-500" : "bg-gray-500")}></span> STUDIO v{APP_VERSION}</p>
             </div>
          </div>
          <div className="flex items-center space-x-4">
             {/* Save Status & Button */}
             <button 
               onClick={handleManualSave}
               disabled={saveStatus === 'saving'}
               className={clsx(
                 "px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 border transition-all",
                 saveStatus === 'saved' && "bg-green-900/30 border-green-700 text-green-400",
                 saveStatus === 'saving' && "bg-gray-800 border-gray-700 text-gray-400",
                 saveStatus === 'unsaved' && "bg-yellow-900/30 border-yellow-700 text-yellow-400 animate-pulse",
                 saveStatus === 'error' && "bg-red-900/30 border-red-700 text-red-400"
               )}
             >
               {saveStatus === 'saving' && <Loader2 size={14} className="animate-spin" />}
               {saveStatus === 'saved' && <CheckCircle size={14} />}
               {saveStatus === 'unsaved' && <Save size={14} />}
               {saveStatus === 'error' && <AlertCircle size={14} />}
               {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? (lastSaveTime ? formatTimeSince(lastSaveTime) : 'Saved') : saveStatus === 'unsaved' ? 'Save' : 'Error'}
             </button>

             {activeTab === 'board' && (
                <button onClick={handleCheckContinuity} className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 border border-gray-700"><AlertTriangle size={14} className="text-yellow-500" /> Check Continuity</button>
             )}
             
             <div className="relative">
                <button 
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 border border-gray-700"
                >
                  <Table size={14} /> Export
                </button>
                {isExportOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded shadow-xl z-50">
                       <button onClick={handleExportScript} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2"><FileText size={14}/> Export Script (TXT)</button>
                       <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2"><Table size={14}/> Export Shot List (CSV)</button>
                       <button onClick={handleDownloadZIP} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2"><Archive size={14}/> Download Assets (ZIP)</button>
                       
                       {/* Conditional Drive Export */}
                       {isDriveEnabled && isDriveConnected && (
                          <button onClick={handleExportToDrive} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2 border-t border-gray-700">
                              {isUploadingToDrive ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14}/>} 
                              Save to Google Drive
                          </button>
                       )}
                    </div>
                  </>
                )}
             </div>

             <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
                <span className="px-2 text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1"><LayoutDashboard size={12} /></span>
                <select value={currentProject.aspectRatio} onChange={(e) => updateProject({ aspectRatio: e.target.value as AspectRatio })} className="bg-gray-900 text-white text-xs rounded px-2 py-1 border-none focus:ring-1 focus:ring-nano-accent outline-none w-20">
                  <option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:3">4:3</option><option value="3:4">3:4</option><option value="2.39:1">2.39:1</option>
                </select>
             </div>
             <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
                <span className="px-2 text-[10px] text-gray-400 font-bold uppercase">Res</span>
                <select value={currentProject.resolution} onChange={(e) => updateProject({ resolution: e.target.value as Resolution })} className="bg-gray-900 text-white text-xs rounded px-2 py-1 border-none focus:ring-1 focus:ring-nano-accent outline-none">
                  <option value="1080p">1080p</option><option value="2k">2K</option><option value="4k">4K</option>
                </select>
             </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          
          {!currentProject.structure && step === GenerationStep.IDLE && (
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
              <div className="w-full max-w-4xl space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">{isProduct ? "Product Campaign Brief" : "Story Engine"}</h2>
                  <p className="text-sm text-gray-400">
                    {isProduct ? "Describe your product photography campaign in detail" : "Write your story logline to begin"}
                  </p>
                </div>

                <BriefComposer
                  value={currentProject.idea}
                  onChange={(newBrief) => updateProject({ idea: newBrief })}
                  onEnhance={async (brief) => await enhanceBrief(brief, currentProject.type)}
                  projectType={currentProject.type}
                />

                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleInitializeGeneration}
                    disabled={!currentProject.idea.trim()}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-3 shadow-lg transition-all"
                  >
                    {isProduct ? "Generate Shot List" : "Generate Story"}
                    <ArrowRight className="w-6 h-6" />
                  </button>

                  {/* 🧠 META-ORCHESTRATOR Entry Point */}
                  <button
                    onClick={() => setIsProducerChatOpen(true)}
                    disabled={!currentProject.idea.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-3 shadow-lg transition-all border-2 border-purple-400/30"
                  >
                    <MessageCircle className="w-6 h-6" />
                    Chat with Producer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🎬 Script Approval Modal */}
          {step === GenerationStep.SCRIPT_APPROVAL && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-nano-900 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-700">
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <FileText className="w-6 h-6 text-cyan-400" />
                      📝 Review Script
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Edit the script or approve to continue</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRegenerateScript}
                      disabled={step === GenerationStep.GENERATING_SCRIPT}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Script
                    </button>
                    <button
                      onClick={handleApproveScript}
                      className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all"
                    >
                      <Check className="w-5 h-5" />
                      Approve & Continue
                    </button>
                  </div>
                </div>

                {/* Script Editor */}
                <div className="flex-1 p-6 overflow-auto">
                  <textarea
                    value={currentProject?.script || ''}
                    onChange={(e) => handleScriptEdit(e.target.value)}
                    className="w-full h-full p-6 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="Script will appear here..."
                  />
                </div>

                {/* Footer Helper */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                  <p className="text-xs text-gray-400">
                    💡 <strong>Tip:</strong> Edit the script directly, or regenerate if you want a completely new version. When ready, click "Approve & Continue" to proceed with world analysis and shot breakdown.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step !== GenerationStep.IDLE && step !== GenerationStep.COMPLETE && step !== GenerationStep.ERROR && step !== GenerationStep.SCRIPT_APPROVAL && (
             <div className="flex-1 flex items-center justify-center">
                 <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="animate-spin text-nano-accent" size={48} />
                    <span className="font-mono text-sm uppercase tracking-widest text-nano-accent">
                      {step === GenerationStep.GENERATING_SCRIPT && (isProduct ? "Drafting Shot List..." : "Writing Script...")}
                      {step === GenerationStep.ANALYZING_WORLD && (isProduct ? "Sourcing Props..." : "Scouting Locations...")}
                      {step === GenerationStep.DIRECTOR_ANALYSIS && "Director Analysis..."}
                      {step === GenerationStep.PARSING_STRUCTURE && "Building Production Boards..."}
                    </span>
                 </div>
             </div>
          )}

          {currentProject.structure && (
             <>
              <div className="flex border-b border-gray-800 bg-nano-800/50 px-6">
                <button onClick={() => setActiveTab('script')} className={clsx("px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2", activeTab === 'script' ? "border-nano-pink text-white" : "border-transparent text-gray-500")}>
                  <FileText size={14} /> <span>{isProduct ? 'Brief' : 'Script'}</span>
                </button>
                <button onClick={() => setActiveTab('board')} className={clsx("px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2", activeTab === 'board' ? "border-nano-pink text-white" : "border-transparent text-gray-500")}>
                  <LayoutDashboard size={14} /> <span>Campaign Board</span>
                </button>
                {!isProduct && (
                   <button onClick={() => setActiveTab('canvas')} className={clsx("px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2", activeTab === 'canvas' ? "border-nano-pink text-white" : "border-transparent text-gray-500")}>
                     <Layers size={14} /> <span>Timeline</span>
                   </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-black/20">
                {activeTab === 'script' && (
                   <div className="max-w-3xl mx-auto bg-white text-black shadow-2xl min-h-full p-8 relative">
                      <div className="absolute top-4 right-4 flex gap-2">
                         {!isProduct && <button onClick={handleReparseScript} className="bg-black text-white text-xs px-3 py-1 rounded flex items-center gap-2 hover:bg-gray-800 border border-gray-700"><RefreshCw size={12} /> Update Board from Edit</button>}
                      </div>
                      <h2 className="text-2xl font-bold mb-4">{isProduct ? "Campaign Brief" : "Screenplay"}</h2>
                      <textarea value={currentProject.script || currentProject.productBrief || currentProject.idea} onChange={(e) => updateProject({ script: e.target.value })} className="w-full h-[70vh] font-mono text-sm focus:outline-none resize-none" />
                   </div>
                )}

                {activeTab === 'board' && (
                  <div className="space-y-12 max-w-6xl mx-auto pb-20">
                    {currentProject.structure.acts.map((act, aIdx) => (
                      <div key={aIdx} className="space-y-6">
                        <div className="flex items-center space-x-4 text-gray-500">
                          <div className="h-px bg-gray-800 flex-1"></div>
                          <span className="text-xs font-bold uppercase tracking-widest">{isProduct ? `Collection: ${act.act_number}` : `Act ${act.act_number}`}</span>
                          <div className="h-px bg-gray-800 flex-1"></div>
                        </div>
                        {act.scenes.map((scene, sIdx) => (
                          <div key={sIdx} className="space-y-4">
                             <div className="bg-nano-800/50 border-l-2 border-gray-600 px-4 py-2 rounded-r">
                                <h3 className="text-sm font-bold text-white">{isProduct ? `Shoot: ${scene.summary}` : `Scene ${scene.scene_number}`}</h3>
                                {!isProduct && <p className="text-xs text-gray-400 italic">{scene.summary}</p>}
                             </div>
                             <div className={clsx("grid gap-6", currentProject.aspectRatio === '9:16' ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                               {scene.beats.map((beat) => (
                                 isProduct ? (
                                    <ProductShotCard key={beat.beat_id} shot={beat} onGenerateImage={handleGenerateImage} onOpenLightbox={setLightboxImage} onUpdateShot={handleUpdateBeat} aspectRatio={currentProject.aspectRatio} brandAssets={currentProject.brandAssets || []} />
                                 ) : (
                                    <BeatCard key={beat.beat_id} beat={beat} currentUser={currentProject.team[0]} onGenerateImage={handleGenerateImage} onPromptChange={handlePromptChange} onOpenLightbox={setLightboxImage} onSelectImage={handleSelectImage} onLikeFeedback={handleLikeFeedback} onDislikeFeedback={handleDislikeFeedback} onUpdateStatus={handleUpdateStatus} onAddComment={handleAddComment} onRestorePrompt={handleRestorePrompt} onGenerateSuggestions={handleGenerateSuggestions} aspectRatio={currentProject.aspectRatio} />
                                 )
                               ))}
                             </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'canvas' && !isProduct && (
                  <StoryCanvas structure={currentProject.structure} onSelectBeat={(id) => { setEditingBeatId(id); setLightboxImage(null); }} onMoveBeat={handleMoveBeat} onAddBeat={handleAddBeat} onGenerateCoverage={handleGenerateCoverage} onGenerateVariationImage={handleGenerateVariationImage} onSelectVariation={handleSelectVariation} />
                )}
              </div>
             </>
          )}
        </div>
      </div>

      {editingBeatId && editingBeat && editingImage && (
        <ImageEditor beat={editingBeat} image={editingImage} onClose={() => setEditingBeatId(null)} onApplyEdit={(newImg) => handleUpdateBeatImage(editingBeatId, newImg)} onGenerateEdit={(instruction) => editGeneratedImage(editingImage, instruction)} />
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxImage(null)}>
           <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"><X size={32} /></button>
           <div className="max-w-[90vw] max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
             <img src={lightboxImage} className="max-w-full max-h-full object-contain rounded shadow-2xl ring-1 ring-gray-800" />
             <div className="absolute bottom-4 right-4 flex space-x-2">
                <button onClick={() => { const a = document.createElement('a'); a.href = lightboxImage; a.download = `nano_render.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }} className="bg-nano-pink hover:bg-pink-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold shadow-lg transition-colors"><Download size={16} /> DOWNLOAD</button>
             </div>
           </div>
        </div>
      )}

      {/* 🧠 META-ORCHESTRATOR - Producer Chat Interface (Always Available) */}
      {currentProject && (
        <ProducerChat
          project={currentProject}
          onWorkflowPlanGenerated={handleWorkflowPlanGenerated}
          onProjectUpdate={updateProject} // Allow Producer to modify project
          isOpen={isProducerChatOpen}
          onToggle={() => setIsProducerChatOpen(!isProducerChatOpen)}
        />
      )}

      {/* 🧠 Workflow Status Indicator */}
      {isExecutingWorkflow && workflowStatus && (
        <div className="fixed bottom-6 left-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">{workflowStatus}</span>
        </div>
      )}
    </div>
  );
};

export default App;
