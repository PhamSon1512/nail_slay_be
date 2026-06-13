import { createAuthRouter } from '../shared/router';
import { CreateAddressOpenAPI, DeleteAddressOpenAPI, ListAddressesOpenAPI, UpdateAddressOpenAPI } from './openapi';
import { createAddress, deleteAddress, listAddresses, updateAddress } from './service';

const routes = createAuthRouter();

routes.openapi(ListAddressesOpenAPI, async (c) => c.json(await listAddresses(c), 200));
routes.openapi(CreateAddressOpenAPI, async (c) => c.json(await createAddress(c, c.req.valid('json')), 201));
routes.openapi(UpdateAddressOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await updateAddress(c, id, c.req.valid('json')), 200);
});
routes.openapi(DeleteAddressOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await deleteAddress(c, id), 200);
});

export default routes;
