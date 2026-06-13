import { createAuthRouter } from '../shared/router';
import { CheckoutOpenAPI } from './openapi';
import { checkout } from './service';

const routes = createAuthRouter();

routes.openapi(CheckoutOpenAPI, async (c) => c.json(await checkout(c, c.req.valid('json')), 201));

export default routes;
