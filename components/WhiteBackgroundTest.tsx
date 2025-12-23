import React, { useState } from 'react';
import { TestTube, Loader2, Check, X } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { Product, Resolution, AspectRatio } from '../types';

interface WhiteBackgroundTestProps {
  product: Product;
  worldLook: string;
  promptGuidelines: string;
  onClose: () => void;
}

const TEST_ANGLES = [
  'Front view of product on white background, studio lighting',
  'Side profile view of product on white background, studio lighting',
  'Back view of product on white background, studio lighting',
  '3/4 angle view of product on white background, studio lighting'
];

const WhiteBackgroundTest: React.FC<WhiteBackgroundTestProps> = ({
  product,
  worldLook,
  promptGuidelines,
  onClose
}) => {
  const [testResults, setTestResults] = useState<(string | null)[]>([null, null, null, null]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const runTest = async () => {
    setIsGenerating(true);
    const results: (string | null)[] = [];

    for (let i = 0; i < TEST_ANGLES.length; i++) {
      setCurrentIndex(i);
      try {
        const prompt = `${TEST_ANGLES[i]}. Product: ${product.name}. @${product.handle?.replace('@', '')}`;

        console.log(`🧪 Test ${i + 1}/${TEST_ANGLES.length}: ${prompt}`);

        const image = await generateImage(
          prompt,
          [],
          '1080p' as Resolution,
          '1:1' as AspectRatio,
          worldLook,
          promptGuidelines,
          {
            products: [product],
            models: [],
            locations: [],
            styles: []
          }
        );

        results.push(image);
        setTestResults([...results, ...Array(TEST_ANGLES.length - results.length).fill(null)]);
      } catch (error) {
        console.error(`Test ${i + 1} failed:`, error);
        results.push(null);
        setTestResults([...results, ...Array(TEST_ANGLES.length - results.length).fill(null)]);
      }
    }

    setIsGenerating(false);
  };

  const allSuccess = testResults.every(r => r !== null);
  const someSuccess = testResults.some(r => r !== null);
  const successCount = testResults.filter(r => r !== null).length;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-nano-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-nano-800 z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TestTube className="w-6 h-6 text-cyan-400" />
              White Background Test
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Testing product accuracy for: {product.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="bg-nano-900 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-cyan-400 font-mono">@{product.handle?.replace('@', '')}</span>
              {product.sku && (
                <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded font-mono">
                  {product.sku}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Reference Images: {product.referenceImages?.length || 0}
            </p>
            {product.referenceImages && product.referenceImages.length > 0 && (
              <div className="mt-3 flex gap-2">
                {product.referenceImages.slice(0, 3).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Reference ${i + 1}`}
                    className="w-16 h-16 object-cover rounded border border-gray-600"
                  />
                ))}
                {product.referenceImages.length > 3 && (
                  <div className="w-16 h-16 flex items-center justify-center bg-nano-700 rounded border border-gray-600 text-xs text-gray-400">
                    +{product.referenceImages.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Results Grid */}
          <div className="grid grid-cols-2 gap-4">
            {TEST_ANGLES.map((angle, index) => (
              <div key={index} className="bg-nano-900 rounded-lg overflow-hidden border border-gray-700">
                <div className="aspect-square bg-nano-700 flex items-center justify-center relative">
                  {!testResults[index] && !isGenerating && (
                    <span className="text-gray-500 text-sm">Not tested</span>
                  )}
                  {isGenerating && currentIndex === index && (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                      <span className="text-xs text-cyan-400">Generating...</span>
                    </div>
                  )}
                  {isGenerating && currentIndex > index && !testResults[index] && (
                    <div className="flex flex-col items-center gap-2">
                      <X className="w-8 h-8 text-red-500" />
                      <span className="text-xs text-red-400">Failed</span>
                    </div>
                  )}
                  {testResults[index] && (
                    <img
                      src={testResults[index]!}
                      alt={angle}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400">{angle.split(',')[0]}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Test {index + 1}/4</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            {!isGenerating && !someSuccess && (
              <div className="flex-1">
                <button
                  onClick={runTest}
                  disabled={!product.referenceImages || product.referenceImages.length === 0}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                  <TestTube className="w-5 h-5" />
                  Run Test (4 shots)
                </button>
                {(!product.referenceImages || product.referenceImages.length === 0) && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Please upload reference images for this product first
                  </p>
                )}
              </div>
            )}

            {isGenerating && (
              <div className="flex items-center gap-2 text-cyan-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating test {currentIndex + 1} of {TEST_ANGLES.length}...</span>
              </div>
            )}

            {!isGenerating && someSuccess && (
              <div className="flex items-center gap-4 flex-1">
                {allSuccess ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">All tests passed!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <span className="font-medium">
                      {successCount}/{TEST_ANGLES.length} tests passed
                    </span>
                  </div>
                )}

                <button
                  onClick={runTest}
                  className="px-4 py-2 bg-nano-700 hover:bg-nano-600 rounded-lg text-sm transition-colors"
                >
                  Run Again
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium ml-auto transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteBackgroundTest;
