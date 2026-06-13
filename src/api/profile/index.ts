import { createAuthRouter } from '../shared/router';
import { ChangePasswordOpenAPI, GetProfileOpenAPI, UpdateProfileOpenAPI } from './openapi';
import { changePassword, getProfile, updateProfile } from './service';

const routes = createAuthRouter();

routes.openapi(GetProfileOpenAPI, async (c) => {
  const data = await getProfile(c);
  return c.json(data, 200);
});

routes.openapi(UpdateProfileOpenAPI, async (c) => {
  const payload = c.req.valid('json');
  const data = await updateProfile(c, payload);
  return c.json(data, 200);
});

routes.openapi(ChangePasswordOpenAPI, async (c) => {
  const payload = c.req.valid('json');
  const data = await changePassword(c, payload);
  return c.json(data, 200);
});

export default routes;
