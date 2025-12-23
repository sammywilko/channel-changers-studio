
import React, { useRef, useState } from 'react';
import { Character, Location, Gem, Product, ProjectType, Model, BrandAsset, ShotTemplate, StyleReference, Project } from '../types';
import { BookOpen, Upload, X, Globe, MapPin, Plus, FileCode, Gem as GemIcon, Layout, Tag, ShoppingBag, User, Wand2, Loader2, Trash2, Sticker, Layers, Play, Cloud, Camera, TestTube, Check, AlertTriangle, Info, Lock, Unlock, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { GOLF_APPAREL_TEMPLATE, FOOTWEAR_TEMPLATE, ACCESSORIES_TEMPLATE, SEASONAL_CAMPAIGN_TEMPLATE } from '../templates';
import { pickFileFromDrive } from '../services/googleDriveService';
import StyleRefCard from './StyleRefCard';
import AngleGenerator from './AngleGenerator';
import WhiteBackgroundTest from './WhiteBackgroundTest';
import { analyzeImageCoverage, generateMissingReferences, CoverageAnalysis, extractLocationsFromScript, generateLocationAngles, ExtractedLocation, GeneratedLocationAngle } from '../services/geminiService';

interface WorldBiblePanelProps {
  currentProject: Project;
  onUpdateProject: (project: Project) => void;
  onUploadMultipleImages: (files: FileList | null, entityId: string, entityType: 'model' | 'product' | 'location') => void;
  onAddStyleReference: (base64: string) => void;
  onAddMultipleStyleReferences: (files: FileList) => void;
  onAnalyzeBatchStyle: () => void;
  onRemoveStyleReference: (id: string) => void;
  onSetDefaultStyle: (id: string) => void;
  onGenerateReference: (type: 'char' | 'loc' | 'model', id: string, prompt: string) => void;
  onBuildLocationSet: (locId: string) => void;
  onAddBrandAsset?: (asset: BrandAsset) => void;
  onDeleteBrandAsset?: (id: string) => void;
  onBatchApplyTemplate?: (template: ShotTemplate, productIds: string[]) => void;
  onBatchGenerate?: () => void;
  isBatchGenerating?: boolean;
  batchProgress?: { current: number, total: number };
  isDriveEnabled?: boolean;
}

const WorldBiblePanel: React.FC<WorldBiblePanelProps> = ({
  currentProject,
  onUpdateProject,
  onUploadMultipleImages,
  onAddStyleReference,
  onAddMultipleStyleReferences,
  onAnalyzeBatchStyle,
  onRemoveStyleReference,
  onSetDefaultStyle,
  onGenerateReference,
  onBuildLocationSet,
  onAddBrandAsset,
  onDeleteBrandAsset,
  onBatchApplyTemplate,
  onBatchGenerate,
  isBatchGenerating,
  batchProgress,
  isDriveEnabled
}) => {
  const isProductMode = currentProject.type === 'product';
  const [activeTab, setActiveTab] = useState<'chars' | 'locs' | 'models' | 'gems' | 'rules' | 'assets'>('chars');
  const styleRefInput = useRef<HTMLInputElement>(null);

  // Batch State
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Angle Generator State
  const [showAngleGenerator, setShowAngleGenerator] = useState(false);

  // White Background Test State
  const [testingProduct, setTestingProduct] = useState<string | null>(null);

  // Master Character Profile State
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  // Coverage Analysis State
  const [analysisResults, setAnalysisResults] = useState<Record<string, CoverageAnalysis>>({});
  const [analyzingCharacter, setAnalyzingCharacter] = useState<string | null>(null);
  const [generatingReference, setGeneratingReference] = useState<string | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<{ characterId: string, view: string } | null>(null);

  // Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // AI Location Setup State
  const [locationWorkflow, setLocationWorkflow] = useState<'script' | 'image' | 'description'>('script');
  const [scriptInput, setScriptInput] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [locationDescription, setLocationDescription] = useState<string>('');
  const [locationReferenceImage, setLocationReferenceImage] = useState<string>('');
  const [extractedLocations, setExtractedLocations] = useState<ExtractedLocation[]>([]);
  const [analyzingScript, setAnalyzingScript] = useState<boolean>(false);
  const [generatingAngles, setGeneratingAngles] = useState<boolean>(false);
  const [angleGenerationProgress, setAngleGenerationProgress] = useState<Array<{angle: string, status: 'pending' | 'generating' | 'complete'}>>([]);
  const [generatedLocationAngles, setGeneratedLocationAngles] = useState<GeneratedLocationAngle[]>([]);
  const [currentLocationForGeneration, setCurrentLocationForGeneration] = useState<ExtractedLocation | null>(null);

  // Helper functions to update entities
  const updateCharacter = (id: string, field: string, value: any) => {
    const updated = currentProject.characters.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    );
    onUpdateProject({ ...currentProject, characters: updated });
  };

  const updateCharacterProfile = (id: string, profileUpdates: Partial<any>) => {
    const updated = currentProject.characters.map(c =>
      c.id === id ? {
        ...c,
        profile: {
          ...(c.profile || {}),
          ...profileUpdates
        }
      } : c
    );
    onUpdateProject({ ...currentProject, characters: updated });
  };

  const toggleProfileExpanded = (id: string) => {
    const newSet = new Set(expandedProfiles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedProfiles(newSet);
  };

  const updateModel = (id: string, field: string, value: any) => {
    const updated = currentProject.models?.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    );
    onUpdateProject({ ...currentProject, models: updated });
  };

  const updateGem = (id: string, instruction: string) => {
    const updated = currentProject.gems.map(g =>
      g.id === id ? { ...g, systemInstruction: instruction } : g
    );
    onUpdateProject({ ...currentProject, gems: updated });
  };

  const deleteCharacterImage = (handle: string, index: number) => {
    const updated = currentProject.characters.map(c =>
      c.handle === handle
        ? { ...c, referenceImages: c.referenceImages?.filter((_, i) => i !== index) }
        : c
    );
    onUpdateProject({ ...currentProject, characters: updated });
  };

  const deleteModelImage = (id: string, index: number) => {
    const updated = currentProject.models?.map(m =>
      m.id === id
        ? { ...m, referenceImages: m.referenceImages?.filter((_, i) => i !== index) }
        : m
    );
    onUpdateProject({ ...currentProject, models: updated });
  };

  const toggleProductSelection = (id: string) => {
     if (selectedProducts.includes(id)) {
        setSelectedProducts(selectedProducts.filter(p => p !== id));
     } else {
        setSelectedProducts([...selectedProducts, id]);
     }
  };

  const handleApplyTemplate = () => {
     if (!onBatchApplyTemplate) return;
     const template = [GOLF_APPAREL_TEMPLATE, FOOTWEAR_TEMPLATE, ACCESSORIES_TEMPLATE, SEASONAL_CAMPAIGN_TEMPLATE].find(t => t.id === selectedTemplateId);
     if (template && selectedProducts.length > 0) {
        onBatchApplyTemplate(template, selectedProducts);
        setSelectedProducts([]); // Reset selection
     }
  };

  // Simplified file change handlers
  const handleCharFileChange = (handle: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const product = currentProject.characters.find(c => c.handle === handle);
    if (product) {
      onUploadMultipleImages(event.target.files, product.id, 'product');
    }
  };

  const handleLocFileChange = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    onUploadMultipleImages(event.target.files, id, 'location');
  };

  const handleModelFileChange = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    onUploadMultipleImages(event.target.files, id, 'model');
  };

  const handleStyleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onAddStyleReference(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleAssetUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if(file && onAddBrandAsset) {
        const reader = new FileReader();
        reader.onloadend = () => {
           onAddBrandAsset({
              id: `asset_${Date.now()}`,
              name: file.name,
              type: 'logo',
              url: reader.result as string
           });
        };
        reader.readAsDataURL(file);
     }
  };

  // Google Drive Picker Handler
  const handleDrivePick = async (callback: (url: string) => void) => {
     try {
        const url = await pickFileFromDrive();
        if (url) callback(url);
     } catch (e) {
        alert("Could not pick from Drive. Check connection.");
     }
  };

  // Coverage Analysis Handlers
  const handleAnalyzeCoverage = async (characterId: string) => {
    const character = currentProject.characters.find(c => c.id === characterId);
    if (!character || !character.referenceImages || character.referenceImages.length === 0) {
      alert('Add reference images first before analyzing coverage.');
      return;
    }

    setAnalyzingCharacter(characterId);
    try {
      const analysis = await analyzeImageCoverage(
        character.referenceImages,
        character.name,
        character.visuals
      );
      setAnalysisResults({ ...analysisResults, [characterId]: analysis });
    } catch (error) {
      console.error('Coverage analysis failed:', error);
      alert('Failed to analyze coverage. Check console for details.');
    } finally {
      setAnalyzingCharacter(null);
    }
  };

  const handleGenerateMissingReference = async (characterId: string, missingView: string) => {
    console.log('🖱️ Missing view clicked:', { characterId, missingView });

    const character = currentProject.characters.find(c => c.id === characterId);
    if (!character || !character.referenceImages || character.referenceImages.length === 0) {
      console.error('❌ Character validation failed:', {
        characterFound: !!character,
        hasReferenceImages: !!character?.referenceImages,
        referenceCount: character?.referenceImages?.length || 0
      });
      alert('Character has no reference images. Please upload references first.');
      return;
    }

    console.log('✅ Setting pending generation:', { characterId, view: missingView });
    setPendingGeneration({ characterId, view: missingView });
    console.log('✅ Pending generation state updated');
  };

  const confirmGenerateReference = async () => {
    if (!pendingGeneration) {
      console.error('No pending generation found');
      return;
    }

    const { characterId, view } = pendingGeneration;
    console.log('🎨 Starting reference generation:', { characterId, view });

    const character = currentProject.characters.find(c => c.id === characterId);
    if (!character) {
      console.error('Character not found:', characterId);
      return;
    }

    setGeneratingReference(characterId);
    setPendingGeneration(null);

    try {
      console.log('📸 Calling generateMissingReferences with:', {
        existingReferences: character.referenceImages?.length,
        characterName: character.name,
        missingView: view,
        worldLook: currentProject.worldLook.substring(0, 50) + '...'
      });

      const newReference = await generateMissingReferences(
        character.referenceImages || [],
        character.name,
        character.visuals,
        view,
        currentProject.worldLook
      );

      console.log('📥 Generation result:', newReference ? 'SUCCESS' : 'FAILED (null)');

      if (newReference) {
        // Add the generated reference to the character
        const updatedCharacters = currentProject.characters.map(c =>
          c.id === characterId
            ? { ...c, referenceImages: [...(c.referenceImages || []), newReference] }
            : c
        );
        onUpdateProject({ ...currentProject, characters: updatedCharacters });

        console.log('✅ Reference added to character, re-analyzing coverage...');
        // Re-analyze coverage after adding new reference
        setTimeout(() => handleAnalyzeCoverage(characterId), 500);
      } else {
        alert('Failed to generate reference. The AI returned null. Check console for API errors.');
      }
    } catch (error) {
      console.error('❌ Reference generation failed:', error);
      alert(`Failed to generate reference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingReference(null);
      console.log('🏁 Generation workflow complete');
    }
  };

  // AI Location Setup Handlers
  const handleAnalyzeScript = async () => {
    if (!scriptInput.trim()) {
      alert('Please paste a script or scene description first.');
      return;
    }

    setAnalyzingScript(true);
    try {
      const locations = await extractLocationsFromScript(scriptInput);
      setExtractedLocations(locations);
      if (locations.length === 0) {
        alert('No locations found in script. Try adding location descriptions like "INT. THE HUB - DAY"');
      }
    } catch (error) {
      console.error('Script analysis failed:', error);
      alert('Failed to analyze script. Check console for details.');
    } finally {
      setAnalyzingScript(false);
    }
  };

  const handleGenerateLocationAngles = async (location: ExtractedLocation) => {
    setCurrentLocationForGeneration(location);
    setGeneratingAngles(true);

    // Initialize progress tracking
    const progress = location.suggestedAngles.map(angle => ({
      angle,
      status: 'pending' as const
    }));
    setAngleGenerationProgress(progress);

    try {
      const angles: GeneratedLocationAngle[] = [];

      // 🔒 Build style prompt from global locked style analysis (if available)
      let stylePrompt = currentProject.worldLook;
      if (currentProject.styleAnalysis) {
        stylePrompt = `${currentProject.worldLook}

🔒 LOCKED GLOBAL STYLE (MANDATORY):
Visual Style: ${currentProject.styleAnalysis.commonStyle}
Lighting: ${currentProject.styleAnalysis.lighting}
Color Palette: ${currentProject.styleAnalysis.colors}
Materials/Textures: ${currentProject.styleAnalysis.materials}
Composition: ${currentProject.styleAnalysis.composition}

Style Summary: ${currentProject.styleAnalysis.summary}`;
      }

      for (let i = 0; i < location.suggestedAngles.length; i++) {
        const angle = location.suggestedAngles[i];

        // Update progress to generating
        setAngleGenerationProgress(prev =>
          prev.map((item, idx) => idx === i ? { ...item, status: 'generating' } : item)
        );

        const generated = await generateLocationAngles(
          location.name,
          location.description,
          stylePrompt, // Use locked global style if available
          [angle], // Generate one at a time for progress tracking
          undefined // No reference image for script workflow
        );

        if (generated.length > 0) {
          angles.push(generated[0]);
        }

        // Update progress to complete
        setAngleGenerationProgress(prev =>
          prev.map((item, idx) => idx === i ? { ...item, status: 'complete' } : item)
        );
      }

      setGeneratedLocationAngles(angles);

      // 🎬 AUTO-CREATE LOCATION ENTITY with extracted data
      if (angles.length > 0) {
        const newLocation: Location = {
          id: `loc_${Date.now()}`,
          name: location.name,
          handle: location.handle, // Auto-filled from AI extraction
          visuals: location.description,
          referenceImages: angles.map(a => a.imageUrl),
          shotBank: {
            wide: angles.find(a => a.angle.toLowerCase().includes('wide'))?.imageUrl,
            medium: angles.find(a => a.angle.toLowerCase().includes('medium'))?.imageUrl,
            closeup: angles.find(a => a.angle.toLowerCase().includes('close'))?.imageUrl,
            isGenerating: false
          }
        };

        // Add to project locations
        onUpdateProject({
          ...currentProject,
          locations: [...currentProject.locations, newLocation]
        });

        alert(`✅ Location "${location.name}" created with ${angles.length} reference angles!`);
      }

    } catch (error) {
      console.error('Location angle generation failed:', error);
      alert(`Failed to generate location angles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingAngles(false);
    }
  };

  const handleLocationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLocationReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateFromImage = async () => {
    if (!locationReferenceImage || !locationName.trim()) {
      alert('Please upload an image and provide a location name.');
      return;
    }

    setGeneratingAngles(true);

    const defaultAngles = [
      'Wide establishing shot showing entire space',
      'Medium shot (character perspective)',
      'Close-up details (key features)',
      'Reverse angle (opposite view)',
      'Left side view',
      'Right side view',
      'Overhead layout view',
      'Different lighting variation'
    ];

    const progress = defaultAngles.map(angle => ({ angle, status: 'pending' as const }));
    setAngleGenerationProgress(progress);

    try {
      const angles: GeneratedLocationAngle[] = [];

      // 🔒 Build style prompt from global locked style analysis (if available)
      let stylePrompt = currentProject.worldLook;
      if (currentProject.styleAnalysis) {
        stylePrompt = `${currentProject.worldLook}

🔒 LOCKED GLOBAL STYLE (MANDATORY):
Visual Style: ${currentProject.styleAnalysis.commonStyle}
Lighting: ${currentProject.styleAnalysis.lighting}
Color Palette: ${currentProject.styleAnalysis.colors}
Materials/Textures: ${currentProject.styleAnalysis.materials}
Composition: ${currentProject.styleAnalysis.composition}

Style Summary: ${currentProject.styleAnalysis.summary}`;
      }

      for (let i = 0; i < defaultAngles.length; i++) {
        const angle = defaultAngles[i];

        setAngleGenerationProgress(prev =>
          prev.map((item, idx) => idx === i ? { ...item, status: 'generating' } : item)
        );

        const generated = await generateLocationAngles(
          locationName,
          locationDescription || 'Match the reference image style',
          stylePrompt, // Use locked global style if available
          [angle],
          locationReferenceImage
        );

        if (generated.length > 0) {
          angles.push(generated[0]);
        }

        setAngleGenerationProgress(prev =>
          prev.map((item, idx) => idx === i ? { ...item, status: 'complete' } : item)
        );
      }

      setGeneratedLocationAngles(angles);
    } catch (error) {
      console.error('Location generation from image failed:', error);
      alert(`Failed to generate location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingAngles(false);
    }
  };

  const handleGenerateFromDescription = async () => {
    if (!locationDescription.trim() || !locationName.trim()) {
      alert('Please provide both a location name and description.');
      return;
    }

    handleGenerateFromImage(); // Same logic, just without reference image
  };

  const handleRegenerateAngle = async (index: number) => {
    if (!currentLocationForGeneration && !locationName) return;

    const angleToRegenerate = generatedLocationAngles[index];
    if (!angleToRegenerate) return;

    setGeneratingAngles(true);

    try {
      const generated = await generateLocationAngles(
        currentLocationForGeneration?.name || locationName,
        currentLocationForGeneration?.description || locationDescription,
        currentProject.worldLook,
        [angleToRegenerate.angle],
        locationReferenceImage || undefined
      );

      if (generated.length > 0) {
        setGeneratedLocationAngles(prev =>
          prev.map((item, idx) => idx === index ? generated[0] : item)
        );
      }
    } catch (error) {
      console.error('Angle regeneration failed:', error);
      alert('Failed to regenerate angle.');
    } finally {
      setGeneratingAngles(false);
    }
  };

  const handleRemoveAngle = (index: number) => {
    setGeneratedLocationAngles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleApproveLocationAngles = () => {
    if (generatedLocationAngles.length === 0) {
      alert('No angles to approve.');
      return;
    }

    const finalLocationName = currentLocationForGeneration?.name || locationName;
    const finalHandle = currentLocationForGeneration?.handle ||
      `@${finalLocationName.replace(/[^a-zA-Z0-9]/g, '')}`;
    const finalDescription = currentLocationForGeneration?.description || locationDescription;

    const newLocation: Location = {
      id: `loc_${Date.now()}`,
      name: finalLocationName,
      handle: finalHandle,
      visuals: finalDescription,
      referenceImages: generatedLocationAngles.map(a => a.imageUrl)
    };

    const updatedLocations = [...currentProject.locations, newLocation];
    onUpdateProject({ ...currentProject, locations: updatedLocations });

    // Reset state
    setGeneratedLocationAngles([]);
    setCurrentLocationForGeneration(null);
    setLocationName('');
    setLocationDescription('');
    setLocationReferenceImage('');
    setScriptInput('');
    setExtractedLocations([]);
    setAngleGenerationProgress([]);

    alert(`✅ Location "${finalLocationName}" created with ${generatedLocationAngles.length} reference angles!`);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDropChar = (e: React.DragEvent, handle: string) => {
    e.preventDefault();
    const product = currentProject.characters.find(c => c.handle === handle);
    if (product && e.dataTransfer.files.length > 0) {
      onUploadMultipleImages(e.dataTransfer.files, product.id, 'product');
    }
  };

  const handleDropLoc = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      onUploadMultipleImages(e.dataTransfer.files, id, 'location');
    }
  };

  const handleDropModel = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      onUploadMultipleImages(e.dataTransfer.files, id, 'model');
    }
  };

  return (
    <div className="w-full h-full bg-nano-800 border-r border-gray-800 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-800 bg-nano-900 sticky top-0 z-10">
        <div className="flex items-center space-x-2 text-nano-accent mb-1">
          <BookOpen size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider">{isProductMode ? 'Brand Bible' : 'World Bible'}</h2>
        </div>
        <p className="text-xs text-gray-500">{isProductMode ? 'Assets & Guidelines' : 'Characters & Continuity'}</p>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Global Style Lab - ENHANCED WITH MULTI-UPLOAD & BATCH ANALYSIS */}
        <div className="space-y-3 bg-gradient-to-r from-pink-900/20 to-purple-900/20 p-4 rounded-lg border-2 border-pink-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-pink-400" />
              <div>
                <h3 className="text-sm font-bold text-pink-200">{isProductMode ? '🎨 Style Lab' : '🎨 Global Style'}</h3>
                <p className="text-[8px] text-gray-500">Lock in your visual aesthetic (up to 14 refs)</p>
              </div>
            </div>
            <label className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors">
              + Add References
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddMultipleStyleReferences(e.target.files);
                  }
                }}
              />
            </label>
          </div>

          {/* Style Reference Grid - ALWAYS VISIBLE */}
          {currentProject.styleReferences && currentProject.styleReferences.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {currentProject.styleReferences.map((ref, idx) => (
                  <div key={ref.id} className="relative aspect-square group">
                    <img
                      src={ref.imageUrl}
                      alt={`Style ${idx + 1}`}
                      className="w-full h-full object-cover rounded border-2 border-pink-500/30 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLightboxImage(ref.imageUrl)}
                    />
                    {ref.isAnalyzing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded">
                        <Loader2 size={16} className="animate-spin text-pink-400" />
                      </div>
                    )}
                    <button
                      onClick={() => onRemoveStyleReference(ref.id)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Batch Analyze Button */}
              {!currentProject.styleAnalysis && (
                <button
                  onClick={onAnalyzeBatchStyle}
                  disabled={currentProject.styleReferences.some(ref => ref.isAnalyzing)}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-[11px] uppercase transition-colors flex items-center justify-center gap-2"
                >
                  {currentProject.styleReferences.some(ref => ref.isAnalyzing) ? (
                    <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
                  ) : (
                    <>🔍 Analyze {currentProject.styleReferences.length} Style References</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Style Analysis Results - LOCKED INDICATOR */}
          {currentProject.styleAnalysis && (
            <div className="p-3 bg-green-900/20 border-2 border-green-500/40 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔒</span>
                <h4 className="font-bold text-green-300 text-sm uppercase">
                  Global Style Locked & Active
                </h4>
              </div>

              <div className="space-y-2 text-[10px]">
                <div>
                  <span className="font-bold text-gray-400">Style:</span>
                  <span className="ml-2 text-gray-200">{currentProject.styleAnalysis.commonStyle}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-400">Lighting:</span>
                  <span className="ml-2 text-gray-200">{currentProject.styleAnalysis.lighting}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-400">Colors:</span>
                  <span className="ml-2 text-gray-200">{currentProject.styleAnalysis.colors}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-400">Materials:</span>
                  <span className="ml-2 text-gray-200">{currentProject.styleAnalysis.materials}</span>
                </div>
              </div>

              <p className="mt-3 text-[9px] text-gray-400 italic leading-relaxed">
                {currentProject.styleAnalysis.summary}
              </p>

              <p className="mt-3 text-[9px] font-bold text-green-400">
                ✅ All generated images will automatically match this style
              </p>

              <button
                onClick={() => onUpdateProject({ ...currentProject, styleAnalysis: undefined })}
                className="mt-2 w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-[9px] font-bold transition-colors"
              >
                🔓 Unlock & Re-analyze
              </button>
            </div>
          )}

          {/* Empty State */}
          {(!currentProject.styleReferences || currentProject.styleReferences.length === 0) && (
            <div className="text-center py-6 text-gray-500">
              <p className="text-[10px] mb-1">No style references uploaded</p>
              <p className="text-[8px]">Upload 5-10 reference images to lock in your visual style</p>
            </div>
          )}

          <textarea
            value={currentProject.worldLook}
            onChange={(e) => onUpdateProject({ ...currentProject, worldLook: e.target.value })}
            className="w-full bg-black/30 border border-gray-700 rounded p-2 text-[10px] text-gray-300 focus:border-pink-500 focus:outline-none h-16 resize-y"
            placeholder={isProductMode ? "Additional manual style notes..." : "Additional style notes (optional)..."}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('chars')} className={clsx("flex-1 py-2 text-[10px] font-bold uppercase text-center border-b-2 transition-colors min-w-[50px]", activeTab === 'chars' ? "border-nano-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>
            {isProductMode ? 'Products' : 'Chars'}
          </button>
          {isProductMode && (
            <>
               <button onClick={() => setActiveTab('models')} className={clsx("flex-1 py-2 text-[10px] font-bold uppercase text-center border-b-2 transition-colors min-w-[50px]", activeTab === 'models' ? "border-nano-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>
               Models
               </button>
               <button onClick={() => setActiveTab('assets')} className={clsx("flex-1 py-2 text-[10px] font-bold uppercase text-center border-b-2 transition-colors min-w-[50px]", activeTab === 'assets' ? "border-nano-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>
               Assets
               </button>
            </>
          )}
          <button onClick={() => setActiveTab('locs')} className={clsx("flex-1 py-2 text-[10px] font-bold uppercase text-center border-b-2 transition-colors min-w-[50px]", activeTab === 'locs' ? "border-nano-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>
            Env
          </button>
          <button onClick={() => setActiveTab('gems')} className={clsx("flex-1 py-2 text-[10px] font-bold uppercase text-center border-b-2 transition-colors min-w-[50px]", activeTab === 'gems' ? "border-nano-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}>
            Team
          </button>
        </div>

        {/* Products / Characters */}
        {activeTab === 'chars' && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* Batch Operations (Product Mode Only) */}
            {isProductMode && onBatchApplyTemplate && onBatchGenerate && (
               <div className="bg-gray-900/50 p-3 rounded border border-gray-700 mb-4">
                  <div className="flex items-center gap-2 text-nano-accent mb-2">
                     <Layers size={14} />
                     <h3 className="text-xs font-bold uppercase">Batch Operations</h3>
                  </div>
                  
                  <div className="space-y-2">
                     {/* Template Select */}
                     <select 
                        value={selectedTemplateId} 
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full bg-black/30 border border-gray-600 rounded text-[10px] p-1.5 text-white focus:border-nano-accent focus:outline-none"
                     >
                        <option value="">Select Template...</option>
                        <option value={GOLF_APPAREL_TEMPLATE.id}>⛳ Golf Apparel Hero (7 shots)</option>
                        <option value={FOOTWEAR_TEMPLATE.id}>👟 Footwear Launch (5 shots)</option>
                        <option value={ACCESSORIES_TEMPLATE.id}>🧢 Accessories (5 shots)</option>
                        <option value={SEASONAL_CAMPAIGN_TEMPLATE.id}>📅 Seasonal Campaign (12 shots)</option>
                     </select>
                     
                     <button 
                        onClick={handleApplyTemplate}
                        disabled={!selectedTemplateId || selectedProducts.length === 0}
                        className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold py-1.5 rounded transition-colors"
                     >
                        Apply to {selectedProducts.length} Selected
                     </button>
                     
                     <button
                        onClick={onBatchGenerate}
                        disabled={isBatchGenerating}
                        className="w-full bg-nano-accent hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-wait text-black text-[10px] font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
                     >
                        {isBatchGenerating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        {isBatchGenerating ? 'Processing...' : 'Generate All Shots'}
                     </button>

                     <button
                        onClick={() => setShowAngleGenerator(true)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
                     >
                        <Camera size={12} />
                        Generate from Angles
                     </button>
                     
                     {/* Batch Progress Bar */}
                     {isBatchGenerating && batchProgress && (
                        <div className="space-y-1 pt-1">
                           <div className="flex justify-between text-[9px] text-gray-400">
                              <span>Generating...</span>
                              <span>{batchProgress.current} / {batchProgress.total}</span>
                           </div>
                           <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                 className="h-full bg-nano-accent transition-all duration-300 ease-out" 
                                 style={{ width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%` }}
                              />
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {currentProject.characters.map((char) => {
              const imageCount = char.referenceImages?.length || 0;
              const isLocked = char.locked || false;
              const isProfileExpanded = expandedProfiles.has(char.id);

              return (
              <div
                key={char.id}
                className={clsx(
                  "group rounded-lg p-3 border transition-colors",
                  isLocked
                    ? "bg-amber-900/10 border-amber-500/30 hover:border-amber-500/50"
                    : "bg-gray-900/30 border-gray-800 hover:border-gray-600"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropChar(e, char.handle)}
              >
                {/* Header with Lock Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    {/* Checkbox for Batch (Product Mode) */}
                    {isProductMode && (
                       <input
                          type="checkbox"
                          checked={selectedProducts.includes(char.id)}
                          onChange={() => toggleProductSelection(char.id)}
                          className="rounded border-gray-600 bg-black/30 text-nano-accent focus:ring-0"
                       />
                    )}

                    {/* Lock Indicator Badge */}
                    {isLocked && (
                      <div className="flex-shrink-0 bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Lock size={10} className="text-amber-400" />
                        <span className="text-[8px] text-amber-300 font-bold uppercase">Master</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                       <input
                         value={char.name}
                         onChange={(e) => updateCharacter(char.id, 'name', e.target.value)}
                         className="bg-transparent text-sm font-bold text-gray-200 w-full border-b border-transparent hover:border-gray-700 focus:border-nano-accent focus:outline-none px-1"
                       />
                       <div className="flex items-center gap-2">
                         {/* Editable Handle */}
                         <div className="flex items-center bg-nano-900/50 rounded px-2 py-0.5 border border-transparent hover:border-nano-accent/30 focus-within:border-nano-accent">
                           <span className="text-xs text-nano-accent opacity-70">@</span>
                           <input
                             value={char.handle?.replace('@', '') || ''}
                             onChange={(e) => {
                               const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                               updateCharacter(char.id, 'handle', `@${sanitized}`);
                             }}
                             className="bg-transparent text-xs font-mono text-nano-accent opacity-70 outline-none border-none w-20 px-1"
                             placeholder="handle"
                           />
                         </div>
                         {/* Editable SKU for Products */}
                         {isProductMode && (
                           <input
                             value={(char as any).sku || ''}
                             onChange={(e) => updateCharacter(char.id, 'sku', e.target.value.toUpperCase())}
                             className="text-[9px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded outline-none border border-transparent hover:border-blue-500 focus:border-blue-400 w-28"
                             placeholder="UA-1234-NAVY"
                           />
                         )}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                   <input value={char.role} onChange={(e) => updateCharacter(char.id, 'role', e.target.value)} className="w-full bg-black/20 border border-transparent rounded px-2 py-1 text-[10px] text-gray-400 focus:border-gray-600" placeholder="Role..." />
                   <textarea value={char.visuals} onChange={(e) => updateCharacter(char.id, 'visuals', e.target.value)} className="w-full bg-black/20 border border-transparent rounded px-2 py-1 text-[10px] text-gray-400 focus:border-gray-600 h-16 resize-none" placeholder="Visual Description..." />
                   
                   {/* Tech Specs for Products */}
                   {isProductMode && (
                      <textarea 
                         value={(char as Product).techSpecs || ''} 
                         onChange={(e) => updateCharacter(char.id, 'techSpecs', e.target.value)} 
                         className="w-full bg-blue-900/10 border border-blue-900/30 rounded px-2 py-1 text-[10px] text-blue-200 focus:border-blue-500 h-12 resize-none" 
                         placeholder="Technical Specs (e.g. Gore-Tex, Matte Finish)..." 
                      />
                   )}

                   <div className="flex justify-between items-center gap-2">
                      <button onClick={() => onGenerateReference('char', char.id, char.visuals)} className="text-[9px] flex items-center gap-1 text-nano-accent hover:text-white bg-gray-800 px-2 py-1 rounded"><Wand2 size={10}/> Auto-Visualize</button>
                      {isProductMode && (
                        <button
                          onClick={() => setTestingProduct(char.id)}
                          className="text-[9px] flex items-center gap-1 text-purple-400 hover:text-white bg-gray-800 px-2 py-1 rounded"
                        >
                          <TestTube size={10}/> Test References
                        </button>
                      )}
                   </div>
                </div>

                {/* Reference Images with 14-image limit indicator */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-gray-500 uppercase font-bold">Reference Images</span>
                    <div className={clsx(
                      "text-[9px] font-mono",
                      imageCount >= 14 ? "text-red-400" :
                      imageCount >= 12 ? "text-yellow-400" :
                      "text-gray-500"
                    )}>
                      {imageCount} / 14 {imageCount >= 14 && "(Max)"}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {(char.referenceImages || []).map((img, i) => (
                      <div key={i} className="relative aspect-square rounded overflow-hidden border border-gray-700 group/img">
                        <img
                          src={img}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxImage(img)}
                        />
                        <button
                          onClick={() => deleteCharacterImage(char.handle, i)}
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                          <X size={10}/>
                        </button>
                      </div>
                    ))}
                    {/* Single ref legacy support */}
                    {char.referenceImage && !(char.referenceImages?.includes(char.referenceImage)) && (
                       <div className="relative aspect-square rounded overflow-hidden border border-gray-700">
                          <img src={char.referenceImage} className="w-full h-full object-cover" />
                       </div>
                    )}
                    {/* Upload button - disabled at 14 images */}
                    {imageCount < 14 && (
                      <label
                        className="aspect-square rounded border border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-600 hover:text-cyan-400 hover:border-cyan-500 cursor-pointer bg-black/20 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          onUploadMultipleImages(e.dataTransfer.files, char.id, 'product');
                        }}
                      >
                        <Upload size={12} />
                        <span className="text-[8px] mt-1">Drop or Click</span>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleCharFileChange(char.handle, e)} />
                      </label>
                    )}
                  </div>
                </div>

                {/* AI Coverage Analysis & Reference Generation (Narrative Mode Only) */}
                {!isProductMode && imageCount > 0 && (
                  <div className="mb-3 border border-cyan-500/30 rounded bg-cyan-900/10 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-cyan-400" />
                        <span className="text-[9px] font-bold text-cyan-300 uppercase">AI Reference Assistant</span>
                      </div>
                      {analyzingCharacter === char.id ? (
                        <Loader2 size={10} className="animate-spin text-cyan-400" />
                      ) : (
                        <button
                          onClick={() => handleAnalyzeCoverage(char.id)}
                          className="text-[8px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded transition-colors"
                        >
                          Analyze Coverage
                        </button>
                      )}
                    </div>

                    {/* Analysis Results */}
                    {analysisResults[char.id] && (
                      <div className="space-y-2">
                        {/* Coverage Quality Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-gray-500">Coverage Quality:</span>
                          <div className={clsx(
                            "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                            analysisResults[char.id].confidence === 'high' && "bg-green-500/20 text-green-400 border border-green-500/30",
                            analysisResults[char.id].confidence === 'medium' && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
                            analysisResults[char.id].confidence === 'low' && "bg-red-500/20 text-red-400 border border-red-500/30"
                          )}>
                            {analysisResults[char.id].confidence}
                          </div>
                        </div>

                        {/* Existing Views */}
                        {analysisResults[char.id].existingViews.length > 0 && (
                          <div>
                            <span className="text-[8px] text-gray-500 block mb-1">✓ Covered Views:</span>
                            <div className="flex flex-wrap gap-1">
                              {analysisResults[char.id].existingViews.map((view, idx) => (
                                <div key={idx} className="bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5 text-[7px] text-green-400">
                                  {view}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Views */}
                        {analysisResults[char.id].missingViews.length > 0 && (
                          <div>
                            <span className="text-[8px] text-gray-500 block mb-1">⚠ Missing Views (Click to generate):</span>
                            <div className="flex flex-wrap gap-1">
                              {analysisResults[char.id].missingViews.map((view, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔘 Button clicked:', view);
                                    handleGenerateMissingReference(char.id, view);
                                  }}
                                  disabled={generatingReference === char.id}
                                  className={clsx(
                                    "bg-red-500/20 border-2 border-red-500/40 rounded px-2 py-1 text-[8px] font-bold text-red-300 hover:bg-red-500/30 hover:border-red-500/60 transition-all cursor-pointer",
                                    generatingReference === char.id && "opacity-50 cursor-not-allowed"
                                  )}
                                  style={{ pointerEvents: generatingReference === char.id ? 'none' : 'auto' }}
                                >
                                  {generatingReference === char.id ? '⏳' : '➕'} {view}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendation */}
                        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded p-1.5">
                          <p className="text-[8px] text-cyan-300 leading-relaxed">
                            💡 {analysisResults[char.id].recommendation}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No Analysis Yet */}
                    {!analysisResults[char.id] && !analyzingCharacter && (
                      <p className="text-[8px] text-gray-500 italic">
                        Click "Analyze Coverage" to check what reference angles are missing for {char.name}.
                      </p>
                    )}
                  </div>
                )}

                {/* Lock Master Character Toggle (Narrative Mode Only) */}
                {!isProductMode && (
                  <label className={clsx(
                    "flex items-center gap-2 p-2 rounded cursor-pointer mb-2 transition-colors",
                    isLocked
                      ? "bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15"
                      : "bg-gray-800/50 border border-gray-700 hover:bg-gray-800/70"
                  )}>
                    <input
                      type="checkbox"
                      checked={isLocked}
                      onChange={(e) => updateCharacter(char.id, 'locked', e.target.checked)}
                      className="rounded border-gray-600 bg-black/30 text-amber-500 focus:ring-0"
                    />
                    <div className="flex items-center gap-1.5 flex-1">
                      {isLocked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-gray-500" />}
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-gray-200">
                          {isLocked ? "🔒 Locked Master Character" : "Lock as Master Character"}
                        </div>
                        <div className="text-[8px] text-gray-500">
                          {isLocked ? "Protected from deletion" : "Preserve across projects"}
                        </div>
                      </div>
                    </div>
                  </label>
                )}

                {/* Master Character Profile Editor (Expandable) */}
                {!isProductMode && (
                  <div className="border-t border-gray-800 pt-2">
                    <button
                      onClick={() => toggleProfileExpanded(char.id)}
                      className="w-full flex items-center justify-between text-[10px] font-bold text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <span className="flex items-center gap-1">
                        {isProfileExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Master Character Profile
                      </span>
                      <span className="text-[8px] text-gray-600">
                        {char.profile ? "✓ Set" : "Not set"}
                      </span>
                    </button>

                    {isProfileExpanded && (
                      <div className="mt-2 space-y-2 bg-black/20 p-2 rounded border border-gray-700">
                        <div>
                          <label className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Physical Description</label>
                          <textarea
                            value={char.profile?.physicalDescription || ''}
                            onChange={(e) => updateCharacterProfile(char.id, { physicalDescription: e.target.value })}
                            className="w-full bg-black/30 border border-gray-700 rounded p-1.5 text-[9px] text-gray-300 focus:border-amber-500 focus:outline-none h-20 resize-none font-mono"
                            placeholder="Detailed facial features, hair, body type..."
                          />
                        </div>

                        <div>
                          <label className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Style & Aesthetic</label>
                          <textarea
                            value={char.profile?.style || ''}
                            onChange={(e) => updateCharacterProfile(char.id, { style: e.target.value })}
                            className="w-full bg-black/30 border border-gray-700 rounded p-1.5 text-[9px] text-gray-300 focus:border-amber-500 focus:outline-none h-16 resize-none font-mono"
                            placeholder="e.g., Pixar/Fortnite-cinematic stylisation..."
                          />
                        </div>

                        <div>
                          <label className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Default Backdrop</label>
                          <input
                            type="text"
                            value={char.profile?.backdrop || ''}
                            onChange={(e) => updateCharacterProfile(char.id, { backdrop: e.target.value })}
                            className="w-full bg-black/30 border border-gray-700 rounded p-1.5 text-[9px] text-gray-300 focus:border-amber-500 focus:outline-none font-mono"
                            placeholder="e.g., Flat bright pink background, soft shadows"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] text-gray-500 uppercase font-bold block mb-1">
                              Expression Range (Examples)
                            </label>
                            <textarea
                              value={char.profile?.expressions?.join(', ') || ''}
                              onChange={(e) => updateCharacterProfile(char.id, { expressions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              className="w-full bg-black/30 border border-gray-700 rounded p-1.5 text-[9px] text-gray-300 focus:border-amber-500 focus:outline-none h-16 resize-none font-mono"
                              placeholder="happy, sad, angry (examples, not constraints)"
                            />
                            <p className="text-[7px] text-gray-600 mt-0.5">Script directions override these</p>
                          </div>
                          <div>
                            <label className="text-[8px] text-gray-500 uppercase font-bold block mb-1">
                              Posture Style (Examples)
                            </label>
                            <textarea
                              value={char.profile?.poses?.join(', ') || ''}
                              onChange={(e) => updateCharacterProfile(char.id, { poses: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              className="w-full bg-black/30 border border-gray-700 rounded p-1.5 text-[9px] text-gray-300 focus:border-amber-500 focus:outline-none h-16 resize-none font-mono"
                              placeholder="relaxed, confident (style, not required poses)"
                            />
                            <p className="text-[7px] text-gray-600 mt-0.5">Script directions override these</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            <button
              onClick={() => {
                const newChar = {
                  id: `c_${Date.now()}`,
                  name: 'New',
                  handle: '@new',
                  role: 'Extra',
                  traits: [],
                  visuals: 'Desc',
                  referenceImages: []
                };
                onUpdateProject({ ...currentProject, characters: [...currentProject.characters, newChar] });
              }}
              className="w-full py-2 border border-dashed border-gray-700 text-gray-500 text-xs rounded hover:border-nano-accent hover:text-nano-accent transition-colors flex items-center justify-center gap-2"
            >
               <Plus size={14} /> Add {isProductMode ? 'Product' : 'Character'}
            </button>
          </div>
        )}

        {/* Models (Product Mode Only) */}
        {activeTab === 'models' && currentProject.models && (
           <div className="space-y-6 animate-in fade-in">
              {(currentProject.models || []).map(model => (
                 <div key={model.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700" onDragOver={handleDragOver} onDrop={(e) => handleDropModel(e, model.id)}>

                    {/* Header with Checkbox Lock */}
                    <div className="flex items-center gap-3 mb-3">
                       {/* Lock Checkbox */}
                       <div className={`
                          w-8 h-8 rounded border-2 flex items-center justify-center
                          ${model.referenceImages?.length > 0 && model.handle
                             ? 'bg-pink-500 border-pink-500'
                             : 'bg-gray-700 border-gray-600'
                          }
                       `}>
                          {model.referenceImages?.length > 0 && model.handle && (
                             <Check className="w-5 h-5 text-white" />
                          )}
                       </div>

                       {/* Model Name */}
                       <div className="flex-1">
                          <input
                             type="text"
                             value={model.name}
                             onChange={(e) => updateModel(model.id, 'name', e.target.value)}
                             className="text-xl font-bold bg-transparent outline-none w-full border-b border-transparent hover:border-gray-600 focus:border-pink-500"
                             placeholder="Model Name"
                          />
                       </div>
                    </div>

                    {/* @Handle + Badge */}
                    <div className="flex items-center gap-2 mb-4">
                       <div className="flex items-center gap-1 text-pink-400">
                          <User className="w-4 h-4" />
                          <span>@</span>
                          <input
                             type="text"
                             value={model.handle?.replace('@', '') || ''}
                             onChange={(e) => {
                                const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                                updateModel(model.id, 'handle', `@${sanitized}`);
                             }}
                             className="bg-transparent outline-none text-pink-400"
                             placeholder="model_athletic"
                          />
                       </div>

                       {/* Badge (like MODEL-SAM) */}
                       <input
                          type="text"
                          value={(model as any).sku || ''}
                          onChange={(e) => updateModel(model.id, 'sku', e.target.value.toUpperCase())}
                          className="bg-pink-600 text-white px-3 py-1 rounded outline-none uppercase text-sm"
                          placeholder="MODEL-CODE"
                       />
                    </div>

                    {/* Category */}
                    <div className="text-sm text-gray-400 mb-4">Fashion Model</div>

                    {/* Description */}
                    <textarea
                       value={model.visuals}
                       onChange={(e) => updateModel(model.id, 'visuals', e.target.value)}
                       className="w-full bg-transparent border border-gray-700 rounded p-2 text-sm outline-none focus:border-pink-500 mb-4"
                       rows={3}
                       placeholder="Physical appearance..."
                    />

                    {/* Reference Images */}
                    <div className="mb-4">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Reference Images</span>
                          <button onClick={() => onGenerateReference('model', model.id, model.visuals)} className="text-[9px] flex items-center gap-1 text-pink-400 hover:text-white bg-gray-900 px-2 py-1 rounded">
                             <Wand2 size={10}/> Generate 6-Shot Portfolio
                          </button>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                          {(model.referenceImages || []).map((img, i) => (
                             <div key={i} className="relative aspect-[3/4] rounded overflow-hidden border border-gray-700 group/img">
                                <img
                                  src={img}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setLightboxImage(img)}
                                />
                                <button onClick={() => deleteModelImage(model.id, i)} className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-bl">
                                   <X size={12}/>
                                </button>
                             </div>
                          ))}
                          <label
                             className="aspect-[3/4] border-2 border-dashed border-gray-700 rounded flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors"
                             onDragOver={(e) => e.preventDefault()}
                             onDrop={(e) => {
                                e.preventDefault();
                                onUploadMultipleImages(e.dataTransfer.files, model.id, 'model');
                             }}
                          >
                             <div className="text-center pointer-events-none">
                                <Upload className="w-6 h-6 mx-auto mb-1 text-gray-600" />
                                <span className="text-xs text-gray-500">Drop or Click</span>
                             </div>
                             <input type="file" accept="image/*" multiple onChange={(e) => handleModelFileChange(model.id, e)} className="hidden" />
                          </label>
                       </div>
                    </div>

                    {/* Lock Status Indicator */}
                    <div className="p-2 bg-gray-900/50 rounded text-xs text-center">
                       {model.referenceImages?.length > 0 && model.handle ? (
                          <span className="text-green-400">✓ Locked - Ready to use in prompts</span>
                       ) : (
                          <span className="text-yellow-400">⚠️ Add @handle and reference images to lock</span>
                       )}
                    </div>
                 </div>
              ))}
              <button
                onClick={() => {
                  const newModel: Model = {
                    id: `m_${Date.now()}`,
                    name: 'New Model',
                    handle: `@model_${Date.now()}`,
                    visuals: 'Desc',
                    type: 'ai_generated',
                    referenceImages: []
                  };
                  onUpdateProject({ ...currentProject, models: [...(currentProject.models || []), newModel] });
                }}
                className="w-full py-2 border border-dashed border-gray-700 text-gray-500 text-xs rounded hover:border-pink-500 hover:text-pink-400 transition-colors flex items-center justify-center gap-2">
                 <Plus size={14} /> Add New Model
              </button>
           </div>
        )}
        
        {/* Brand Assets (Product Mode Only) */}
        {activeTab === 'assets' && (
           <div className="space-y-6 animate-in fade-in">
               <p className="text-[10px] text-gray-400">Upload logos and graphics to use as overlays.</p>
               <div className="grid grid-cols-2 gap-2">
                  {(currentProject.brandAssets || []).map(asset => (
                     <div key={asset.id} className="bg-gray-900 border border-gray-800 rounded p-2 flex flex-col items-center relative group">
                        <img src={asset.url} className="h-16 object-contain mb-2" />
                        <span className="text-[9px] text-gray-500 truncate w-full text-center">{asset.name}</span>
                        <button onClick={() => onDeleteBrandAsset && onDeleteBrandAsset(asset.id)} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                     </div>
                  ))}
                  <label className="aspect-square bg-black/20 border border-dashed border-gray-700 rounded flex flex-col items-center justify-center cursor-pointer hover:border-nano-accent transition-colors text-gray-500 hover:text-white">
                     <Upload size={16} className="mb-1" />
                     <span className="text-[9px]">Upload Logo</span>
                     <input type="file" className="hidden" accept="image/*" onChange={handleAssetUpload} />
                  </label>
                  
                  {isDriveEnabled && (
                     <button 
                        onClick={() => handleDrivePick((url) => onAddBrandAsset && onAddBrandAsset({ id: `a_${Date.now()}`, name: 'Drive Asset', type: 'logo', url }))}
                        className="aspect-square bg-black/20 border border-dashed border-gray-700 rounded flex flex-col items-center justify-center cursor-pointer hover:border-nano-accent transition-colors text-gray-500 hover:text-white"
                     >
                        <Cloud size={16} className="mb-1" />
                        <span className="text-[9px]">From Drive</span>
                     </button>
                  )}
               </div>
           </div>
        )}

        {/* Locations */}
        {activeTab === 'locs' && (
          <div className="space-y-4 animate-in fade-in">

            {/* Info Panel */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-200 space-y-1">
                  <p className="font-bold">Shooting Locations Guide:</p>
                  <p>• Create multiple shooting environments</p>
                  <p>• Add @handle + 3-8 reference images to lock</p>
                  <p>• Use @location_name in prompts to trigger references</p>
                </div>
              </div>
            </div>

            {/* AI Location Setup Panel */}
            {!isProductMode && (
              <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-2 border-cyan-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={20} className="text-cyan-400" />
                  <h3 className="text-base font-bold text-cyan-200">🏢 AI Location Setup</h3>
                </div>

                {/* Workflow Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setLocationWorkflow('script')}
                    className={clsx(
                      "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors",
                      locationWorkflow === 'script'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-cyan-400 border border-cyan-700/50 hover:bg-cyan-900/30'
                    )}
                  >
                    📝 From Script
                  </button>
                  <button
                    onClick={() => setLocationWorkflow('image')}
                    className={clsx(
                      "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors",
                      locationWorkflow === 'image'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-cyan-400 border border-cyan-700/50 hover:bg-cyan-900/30'
                    )}
                  >
                    📷 From Image
                  </button>
                  <button
                    onClick={() => setLocationWorkflow('description')}
                    className={clsx(
                      "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors",
                      locationWorkflow === 'description'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-cyan-400 border border-cyan-700/50 hover:bg-cyan-900/30'
                    )}
                  >
                    ✍️ From Text
                  </button>
                </div>

                {/* Workflow A: Script Analysis */}
                {locationWorkflow === 'script' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-300 mb-1.5 uppercase">
                        Paste your script or scene description
                      </label>
                      <textarea
                        value={scriptInput}
                        onChange={(e) => setScriptInput(e.target.value)}
                        className="w-full h-24 px-2 py-1.5 bg-black/40 border border-cyan-700/50 rounded text-[10px] text-gray-300 font-mono focus:border-cyan-500 focus:outline-none resize-none"
                        placeholder="INT. THE HUB - DAY&#10;The room is a mix of high-tech lab and cozy living space. To the LEFT, a sleek kitchen island. To the RIGHT, a massive computer terminal..."
                      />
                    </div>
                    <button
                      onClick={handleAnalyzeScript}
                      disabled={analyzingScript || !scriptInput.trim()}
                      className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-[11px] uppercase transition-colors flex items-center justify-center gap-2"
                    >
                      {analyzingScript ? (
                        <><Loader2 size={14} className="animate-spin" /> Analyzing Script...</>
                      ) : (
                        <>🔍 Extract Locations from Script</>
                      )}
                    </button>

                    {/* Extracted Locations */}
                    {extractedLocations.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="text-[11px] font-bold text-green-300 uppercase">
                          ✅ AI Detected {extractedLocations.length} Location{extractedLocations.length !== 1 ? 's' : ''}:
                        </h4>
                        {extractedLocations.map((loc, idx) => (
                          <div key={idx} className="p-3 bg-black/40 border border-cyan-700/30 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h5 className="text-sm font-bold text-white">{loc.name}</h5>
                                <p className="text-[9px] text-cyan-400 font-mono">{loc.handle}</p>
                              </div>
                              <button
                                onClick={() => handleGenerateLocationAngles(loc)}
                                disabled={generatingAngles}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-[10px] font-bold uppercase transition-colors"
                              >
                                ✨ Generate
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-300 mb-2">{loc.description}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {loc.keyAreas.map((area, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[8px] rounded border border-cyan-500/30">
                                  {area}
                                </span>
                              ))}
                            </div>
                            <details className="text-[9px] text-gray-500">
                              <summary className="cursor-pointer font-bold hover:text-cyan-400 transition-colors">
                                Suggested Angles ({loc.suggestedAngles.length})
                              </summary>
                              <ul className="mt-1.5 space-y-0.5 pl-3">
                                {loc.suggestedAngles.map((angle, i) => (
                                  <li key={i}>• {angle}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Workflow B: From Image */}
                {locationWorkflow === 'image' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-300 mb-1.5 uppercase">
                        Upload 1 Reference Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLocationImageUpload}
                        className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                      />
                      {locationReferenceImage && (
                        <img
                          src={locationReferenceImage}
                          alt="Reference"
                          className="mt-2 w-full h-32 object-cover rounded-lg border border-cyan-500/50 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxImage(locationReferenceImage)}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-300 mb-1.5 uppercase">
                        Location Name
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        className="w-full px-2 py-1.5 bg-black/40 border border-cyan-700/50 rounded text-[10px] text-gray-300 focus:border-cyan-500 focus:outline-none"
                        placeholder="The Hub"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-300 mb-1.5 uppercase">
                        Brief Description (optional)
                      </label>
                      <textarea
                        value={locationDescription}
                        onChange={(e) => setLocationDescription(e.target.value)}
                        className="w-full h-16 px-2 py-1.5 bg-black/40 border border-cyan-700/50 rounded text-[10px] text-gray-300 focus:border-cyan-500 focus:outline-none resize-none"
                        placeholder="High-tech lab mixed with cozy living space..."
                      />
                    </div>
                    <button
                      onClick={handleGenerateFromImage}
                      disabled={!locationReferenceImage || !locationName.trim() || generatingAngles}
                      className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-[11px] uppercase transition-colors"
                    >
                      {generatingAngles ? '🔄 Generating 8 Angles...' : '✨ Generate Multiple Angles from This Image'}
                    </button>
                  </div>
                )}

                {/* Workflow C: From Text Description */}
                {locationWorkflow === 'description' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-300 mb-1.5 uppercase">
                        Describe your location in detail
                      </label>
                      <textarea
                        value={locationDescription}
                        onChange={(e) => setLocationDescription(e.target.value)}
                        className="w-full h-24 px-2 py-1.5 bg-black/40 border border-cyan-700/50 rounded text-[10px] text-gray-300 focus:border-cyan-500 focus:outline-none resize-none font-mono"
                        placeholder="A hybrid room combining a high-tech laboratory with a cozy living space. On the left is a sleek modern kitchen island with stainless steel appliances. On the right stands a massive curved computer terminal with multiple holographic displays..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-300 mb-1.5 uppercase">
                        Location Name
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        className="w-full px-2 py-1.5 bg-black/40 border border-cyan-700/50 rounded text-[10px] text-gray-300 focus:border-cyan-500 focus:outline-none"
                        placeholder="The Hub"
                      />
                    </div>
                    <button
                      onClick={handleGenerateFromDescription}
                      disabled={!locationDescription.trim() || !locationName.trim() || generatingAngles}
                      className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-[11px] uppercase transition-colors"
                    >
                      {generatingAngles ? '🔄 Generating Location...' : '✨ Generate Location from Description'}
                    </button>
                  </div>
                )}

                {/* Generation Progress */}
                {generatingAngles && angleGenerationProgress.length > 0 && (
                  <div className="mt-4 p-3 bg-black/40 border border-cyan-500/30 rounded-lg">
                    <p className="text-[10px] font-bold text-cyan-300 mb-2 uppercase">
                      Generating location reference angles...
                    </p>
                    <div className="space-y-1.5">
                      {angleGenerationProgress.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[9px]">
                          {item.status === 'complete' && <span className="text-green-400 text-sm">✓</span>}
                          {item.status === 'generating' && <Loader2 size={12} className="animate-spin text-cyan-400" />}
                          {item.status === 'pending' && <span className="text-gray-600 text-sm">○</span>}
                          <span className={item.status === 'complete' ? 'text-green-300' : item.status === 'generating' ? 'text-cyan-300' : 'text-gray-500'}>
                            {item.angle}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Angles Review */}
                {generatedLocationAngles.length > 0 && !generatingAngles && (
                  <div className="mt-4 p-3 bg-green-900/20 border-2 border-green-500/40 rounded-lg">
                    <h4 className="text-[11px] font-bold text-green-300 mb-3 uppercase">
                      ✨ Generated {generatedLocationAngles.length} Reference Angles (Review & Approve)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {generatedLocationAngles.map((angle, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={angle.imageUrl}
                            alt={angle.angle}
                            className="w-full aspect-video object-cover rounded border-2 border-cyan-500/50 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(angle.imageUrl)}
                          />
                          <div className="absolute top-1 left-1 bg-cyan-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">
                            {angle.angle.substring(0, 20)}...
                          </div>
                          <div className="mt-1 flex gap-1">
                            <button
                              onClick={() => handleRegenerateAngle(idx)}
                              disabled={generatingAngles}
                              className="flex-1 px-1.5 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-[8px] rounded font-bold transition-colors"
                            >
                              🔄 Regen
                            </button>
                            <button
                              onClick={() => handleRemoveAngle(idx)}
                              className="px-1.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[8px] rounded font-bold transition-colors"
                            >
                              ✗
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleApproveLocationAngles}
                      className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-[11px] uppercase transition-colors"
                    >
                      ✅ Approve & Create Location with {generatedLocationAngles.length} References
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Existing Locations */}
            {currentProject.locations.map((loc) => {
              const imageCount = loc.referenceImages?.length || 0;
              const isLocked = imageCount > 0 && !!loc.handle;
              const qualityLevel = imageCount >= 8 ? 'excellent' : imageCount >= 5 ? 'good' : imageCount >= 3 ? 'fair' : 'low';

              return (
                <div
                  key={loc.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropLoc(e, loc.id)}
                >
                  {/* Header with Lock and Delete */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* Lock Indicator */}
                    <div className={`
                      w-8 h-8 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${isLocked ? 'bg-green-500 border-green-500' : 'bg-gray-700 border-gray-600'}
                    `}>
                      {isLocked && <Check className="w-5 h-5 text-white" />}
                    </div>

                    {/* Location Name */}
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => {
                        const updatedLocations = currentProject.locations.map(l =>
                          l.id === loc.id ? { ...l, name: e.target.value } : l
                        );
                        onUpdateProject({ ...currentProject, locations: updatedLocations });
                      }}
                      className="flex-1 text-lg font-bold bg-transparent outline-none border-b border-transparent hover:border-gray-600 focus:border-green-500"
                      placeholder="Location Name"
                    />

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${loc.name}"?`)) {
                          const updatedLocations = currentProject.locations.filter(l => l.id !== loc.id);
                          onUpdateProject({ ...currentProject, locations: updatedLocations });
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* @Handle */}
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">@</span>
                    <input
                      type="text"
                      value={loc.handle?.replace('@', '') || ''}
                      onChange={(e) => {
                        const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        const updatedLocations = currentProject.locations.map(l =>
                          l.id === loc.id ? { ...l, handle: `@${sanitized}` } : l
                        );
                        onUpdateProject({ ...currentProject, locations: updatedLocations });
                      }}
                      className="bg-transparent outline-none text-green-400 text-sm"
                      placeholder="location_handle"
                    />
                  </div>

                  {/* Description */}
                  <textarea
                    value={loc.visuals}
                    onChange={(e) => {
                      const updatedLocations = currentProject.locations.map(l =>
                        l.id === loc.id ? { ...l, visuals: e.target.value } : l
                      );
                      onUpdateProject({ ...currentProject, locations: updatedLocations });
                    }}
                    className="w-full bg-black/30 border border-gray-700 rounded p-2 text-xs outline-none focus:border-green-500 mb-3"
                    rows={2}
                    placeholder="Describe the environment and mood..."
                  />

                  {/* Reference Images */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Reference Images ({imageCount})</span>
                      {/* Quality Indicator */}
                      <div className="flex items-center gap-1">
                        {qualityLevel === 'excellent' && (
                          <span className="text-[10px] text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Excellent
                          </span>
                        )}
                        {qualityLevel === 'good' && (
                          <span className="text-[10px] text-cyan-400">Good</span>
                        )}
                        {qualityLevel === 'fair' && (
                          <span className="text-[10px] text-yellow-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Fair (add 2+ more)
                          </span>
                        )}
                        {qualityLevel === 'low' && (
                          <span className="text-[10px] text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low (add 3+)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(loc.referenceImages || []).map((img, i) => (
                        <div key={i} className="relative aspect-video rounded overflow-hidden border border-gray-700 group/img">
                          <img
                            src={img}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(img)}
                          />
                          <button
                            onClick={() => {
                              const updatedLocations = currentProject.locations.map(l =>
                                l.id === loc.id
                                  ? { ...l, referenceImages: l.referenceImages?.filter((_, idx) => idx !== i) }
                                  : l
                              );
                              onUpdateProject({ ...currentProject, locations: updatedLocations });
                            }}
                            className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-bl"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}

                      {/* Upload Button */}
                      <label
                        className="aspect-video border-2 border-dashed border-gray-700 rounded flex items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-500/5 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          onUploadMultipleImages(e.dataTransfer.files, loc.id, 'location');
                        }}
                      >
                        <div className="text-center pointer-events-none">
                          <Upload className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                          <span className="text-[10px] text-gray-500">Add Images</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleLocFileChange(loc.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Lock Status */}
                  <div className={`
                    p-2 rounded text-xs text-center
                    ${isLocked ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}
                  `}>
                    {isLocked ? (
                      <span>✓ Locked - Ready for prompts</span>
                    ) : (
                      <span>⚠️ Add @handle + {3 - imageCount} more image(s) to lock</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add New Location Button */}
            <button
              onClick={() => {
                const newLocation: Location = {
                  id: `loc_${Date.now()}`,
                  name: 'New Location',
                  handle: `@location_${Date.now()}`,
                  visuals: '',
                  referenceImages: []
                };
                onUpdateProject({
                  ...currentProject,
                  locations: [...currentProject.locations, newLocation]
                });
              }}
              className="w-full p-6 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center gap-2 text-gray-500 hover:text-white hover:border-green-500 hover:bg-green-500/5 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add New Location</span>
            </button>
          </div>
        )}

        {/* Gems */}
        {activeTab === 'gems' && (
          <div className="space-y-6 animate-in fade-in">
             <p className="text-[10px] text-gray-400 mb-2">Configure the AI agents that run your studio.</p>
             {currentProject.gems.map((gem) => (
                <div key={gem.id} className="group bg-gray-900/30 rounded-lg p-3 border border-gray-800 hover:border-gray-600 transition-colors">
                   <div className="flex items-center gap-2 text-nano-accent mb-2">
                      <GemIcon size={14} />
                      <span className="text-sm font-bold text-white">{gem.name}</span>
                   </div>
                   <p className="text-[10px] text-gray-400 mb-2">{gem.description}</p>
                   <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">System Instructions</label>
                   <textarea 
                      value={gem.systemInstruction}
                      onChange={(e) => updateGem(gem.id, e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 rounded p-2 text-[10px] text-gray-300 font-mono h-24 focus:border-nano-accent focus:outline-none resize-y"
                   />
                </div>
             ))}
          </div>
        )}

        {/* Rules */}
        {activeTab === 'rules' && (
           <div className="animate-in fade-in h-full flex flex-col">
              <div className="flex items-center gap-2 text-nano-pink mb-2">
                 <FileCode size={14} />
                 <h3 className="text-sm font-bold text-white">Prompting Bible</h3>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Global rules applied to every image generation prompt.</p>
              <textarea
                 value={currentProject.promptGuidelines}
                 onChange={(e) => onUpdateProject({ ...currentProject, promptGuidelines: e.target.value })}
                 className="flex-1 w-full bg-black/40 border border-gray-700 rounded p-3 text-xs text-gray-300 font-mono focus:border-nano-pink focus:outline-none resize-none leading-relaxed"
              />
           </div>
        )}

      </div>

      {/* Angle Generator Modal */}
      {showAngleGenerator && (
        <AngleGenerator
          onComplete={(angles) => {
            // Handle the generated angles
            // You can create a new product with these angles
            console.log('Generated angles:', angles);
            setShowAngleGenerator(false);

            // TODO: Integrate with product creation flow
            // For now, just log the angles - user can implement product creation
            alert(`Generated ${angles.length} angles successfully! Check console for details.`);
          }}
          onCancel={() => setShowAngleGenerator(false)}
        />
      )}

      {/* White Background Test Modal */}
      {testingProduct && (
        <WhiteBackgroundTest
          product={currentProject.characters.find(c => c.id === testingProduct) as Product}
          worldLook={currentProject.worldLook}
          promptGuidelines={currentProject.promptGuidelines}
          onClose={() => setTestingProduct(null)}
        />
      )}

      {/* AI Reference Generation Confirmation Modal */}
      {pendingGeneration && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Generate Missing Reference?</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-300">
                AI will generate a <span className="text-cyan-400 font-bold">{pendingGeneration.view}</span> reference image for{' '}
                <span className="text-white font-bold">
                  {currentProject.characters.find(c => c.id === pendingGeneration.characterId)?.name}
                </span>
                {' '}using your existing reference images.
              </p>

              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-3">
                <p className="text-xs text-cyan-300 leading-relaxed">
                  💡 The AI will analyze your existing references and generate a consistent character view. You can delete it if it doesn't match.
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                <p className="text-xs text-yellow-300 leading-relaxed">
                  ⚠️ This uses Nano Banana Pro (high-quality model). Generation may take 30-60 seconds.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingGeneration(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmGenerateReference}
                className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors z-10"
            >
              <X size={24} />
            </button>

            {/* Image */}
            <img
              src={lightboxImage}
              alt="Reference preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded text-sm">
              Click outside image to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldBiblePanel;
