import { createRouter } from '../shared/router';
import { ListCategoriesOpenAPI } from './openapi';
import { listCategories } from './service';

const routes = createRouter();

routes.openapi(ListCategoriesOpenAPI, async (c) => {
  const data = await listCategories(c);
  return c.json(data, 200);
});

export default routes;
