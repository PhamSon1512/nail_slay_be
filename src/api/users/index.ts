import { createAuthRouter } from '../shared/router';
import { CreateOpenAPI, ProfileOpenAPI } from './openapi';
import { createUser, getProfile } from './service';

const routes = createAuthRouter();

routes.openapi(ProfileOpenAPI, async (c) => {
  const data = await getProfile(c);
  return c.json(data, 200);
});

routes.openapi(CreateOpenAPI, async (c) => {
  const payload = c.req.valid('json');
  const data = await createUser(c, payload);
  return c.json(data, 201);
});

export default routes;
