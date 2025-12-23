import React, { useState } from 'react';
import { Camera, Image as ImageIcon, User, MapPin, Palette, Sparkles, X, Check } from 'lucide-react';
import { Product, Model, Location, StyleReference, AspectRatio, Resolution } from '../types';
import { generateImage } from '../services/geminiService';

interface ManualStudioProps {
  products: Product[];
  models: Model[];
  locations: Location[];
  styles: StyleReference[];
  worldLook: string;
  promptGuidelines: string;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  onClose: () => void;
  onSaveShot?: (image: string, prompt: string) => void;
}

const ManualStudio: React.FC<ManualStudioProps> = ({
  products,
  models,
  locations,
  styles,
  worldLook,
  promptGuidelines,
  resolution,
  aspectRatio,
  onClose,
  onSaveShot
}) => {
  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Prompt state
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Toggle selection
  const toggleSelection = (id: string, list: string[], setter: (val: string[]) => void) => {
    if (list.includes(id)) {
      setter(list.filter(x => x !== id));
    } else {
      setter([...list, id]);
    }
  };

  // Get selected entities
  const getSelectedProducts = () => products.filter(p => selectedProducts.includes(p.id));
  const getSelectedModels = () => models.filter(m => selectedModels.includes(m.id));
  const getSelectedLocations = () => locations.filter(l => selectedLocations.includes(l.id));
  const getSelectedStyles = () => styles.filter(s => selectedStyles.includes(s.id));

  // Count total reference images
  const getTotalReferenceCount = () => {
    let count = 0;
    getSelectedProducts().forEach(p => count += p.referenceImages?.length || 0);
    getSelectedModels().forEach(m => count += m.referenceImages?.length || 0);
    getSelectedLocations().forEach(l => count += l.referenceImages?.length || 0);
    getSelectedStyles().forEach(s => count += 1);
    return count;
  };

  // Auto-generate prompt based on selections
  const generateAutoPrompt = () => {
    const parts: string[] = [];

    if (selectedProducts.length > 0) {
      const handles = getSelectedProducts().map(p => `@${p.handle?.replace('@', '')}`);
      parts.push(`Product${selectedProducts.length > 1 ? 's' : ''}: ${handles.join(', ')}`);
    }

    if (selectedModels.length > 0) {
      const handles = getSelectedModels().map(m => `@${m.handle?.replace('@', '')}`);
      parts.push(`Model${selectedModels.length > 1 ? 's' : ''}: ${handles.join(', ')}`);
    }

    if (selectedLocations.length > 0) {
      const handles = getSelectedLocations().map(l => `@${l.handle?.replace('@', '') || l.name}`);
      parts.push(`Location: ${handles.join(', ')}`);
    }

    return parts.join(' • ');
  };

  // Generate image
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const imageUrl = await generateImage(
        prompt,
        [],
        resolution,
        aspectRatio,
        worldLook,
        promptGuidelines,
        {
          products: getSelectedProducts(),
          models: getSelectedModels(),
          locations: getSelectedLocations(),
          styles: getSelectedStyles()
        }
      );

      if (imageUrl) {
        setGeneratedImage(imageUrl);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate image. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-nano-900 rounded-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-cyan-500/20">

        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-nano-900 to-cyan-950/20">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              Manual Studio
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Pick references → Write prompt → Generate instantly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6 p-6">

            {/* Left: Reference Picker */}
            <div className="col-span-5 space-y-6">

              {/* Products */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  Products ({products.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => toggleSelection(product.id, selectedProducts, setSelectedProducts)}
                      className={`
                        relative p-2 rounded-lg border-2 transition-all
                        ${selectedProducts.includes(product.id)
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                        }
                      `}
                    >
                      <div className="aspect-square bg-gray-900 rounded mb-2 overflow-hidden">
                        {product.referenceImages?.[0] ? (
                          <img
                            src={product.referenceImages[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium truncate">
                        @{product.handle?.replace('@', '')}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {product.referenceImages?.length || 0} refs
                      </div>
                      {selectedProducts.includes(product.id) && (
                        <div className="absolute top-1 right-1 bg-cyan-500 rounded-full p-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                  {products.length === 0 && (
                    <div className="col-span-3 text-sm text-gray-500 text-center py-4">
                      No products yet. Add products in Brand Bible.
                    </div>
                  )}
                </div>
              </div>

              {/* Models */}
              {models.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-pink-400" />
                    Models ({models.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {models.map(model => (
                      <button
                        key={model.id}
                        onClick={() => toggleSelection(model.id, selectedModels, setSelectedModels)}
                        className={`
                          relative p-2 rounded-lg border-2 transition-all
                          ${selectedModels.includes(model.id)
                            ? 'border-pink-500 bg-pink-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                          }
                        `}
                      >
                        <div className="aspect-square bg-gray-900 rounded mb-2 overflow-hidden">
                          {model.referenceImages?.[0] ? (
                            <img
                              src={model.referenceImages[0]}
                              alt={model.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-medium truncate">
                          @{model.handle?.replace('@', '')}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {model.referenceImages?.length || 0} refs
                        </div>
                        {selectedModels.includes(model.id) && (
                          <div className="absolute top-1 right-1 bg-pink-500 rounded-full p-1">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {locations.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-400" />
                    Locations ({locations.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {locations.map(location => (
                      <button
                        key={location.id}
                        onClick={() => toggleSelection(location.id, selectedLocations, setSelectedLocations)}
                        className={`
                          relative p-2 rounded-lg border-2 transition-all text-left
                          ${selectedLocations.includes(location.id)
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                          }
                        `}
                      >
                        <div className="text-xs font-medium">
                          {location.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {location.referenceImages?.length || 0} refs
                        </div>
                        {selectedLocations.includes(location.id) && (
                          <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Styles */}
              {styles.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Styles ({styles.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {styles.map(style => (
                      <button
                        key={style.id}
                        onClick={() => toggleSelection(style.id, selectedStyles, setSelectedStyles)}
                        className={`
                          relative p-2 rounded-lg border-2 transition-all text-left
                          ${selectedStyles.includes(style.id)
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                          }
                        `}
                      >
                        <div className="text-xs font-medium truncate">
                          {style.name}
                        </div>
                        {selectedStyles.includes(style.id) && (
                          <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-1">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right: Prompt & Generation */}
            <div className="col-span-7 flex flex-col gap-4">

              {/* Reference Summary */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-xs font-bold mb-2 text-gray-400 uppercase">Selected References</h3>
                <div className="flex items-center gap-2 text-sm">
                  {getTotalReferenceCount() > 0 ? (
                    <>
                      <div className="flex items-center gap-1 text-cyan-400">
                        <ImageIcon className="w-4 h-4" />
                        <span>{getTotalReferenceCount()} images</span>
                      </div>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">{generateAutoPrompt()}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">No references selected</span>
                  )}
                </div>
              </div>

              {/* Prompt Editor */}
              <div className="flex-1 flex flex-col">
                <label className="text-xs font-bold mb-2 text-gray-400 uppercase">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Medium hero shot of @polo worn by @model_sam on white background, studio lighting..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm resize-none focus:border-cyan-500 focus:outline-none"
                  rows={6}
                />
                <button
                  onClick={() => setPrompt(generateAutoPrompt())}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 text-left"
                >
                  ✨ Auto-fill from selections
                </button>
              </div>

              {/* Generation Result */}
              <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                {generatedImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => setGeneratedImage(null)}
                        className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {onSaveShot && (
                        <button
                          onClick={() => {
                            onSaveShot(generatedImage, prompt);
                            onClose();
                          }}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save to Project
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Generated image will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || getTotalReferenceCount() === 0}
                className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Shot ({getTotalReferenceCount()} references)
                  </>
                )}
              </button>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ManualStudio;
