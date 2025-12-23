
import { ShotTemplate } from './types';

export const GOLF_APPAREL_TEMPLATE: ShotTemplate = {
  id: 'template_golf_apparel',
  name: 'Golf Apparel Hero Package',
  category: 'golf_apparel',
  description: 'Complete product photography suite for golf apparel',
  shots: [
    {
      order: 1,
      shotType: 'Studio 360',
      name: '360° Rotation',
      camera: '85mm, Eye Level, Orbit',
      lighting: 'High-key studio, soft box front',
      environment: 'Studio - High Key White',
      promptSeed: 'Product on invisible mannequin, rotating 360°, clean white background, studio lighting'
    },
    {
      order: 2,
      shotType: 'Hero Front',
      name: 'Front Hero Shot',
      camera: '85mm, Eye Level, Static',
      lighting: 'High-key studio, overhead soft box',
      environment: 'Studio - High Key White',
      promptSeed: 'Professional product photography, front view, centered composition, clean background'
    },
    {
      order: 3,
      shotType: 'Detail - Logo',
      name: 'Logo Close-Up',
      camera: 'Macro 100mm, Straight On',
      lighting: 'Ring light, diffused',
      environment: 'Studio Macro',
      promptSeed: 'Macro detail shot of brand logo on chest, sharp focus, shallow depth of field'
    },
    {
      order: 4,
      shotType: 'Detail - Stitching',
      name: 'Stitching Quality',
      camera: 'Macro 100mm, 3/4 View',
      lighting: 'Side lighting, textured',
      environment: 'Studio Macro',
      promptSeed: 'Close-up of premium stitching, visible craftsmanship, quality detail'
    },
    {
      order: 5,
      shotType: 'Detail - Texture',
      name: 'Fabric Texture',
      camera: 'Macro 100mm, Straight On',
      lighting: 'Diffused natural',
      environment: 'Studio Macro',
      promptSeed: 'Macro fabric texture shot showing material weave and quality'
    },
    {
      order: 6,
      shotType: 'Lifestyle - Action',
      name: 'On-Course Action',
      camera: '50mm, 3/4 View, Static',
      lighting: 'Natural golden hour',
      environment: 'Golf Course - Luxury Resort',
      promptSeed: 'Product worn by golfer during swing, premium golf course, natural lighting, lifestyle photography'
    },
    {
      order: 7,
      shotType: 'Detail - Feature',
      name: 'Feature Callout',
      camera: '85mm, Straight On',
      lighting: 'Studio even',
      environment: 'Studio - High Key White',
      promptSeed: 'Detail shot highlighting key product feature (pocket, zipper, ventilation)'
    }
  ]
};

export const FOOTWEAR_TEMPLATE: ShotTemplate = {
  id: 'template_footwear',
  name: 'Footwear Launch Package',
  category: 'footwear',
  description: 'High-impact sneaker and footwear photography suite',
  shots: [
    {
      order: 1,
      shotType: 'Hero Side',
      name: 'Side Profile Hero',
      camera: '50mm, Low Angle',
      lighting: 'Dramatic rim lighting',
      environment: 'Studio - Dark Grey',
      promptSeed: 'Side profile of shoe, floating slightly above ground, dramatic lighting highlighting silhouette'
    },
    {
      order: 2,
      shotType: 'Hero 3/4',
      name: '3/4 Perspective',
      camera: '35mm, Eye Level',
      lighting: 'Softbox fill, rim light',
      environment: 'Studio - Concrete',
      promptSeed: '3/4 view of shoe, dynamic composition, showcasing design lines'
    },
    {
      order: 3,
      shotType: 'Detail - Sole',
      name: 'Traction/Sole Detail',
      camera: 'Macro 100mm, Low Angle',
      lighting: 'Hard light from bottom',
      environment: 'Studio - Textured',
      promptSeed: 'Close up of sole tread pattern, showing grip and technology'
    },
    {
      order: 4,
      shotType: 'Top Down',
      name: 'Knolling / Flat Lay',
      camera: '35mm, Overhead',
      lighting: 'Even flat lighting',
      environment: 'Studio - Color Block',
      promptSeed: 'Top down view of pair of shoes, symmetrical composition'
    },
    {
      order: 5,
      shotType: 'Lifestyle - Feet',
      name: 'On-Feet Lifestyle',
      camera: '24mm, Low Angle',
      lighting: 'Natural street light',
      environment: 'Urban Street',
      promptSeed: 'Shoes worn on feet, walking on pavement, shallow depth of field background'
    }
  ]
};

export const ACCESSORIES_TEMPLATE: ShotTemplate = {
  id: 'template_accessories',
  name: 'Accessories / Hats / Bags',
  category: 'accessories',
  description: 'Clean, detail-oriented shots for smaller items',
  shots: [
    {
      order: 1,
      shotType: 'Hero Front',
      name: 'Front View',
      camera: '85mm, Straight On',
      lighting: 'Soft diffused studio',
      environment: 'Studio - Grey',
      promptSeed: 'Front view of accessory, clean composition, soft shadows'
    },
    {
      order: 2,
      shotType: 'Hero 3/4',
      name: 'Angled View',
      camera: '50mm, 45 degrees',
      lighting: 'Key light left',
      environment: 'Studio - Grey',
      promptSeed: '3/4 angled view showing depth and form'
    },
    {
      order: 3,
      shotType: 'Detail - Material',
      name: 'Material Texture',
      camera: 'Macro 100mm',
      lighting: 'Raking light',
      environment: 'Studio Macro',
      promptSeed: 'Extreme close-up of fabric/material texture'
    },
    {
      order: 4,
      shotType: 'Lifestyle - Context',
      name: 'In-Situ Lifestyle',
      camera: '35mm, Eye Level',
      lighting: 'Natural',
      environment: 'Locker Room / Gym',
      promptSeed: 'Accessory placed naturally in a locker room or gym bench setting'
    },
    {
      order: 5,
      shotType: 'Detail - Logo',
      name: 'Branding Detail',
      camera: 'Macro 100mm',
      lighting: 'Ring light',
      environment: 'Studio Macro',
      promptSeed: 'Close up of logo embroidery or print'
    }
  ]
};

export const SEASONAL_CAMPAIGN_TEMPLATE: ShotTemplate = {
  id: 'template_seasonal',
  name: 'Full Seasonal Campaign',
  category: 'campaign',
  description: 'Comprehensive 12-shot package for major product launches',
  shots: [
    { order: 1, shotType: 'Teaser', name: 'Shadow Teaser', camera: '50mm', lighting: 'Silhouette', environment: 'Dark Studio', promptSeed: 'Silhouette of product, mysterious lighting, teaser style' },
    { order: 2, shotType: 'Hero Front', name: 'Main Hero', camera: '85mm', lighting: 'High Key', environment: 'Studio White', promptSeed: 'Clean hero shot on white' },
    { order: 3, shotType: 'Hero Back', name: 'Back View', camera: '85mm', lighting: 'High Key', environment: 'Studio White', promptSeed: 'Clean back view on white' },
    { order: 4, shotType: 'Lookbook Full', name: 'Full Body Lookbook', camera: '50mm', lighting: 'Even', environment: 'Studio Cyc', promptSeed: 'Full body shot of model wearing product' },
    { order: 5, shotType: 'Lookbook Detail', name: 'Half Body Lookbook', camera: '85mm', lighting: 'Even', environment: 'Studio Cyc', promptSeed: 'Waist up shot of model wearing product' },
    { order: 6, shotType: 'Lifestyle Wide', name: 'Environmental Wide', camera: '24mm', lighting: 'Natural', environment: 'Urban/Nature', promptSeed: 'Wide environmental shot establishing context' },
    { order: 7, shotType: 'Lifestyle Medium', name: 'Action Shot', camera: '50mm', lighting: 'Natural', environment: 'Urban/Nature', promptSeed: 'Medium action shot, movement blur' },
    { order: 8, shotType: 'Detail 1', name: 'Tech Feature 1', camera: 'Macro', lighting: 'Studio', environment: 'Macro', promptSeed: 'Detail of primary technical feature' },
    { order: 9, shotType: 'Detail 2', name: 'Tech Feature 2', camera: 'Macro', lighting: 'Studio', environment: 'Macro', promptSeed: 'Detail of secondary technical feature' },
    { order: 10, shotType: 'Detail 3', name: 'Texture/Fabric', camera: 'Macro', lighting: 'Studio', environment: 'Macro', promptSeed: 'Fabric texture close up' },
    { order: 11, shotType: 'Social Vertical', name: 'Story Format', camera: '35mm', lighting: 'Natural', environment: 'Lifestyle', promptSeed: 'Vertical composition for Instagram Stories' },
    { order: 12, shotType: 'Flatlay', name: 'Outfit Grid', camera: 'Overhead', lighting: 'Flat', environment: 'Color Background', promptSeed: 'Knolling style flatlay of full outfit' }
  ]
};
