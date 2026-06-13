import { createAuthRouter } from '../shared/router';
import { AddCartItemOpenAPI, DeleteCartItemOpenAPI, GetCartOpenAPI, UpdateCartItemOpenAPI } from './openapi';
import { addCartItem, deleteCartItem, getCart, updateCartItem } from './service';

const routes = createAuthRouter();

routes.openapi(GetCartOpenAPI, async (c) => c.json(await getCart(c), 200));
routes.openapi(AddCartItemOpenAPI, async (c) => c.json(await addCartItem(c, c.req.valid('json')), 201));
routes.openapi(UpdateCartItemOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await updateCartItem(c, id, c.req.valid('json')), 200);
});
routes.openapi(DeleteCartItemOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await deleteCartItem(c, id), 200);
});

export default routes;
