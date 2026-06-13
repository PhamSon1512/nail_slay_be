import { createRouter } from '../shared/router';
import { GetProductOpenAPI, ListProductsOpenAPI } from './openapi';
import { getProductBySlug, listProducts } from './service';

const routes = createRouter();

routes.openapi(ListProductsOpenAPI, async (c) => {
  const query = c.req.valid('query');
  const data = await listProducts(c, query);
  return c.json(data, 200);
});

routes.openapi(GetProductOpenAPI, async (c) => {
  const { slug } = c.req.valid('param');
  const data = await getProductBySlug(c, slug);
  return c.json(data, 200);
});

export default routes;
