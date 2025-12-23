import React, { useState } from 'react';
import { Camera, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { generateImageWithAngles } from '../services/geminiService';

interface AngleOption {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
}

interface GeneratedAngle {
  id: string;
  name: string;
  image: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
}

interface AngleGeneratorProps {
  onComplete: (images: { angle: string; image: string }[]) => void;
  onCancel: () => void;
}

const ANGLE_OPTIONS: AngleOption[] = [
  {
    id: 'back',
    name: 'Back View',
    prompt: 'Same product photographed from directly behind, showing back view, maintain exact same product, lighting, and quality',
    enabled: true
  },
  {
    id: 'left',
    name: 'Left Side',
    prompt: 'Same product photographed from left side profile, showing left side view, maintain exact same product, lighting, and quality',
    enabled: true
  },
  {
    id: 'right',
    name: 'Right Side',
    prompt: 'Same product photographed from right side profile, showing right side view, maintain exact same product, lighting, and quality',
    enabled: true
  },
  {
    id: 'threequarter_fl',
    name: '3/4 Front-Left',
    prompt: 'Same product photographed from 3/4 angle front-left, slightly angled view showing both front and left side, maintain exact same product',
    enabled: true
  },
  {
    id: 'threequarter_fr',
    name: '3/4 Front-Right',
    prompt: 'Same product photographed from 3/4 angle front-right, slightly angled view showing both front and right side, maintain exact same product',
    enabled: true
  },
  {
    id: 'flatlay',
    name: 'Flat Lay (Top)',
    prompt: 'Same product photographed from directly above in flat lay style, top-down view, maintain exact same product and quality',
    enabled: true
  },
  {
    id: 'detail_collar',
    name: 'Detail - Collar',
    prompt: 'Extreme close-up detail shot of the collar and neckline of the same product, showing texture and construction details',
    enabled: true
  },
  {
    id: 'detail_texture',
    name: 'Detail - Texture',
    prompt: 'Extreme close-up detail shot of the fabric texture and material of the same product, showing weave and quality',
    enabled: true
  }
];

const AngleGenerator: React.FC<AngleGeneratorProps> = ({ onComplete, onCancel }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<Set<string>>(
    new Set(ANGLE_OPTIONS.filter(a => a.enabled).map(a => a.id))
  );
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBaseImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAngle = (angleId: string) => {
    const newSelected = new Set(selectedAngles);
    if (newSelected.has(angleId)) {
      newSelected.delete(angleId);
    } else {
      newSelected.add(angleId);
    }
    setSelectedAngles(newSelected);
  };

  const generateAllAngles = async () => {
    if (!baseImage) return;

    setIsGenerating(true);

    // Initialize generated angles array
    const angles = Array.from(selectedAngles).map(id => ({
      id,
      name: ANGLE_OPTIONS.find(a => a.id === id)?.name || id,
      image: null,
      status: 'pending' as const
    }));

    setGeneratedAngles(angles);

    // Generate each angle
    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i];
      const angleOption = ANGLE_OPTIONS.find(a => a.id === angle.id);

      if (!angleOption) continue;

      // Update status to generating
      setGeneratedAngles(prev =>
        prev.map((a, idx) =>
          idx === i ? { ...a, status: 'generating' } : a
        )
      );

      try {
        // Generate image with reference
        const generatedImage = await generateImageWithAngles(
          angleOption.prompt,
          baseImage,
          '1:1'
        );

        // Update with generated image
        setGeneratedAngles(prev =>
          prev.map((a, idx) =>
            idx === i ? { ...a, image: generatedImage, status: 'success' } : a
          )
        );
      } catch (error) {
        console.error(`Failed to generate ${angle.name}:`, error);
        setGeneratedAngles(prev =>
          prev.map((a, idx) =>
            idx === i ? { ...a, status: 'error' } : a
          )
        );
      }
    }

    setIsGenerating(false);
  };

  const regenerateAngle = async (index: number) => {
    const angle = generatedAngles[index];
    const angleOption = ANGLE_OPTIONS.find(a => a.id === angle.id);

    if (!angleOption || !baseImage) return;

    setGeneratedAngles(prev =>
      prev.map((a, idx) =>
        idx === index ? { ...a, status: 'generating' } : a
      )
    );

    try {
      const generatedImage = await generateImageWithAngles(
        angleOption.prompt,
        baseImage,
        '1:1'
      );

      setGeneratedAngles(prev =>
        prev.map((a, idx) =>
          idx === index ? { ...a, image: generatedImage, status: 'success' } : a
        )
      );
    } catch (error) {
      console.error(`Failed to regenerate ${angle.name}:`, error);
      setGeneratedAngles(prev =>
        prev.map((a, idx) =>
          idx === index ? { ...a, status: 'error' } : a
        )
      );
    }
  };

  const handleComplete = () => {
    const successfulAngles = generatedAngles
      .filter(a => a.status === 'success' && a.image)
      .map(a => ({ angle: a.name, image: a.image! }));

    onComplete(successfulAngles);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-nano-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-nano-800 z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="w-6 h-6" />
              Product Angle Generator
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Upload one product photo, generate all angles automatically
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Base Image */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Base Image
            </label>
            {!baseImage ? (
              <label className="border-2 border-dashed border-gray-600 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors">
                <Camera className="w-12 h-12 text-gray-500 mb-4" />
                <span className="text-gray-400">Drop or click to upload</span>
                <span className="text-sm text-gray-500 mt-2">
                  One high-quality product photo (front view recommended)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={baseImage}
                  alt="Base product"
                  className="w-full h-64 object-contain bg-nano-900 rounded-lg"
                />
                <button
                  onClick={() => setBaseImage(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Select Angles */}
          {baseImage && !isGenerating && generatedAngles.length === 0 && (
            <div>
              <label className="block text-sm font-medium mb-3">
                Select Angles to Generate
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ANGLE_OPTIONS.map(angle => (
                  <button
                    key={angle.id}
                    onClick={() => toggleAngle(angle.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedAngles.has(angle.id)
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedAngles.has(angle.id)
                            ? 'border-cyan-500 bg-cyan-500'
                            : 'border-gray-500'
                        }`}
                      >
                        {selectedAngles.has(angle.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm">{angle.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {selectedAngles.size} angles selected (~
                  {(selectedAngles.size * 0.3).toFixed(1)} credits)
                </span>
                <button
                  onClick={generateAllAngles}
                  disabled={selectedAngles.size === 0}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Generate All Angles
                </button>
              </div>
            </div>
          )}

          {/* Generated Angles */}
          {generatedAngles.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-3">
                Generated Angles ({generatedAngles.filter(a => a.status === 'success').length}/{generatedAngles.length})
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generatedAngles.map((angle, index) => (
                  <div
                    key={angle.id}
                    className="bg-nano-900 rounded-lg overflow-hidden border border-gray-700"
                  >
                    <div className="aspect-square bg-nano-700 flex items-center justify-center relative">
                      {angle.status === 'pending' && (
                        <span className="text-gray-500 text-sm">Queued</span>
                      )}
                      {angle.status === 'generating' && (
                        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                      )}
                      {angle.status === 'success' && angle.image && (
                        <img
                          src={angle.image}
                          alt={angle.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {angle.status === 'error' && (
                        <div className="text-red-500 text-center p-4">
                          <X className="w-8 h-8 mx-auto mb-2" />
                          <span className="text-xs">Failed</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{angle.name}</p>
                      {(angle.status === 'success' || angle.status === 'error') && (
                        <button
                          onClick={() => regenerateAngle(index)}
                          className="mt-2 w-full px-2 py-1 text-xs bg-nano-700 hover:bg-nano-600 rounded flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!isGenerating && (
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={onCancel}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={generatedAngles.filter(a => a.status === 'success').length === 0}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Save All Angles ({generatedAngles.filter(a => a.status === 'success').length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AngleGenerator;
