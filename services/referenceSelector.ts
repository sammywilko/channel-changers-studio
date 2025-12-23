
import { Beat, Product, BrandAsset } from '../types';

export function selectReferencesForShot(
  shot: Beat, 
  product: Product | undefined,
  brandAssets: BrandAsset[] = []
): string[] {
  const references: string[] = [];
  
  if (!product) return references;

  // Determine shot type keywords
  const type = (shot.shotType || shot.action).toLowerCase();
  const isHero = type.includes('hero') || type.includes('360') || type.includes('front') || type.includes('full');
  const isLogo = type.includes('logo') || type.includes('brand');
  const isDetail = type.includes('detail') || type.includes('texture') || type.includes('stitching') || type.includes('macro');
  const isLifestyle = type.includes('lifestyle') || type.includes('action') || type.includes('worn');

  const prodRefs = product.referenceImages || [];

  // 1. Product Reference Logic
  if (isHero) {
    // Full product shots need general context, ideally front/3/4
    // Send first 5 to give overall shape
    references.push(...prodRefs.slice(0, 5));
  } else if (isLogo) {
    // Logo shots need explicit logo reference if available
    // Heuristic: Try to find images that might be logo shots (rarely tagged in this simplified model, so we take first 2 + branding)
    references.push(...prodRefs.slice(0, 2));
    
  } else if (isDetail) {
    // Detail shots need close ups. 
    // Without tagging, we send a subset to avoid confusing the model with too many "full" shots if we have detail shots.
    // Sending first 3 is a safe fallback.
    references.push(...prodRefs.slice(0, 3));
  } else if (isLifestyle) {
    // Lifestyle needs full product + worn view if available
    references.push(...prodRefs.slice(0, 3));
  } else {
    // Default: send first 3 references
    references.push(...prodRefs.slice(0, 3));
  }
  
  // 2. BRAND ASSET LOGIC (Critical for Consistency)
  // Prioritize "Primary" logo, then fallback to any logo
  const primaryLogo = brandAssets.find(b => b.type === 'logo' && b.name.toLowerCase().includes('primary'));
  const fallbackLogo = brandAssets.find(b => b.type === 'logo');
  
  const selectedLogo = primaryLogo || fallbackLogo;

  // Always add primary logo for brand consistency if we haven't hit the limit
  if (selectedLogo && !references.includes(selectedLogo.url) && references.length < 10) {
    references.push(selectedLogo.url);
  }
  
  // Limit total references to 10 (model constraint)
  return references.slice(0, 10);
}
