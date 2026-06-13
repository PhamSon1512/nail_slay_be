import type { HonoCtx } from '../../@types';
import { getPublicSettings } from '../../utils/settings';

export async function getPublicSettingsHandler(c: HonoCtx) {
  return getPublicSettings(c.var.db);
}
