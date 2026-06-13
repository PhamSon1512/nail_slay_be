import { createAuthRouter, createRateLimitedRouter } from '../shared/router';
import {
  ForgotPasswordOpenAPI,
  GenerateTokenOpenAPI,
  GetMeOpenAPI,
  LoginOpenAPI,
  LogoutOpenAPI,
  RegisterOpenAPI,
  SignupOpenAPI,
  UpdateMeOpenAPI,
} from './openapi';
import { forgotPassword, getMe, login, logout, refreshToken, register, signup, updateMe } from './service';

const publicRoutes = createRateLimitedRouter();
const protectedRoutes = createAuthRouter();

publicRoutes.openapi(LoginOpenAPI, async (c) => {
  const body = c.req.valid('json');
  const data = await login(c, body);
  return c.json(data, 200);
});

publicRoutes.openapi(RegisterOpenAPI, async (c) => {
  const body = c.req.valid('json');
  const data = await register(c, body);
  return c.json(data, 201);
});

publicRoutes.openapi(ForgotPasswordOpenAPI, async (c) => {
  const body = c.req.valid('json');
  const data = await forgotPassword(c, body);
  return c.json(data, 202);
});

publicRoutes.openapi(SignupOpenAPI, async (c) => {
  const body = c.req.valid('json');
  const data = await signup(c, body);
  return c.json(data, 201);
});

publicRoutes.openapi(GenerateTokenOpenAPI, async (c) => {
  const data = await refreshToken(c);
  return c.json(data, 200);
});

protectedRoutes.openapi(LogoutOpenAPI, async (c) => {
  const data = await logout(c);
  return c.json(data, 200);
});

protectedRoutes.openapi(GetMeOpenAPI, async (c) => {
  const data = await getMe(c);
  return c.json(data, 200);
});

protectedRoutes.openapi(UpdateMeOpenAPI, async (c) => {
  const body = c.req.valid('json');
  const data = await updateMe(c, body);
  return c.json(data, 200);
});

const routes = createRateLimitedRouter();
routes.route('/', publicRoutes);
routes.route('/', protectedRoutes);

export default routes;
