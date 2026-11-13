import { cleanShelfDecor } from "../lib/shelfDecor";
import { cleanFurnitureColors } from '../lib/furnitureColors';
import { cleanFurnitureDimensions } from '../lib/furnitureDimensions';
import models from 'virtual:catalog-models';
import { createCatalogImageCache } from './catalogImageCache';

export { models as CATALOG_MODELS };
export const catalogImages = createCatalogImageCache(() => import('./catalogRenderer').then(module => module.createCatalogRenderer()));

export function catalogModelRequest({ item, tint, decor, colors, dimensions, rot = 0, lit = true, part = 'whole', showLaptop = false }) {
  const spec = models[item];
  if (!spec) return null;
  const shelfDecor = cleanShelfDecor(item, decor);
  const materialColors = cleanFurnitureColors(item, colors);
  const size = cleanFurnitureDimensions(item, dimensions);
  const options = {
    key: item,
    color: spec.tintable === false ? spec.defaultColor : tint || spec.defaultColor,
    rotation: rot,
    lit,
    part,
    showLaptop,
    ...(shelfDecor && { decor: shelfDecor }),
    ...(materialColors && { colors: materialColors }),
    ...(size && { dimensions: size }),
  };
  return { id: JSON.stringify(options), options };
}
