import { createAuthRouter } from '../shared/router';
import { GetOrderOpenAPI, ListOrdersOpenAPI, UpdateOrderStatusOpenAPI } from './openapi';
import { getOrderById, listOrders, updateOrderStatus } from './service';

const routes = createAuthRouter();

routes.openapi(ListOrdersOpenAPI, async (c) => c.json(await listOrders(c), 200));
routes.openapi(GetOrderOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await getOrderById(c, id), 200);
});
routes.openapi(UpdateOrderStatusOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await updateOrderStatus(c, id, c.req.valid('json')), 200);
});

export default routes;
