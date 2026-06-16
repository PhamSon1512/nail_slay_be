import { createRouter } from '../shared/router';
import { GetArticleOpenAPI, ListArticlesOpenAPI } from './openapi';
import { getArticleBySlug, listArticles } from './service';

const routes = createRouter();

routes.openapi(ListArticlesOpenAPI, async (c) => {
  const query = c.req.valid('query');
  return c.json(await listArticles(c, query), 200);
});

routes.openapi(GetArticleOpenAPI, async (c) => {
  const { slug } = c.req.valid('param');
  return c.json(await getArticleBySlug(c, slug), 200);
});

export default routes;
