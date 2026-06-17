import type { Bindings, Variables } from '../../@types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { auth, rbac } from '../../middlewares';
import { AdminReplyReviewOpenAPI, CreateReviewOpenAPI, ListProductReviewsOpenAPI } from './openapi';
import { ReviewService } from './service';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

routes.openapi(CreateReviewOpenAPI, async (c) => {
  const body = c.req.valid('json');
  const service = new ReviewService(c.var.db);
  const result = await service.createReview(c.var.jwtPayload.id, body);
  return c.json(result, 201);
});

routes.openapi(ListProductReviewsOpenAPI, async (c) => {
  const { productId } = c.req.valid('param');
  const { limit, offset } = c.req.valid('query');
  const service = new ReviewService(c.var.db);
  const result = await service.getReviewsByProduct(productId, parseInt(limit, 10), parseInt(offset, 10));
  return c.json(
    {
      data: result.data,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        total: result.total,
      },
    },
    200,
  );
});

routes.openapi(AdminReplyReviewOpenAPI, async (c) => {
  const authMw = auth(c, async () => {
    const rbacMw = rbac('admin')(c, async () => {
      const { id } = c.req.valid('param');
      const { adminReply } = c.req.valid('json');
      const service = new ReviewService(c.var.db);
      const result = await service.replyToReview(id, adminReply);
      return c.json(result, 200);
    });
    return rbacMw;
  });
  return authMw;
});

export default routes;
