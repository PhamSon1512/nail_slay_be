import { createRouter } from '../shared/router';
import { GetPublicSettingsOpenAPI } from './openapi';
import { getPublicSettingsHandler } from './service';

const routes = createRouter();

routes.openapi(GetPublicSettingsOpenAPI, async (c) => {
  const data = await getPublicSettingsHandler(c);
  return c.json(data, 200);
});

export default routes;
