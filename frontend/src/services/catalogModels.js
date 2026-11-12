import { cleanShelfDecor } from "../lib/shelfDecor";
import models from 'virtual:catalog-models';
import { createCatalogImageCache } from './catalogImageCache';

export { models as CATALOG_MODELS };
export const catalogImages = createCatalogImageCache(() => import('./catalogRenderer').then(module => module.createCatalogRenderer()));

export function catalogModelRequest({ item, tint, decor, rot = 0, lit = true, part = 'whole', showLaptop = false }) {
  const spec = models[item];
  if (!spec) return null;
  const options = { key: item, color: spec.tintable === false ? spec.defaultColor : tint || spec.defaultColor,
    rotation: rot, lit, part, showLaptop, ...(cleanShelfDecor(item, decor) && { decor: cleanShelfDecor(item, decor) }) };
  return { id: JSON.stringify(options), options };
}
