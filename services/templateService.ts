
import { ShotTemplate, Product, EpisodeStructure, Act, Scene, Beat } from '../types';

export function applyTemplateToProducts(
  template: ShotTemplate,
  products: Product[],
  existingStructure: EpisodeStructure | null
): EpisodeStructure {
  
  // Create a new Act (Collection) for this batch
  const newAct: Act = {
    act_number: (existingStructure?.acts.length || 0) + 1,
    scenes: []
  };

  // Create a Scene (Shoot) for each Product
  products.forEach((product, index) => {
    const scene: Scene = {
      scene_number: index + 1,
      summary: `${template.name} - ${product.name}`,
      beats: template.shots.map((spec, shotIndex) => {
        const beat: Beat = {
          beat_id: `shot_${product.sku || 'p'}_${Date.now()}_${shotIndex}`,
          characters: [product.name], // Products involved
          emotion: "Premium",
          action: spec.name, // Short name
          shotType: spec.shotType,
          camera: spec.camera,
          lighting: spec.lighting,
          location: spec.environment,
          visual_notes: spec.shotType,
          prompt_seed: spec.promptSeed.replace('Product', product.name), // Basic interpolation
          generatedImages: [],
          selectedImageIndex: -1,
          status: 'Draft',
          comments: [],
          promptHistory: [],
          isGeneratingImage: false
        };
        return beat;
      })
    };
    newAct.scenes.push(scene);
  });

  // Merge
  const newStructure: EpisodeStructure = {
    acts: existingStructure ? [...existingStructure.acts, newAct] : [newAct]
  };

  return newStructure;
}
