import { LAMP_BUILDERS } from './lamp-models.mjs';
import { DECORATIVE_LIGHT_BUILDERS } from './decorative-lights.mjs';
import { fireplace } from './fireplace-model.mjs';

export const LIGHTING_BUILDERS = { ...LAMP_BUILDERS, ...DECORATIVE_LIGHT_BUILDERS, fireplace };
