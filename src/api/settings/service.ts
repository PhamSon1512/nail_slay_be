import type { HonoCtx } from '../../@types';
import { getCachedJson } from '../../utils/cache';
import { getPublicSettings } from '../../utils/settings';

export async function getPublicSettingsHandler(c: HonoCtx) {
  return getCachedJson(c.env.CACHE, 'public:settings:v1', 300, () => getPublicSettings(c.var.db));
}
