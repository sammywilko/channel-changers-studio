import React, { useState } from 'react';
import { Wand2, ChevronDown, ChevronUp, Sparkles, FileText, Copy, Check } from 'lucide-react';

interface BriefComposerProps {
  value: string;
  onChange: (value: string) => void;
  onEnhance?: (brief: string) => Promise<string>;
  projectType: 'narrative' | 'product';
}

const BRIEF_TEMPLATES = {
  product: [
    {
      name: "Golf Apparel Campaign",
      brief: `Under Armour Golf Performance Collection - Spring 2025

PRODUCTS:
- Premium performance polo in navy (moisture-wicking, 4-way stretch)
- Lightweight rain jacket in storm grey (waterproof, packable)
- Tour-level golf glove in white leather

TARGET AESTHETIC:
Premium sport-luxury, cinematic outdoor photography, athletic elegance

ENVIRONMENTS:
- Scottish links golf course (overcast, dramatic sky, coastal winds)
- Modern driving range at sunrise (minimalist, concrete bays, soft light)
- Elite clubhouse interior (walnut panels, leather, moody lighting)

HERO MOMENTS:
- Full golf swing in rain jacket, water beading on fabric
- Close-up details of fabric technology and premium materials
- Lifestyle moments showing versatility on and off course`
    },
    {
      name: "Technical Running Gear",
      brief: `Nike Pegasus Trail 5 Campaign

PRODUCTS:
- Trail running shoe in volt/black colorway
- Lightweight training jacket with reflective details
- Moisture-wicking running shorts

TARGET AESTHETIC:
High-energy action photography, natural outdoor lighting, athletic performance

ENVIRONMENTS:
- Mountain trail at golden hour
- Urban park with concrete paths
- Forest trail with dappled sunlight

HERO MOMENTS:
- Dynamic running action shots
- Close-ups of shoe tread and technical features
- Lifestyle moments showing trail-to-street versatility`
    },
    {
      name: "Luxury Athleisure",
      brief: `lululemon Studio Collection

PRODUCTS:
- Align High-Rise pant in black
- Scuba hoodie in heathered grey
- Everywhere belt bag in white

TARGET AESTHETIC:
Minimalist luxury, soft natural lighting, aspirational lifestyle

ENVIRONMENTS:
- Modern yoga studio (white walls, natural light)
- Urban rooftop at sunset
- Coffee shop interior (warm, inviting)

HERO MOMENTS:
- Movement sequences showing fabric stretch
- Lifestyle moments showing versatility
- Detail shots of premium fabric quality`
    }
  ],
  narrative: [
    {
      name: "Brand Story",
      brief: `Tell the story of an athlete's journey from amateur to professional, featuring their relationship with their training gear and the environments that shaped them.`
    },
    {
      name: "Product Launch",
      brief: `Introduce a revolutionary new training technology through a series of scenes showing its development, testing, and real-world application.`
    }
  ]
};

const BriefComposer: React.FC<BriefComposerProps> = ({
  value,
  onChange,
  onEnhance,
  projectType
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const templates = BRIEF_TEMPLATES[projectType];

  const handleUseTemplate = (templateBrief: string) => {
    onChange(templateBrief);
    setShowTemplates(false);
  };

  const handleCopyTemplate = (templateBrief: string, templateName: string) => {
    navigator.clipboard.writeText(templateBrief);
    setCopiedTemplate(templateName);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const handleEnhance = async () => {
    if (!onEnhance || !value.trim()) return;

    setIsEnhancing(true);
    try {
      const enhanced = await onEnhance(value);
      onChange(enhanced);
    } catch (error) {
      console.error('Enhancement failed:', error);
      alert('Failed to enhance brief. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">

      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold">Campaign Brief</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Templates Dropdown */}
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Templates
            {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Enhance Button */}
          {onEnhance && value.trim() && (
            <button
              onClick={handleEnhance}
              disabled={isEnhancing}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnhancing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Enhance Brief
                </>
              )}
            </button>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-700 rounded"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <h4 className="text-sm font-bold mb-3 text-gray-400">Choose a Template:</h4>
          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.name} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm">{template.name}</h5>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyTemplate(template.brief, template.name)}
                      className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                      title="Copy to clipboard"
                    >
                      {copiedTemplate === template.name ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleUseTemplate(template.brief)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {template.brief.slice(0, 150)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brief Input */}
      <div className="p-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Write your ${projectType === 'product' ? 'product photography' : 'narrative'} brief here...

For best results, include:
${projectType === 'product' ? `
- PRODUCTS: What items to feature (polo, jacket, glove, etc.)
- ENVIRONMENTS: Where to shoot (golf course, studio, clubhouse)
- TARGET AESTHETIC: Visual style and mood
- HERO MOMENTS: Key shots you want to capture
- TECHNICAL DETAILS: Materials, colors, features to highlight` : `
- STORY CONCEPT: Overall narrative arc
- KEY MOMENTS: Important scenes to capture
- CHARACTERS: Who is in the story
- ENVIRONMENTS: Where the story takes place
- MOOD & TONE: Emotional feel of the piece`}`}
          className={`
            w-full bg-gray-900 border border-gray-700 rounded-lg p-4
            outline-none focus:border-cyan-500 resize-none
            ${isExpanded ? 'h-96' : 'h-48'}
          `}
        />
      </div>

      {/* Helper Text */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
          <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-200">
            <strong>Pro Tip:</strong> The more specific your brief, the better the results.
            Include product names, environment descriptions, and the visual style you're aiming for.
            {onEnhance && <span className="block mt-1">Click "Enhance Brief" to let AI expand and improve your description.</span>}
          </div>
        </div>
      </div>

    </div>
  );
};

export default BriefComposer;
