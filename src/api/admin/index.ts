import { getHomepageConfig } from '../../utils/homepage';
import { createAdminRouter } from '../shared/router';
import {
  adminCreateArticle,
  adminDeleteArticle,
  adminListArticles,
  adminUpdateArticle,
  adminUploadContentImage,
} from './articles.service';
import {
  adminCreateBanner,
  adminDeleteBanner,
  adminGetHomepageSettings,
  adminUpdateBanner,
  adminUpdateHomepageSettings,
} from './homepage.service';
import {
  AdminCreateArticleOpenAPI,
  AdminCreateBannerOpenAPI,
  AdminCreateCategoryOpenAPI,
  AdminCreateProductOpenAPI,
  AdminDeleteArticleOpenAPI,
  AdminDeleteBannerOpenAPI,
  AdminDeleteCategoryOpenAPI,
  AdminDeleteProductOpenAPI,
  AdminDeleteUserOpenAPI,
  AdminGetOrderOpenAPI,
  AdminGetSettingsOpenAPI,
  AdminGetUserOpenAPI,
  AdminListArticlesOpenAPI,
  AdminListBannersOpenAPI,
  AdminListCategoriesOpenAPI,
  AdminListComplaintsOpenAPI,
  AdminListOrdersOpenAPI,
  AdminListProductsOpenAPI,
  AdminListUsersOpenAPI,
  AdminResolveComplaintOpenAPI,
  AdminStatsOpenAPI,
  AdminUpdateArticleOpenAPI,
  AdminUpdateBankInfoOpenAPI,
  AdminUpdateBannerOpenAPI,
  AdminUpdateCategoryOpenAPI,
  AdminUpdateHomepageSettingsOpenAPI,
  AdminUpdateOrderStatusOpenAPI,
  AdminUpdateProductOpenAPI,
  AdminUpdateSettingsOpenAPI,
  AdminUpdateUserOpenAPI,
  AdminUploadContentImageOpenAPI,
} from './openapi';
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetOrder,
  adminListOrders,
  adminListProducts,
  adminUpdateOrderStatus,
  adminUpdateProduct,
} from './products.service';
import {
  adminGetSettings,
  adminListComplaints,
  adminResolveComplaint,
  adminStats,
  adminUpdateBankInfo,
  adminUpdateSettings,
} from './settings.service';
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminDeleteUser,
  adminGetUser,
  adminListCategories,
  adminListUsers,
  adminUpdateCategory,
  adminUpdateUser,
} from './users.service';

const routes = createAdminRouter();

routes.openapi(AdminStatsOpenAPI, async (c) => c.json(await adminStats(c), 200));

routes.openapi(AdminListUsersOpenAPI, async (c) => c.json(await adminListUsers(c, c.req.valid('query')), 200));
routes.openapi(AdminGetUserOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminGetUser(c, id), 200);
});
routes.openapi(AdminUpdateUserOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminUpdateUser(c, id, c.req.valid('json')), 200);
});
routes.openapi(AdminDeleteUserOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminDeleteUser(c, id), 200);
});

routes.openapi(AdminListCategoriesOpenAPI, async (c) => c.json(await adminListCategories(c), 200));
routes.openapi(AdminCreateCategoryOpenAPI, async (c) => {
  const body = await c.req.parseBody();
  return c.json(await adminCreateCategory(c, body as Record<string, unknown>), 201);
});
routes.openapi(AdminUpdateCategoryOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  const body = await c.req.parseBody();
  return c.json(await adminUpdateCategory(c, id, body as Record<string, unknown>), 200);
});
routes.openapi(AdminDeleteCategoryOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminDeleteCategory(c, id), 200);
});

routes.openapi(AdminListProductsOpenAPI, async (c) => c.json(await adminListProducts(c, c.req.valid('query')), 200));
routes.openapi(AdminCreateProductOpenAPI, async (c) => {
  const body = await c.req.parseBody({ all: true });
  return c.json(await adminCreateProduct(c, body as Record<string, unknown>), 201);
});
routes.openapi(AdminUpdateProductOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  const body = await c.req.parseBody({ all: true });
  return c.json(await adminUpdateProduct(c, id, body as Record<string, unknown>), 200);
});
routes.openapi(AdminDeleteProductOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminDeleteProduct(c, id), 200);
});

routes.openapi(AdminListArticlesOpenAPI, async (c) => c.json(await adminListArticles(c, c.req.valid('query')), 200));
routes.openapi(AdminCreateArticleOpenAPI, async (c) => {
  const body = await c.req.parseBody({ all: true });
  return c.json(await adminCreateArticle(c, body as Record<string, unknown>), 201);
});
routes.openapi(AdminUpdateArticleOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  const body = await c.req.parseBody({ all: true });
  return c.json(await adminUpdateArticle(c, id, body as Record<string, unknown>), 200);
});
routes.openapi(AdminDeleteArticleOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminDeleteArticle(c, id), 200);
});
routes.openapi(AdminUploadContentImageOpenAPI, async (c) => {
  const body = await c.req.parseBody({ all: true });
  return c.json(await adminUploadContentImage(c, body as Record<string, unknown>), 200);
});

routes.openapi(AdminListOrdersOpenAPI, async (c) => c.json(await adminListOrders(c, c.req.valid('query')), 200));
routes.openapi(AdminGetOrderOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminGetOrder(c, id), 200);
});
routes.openapi(AdminUpdateOrderStatusOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminUpdateOrderStatus(c, id, c.req.valid('json').status), 200);
});

routes.openapi(AdminListComplaintsOpenAPI, async (c) => c.json(await adminListComplaints(c), 200));
routes.openapi(AdminResolveComplaintOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminResolveComplaint(c, id, c.req.valid('json')), 200);
});

routes.openapi(AdminGetSettingsOpenAPI, async (c) => c.json(await adminGetHomepageSettings(c), 200));
routes.openapi(AdminUpdateSettingsOpenAPI, async (c) => c.json(await adminUpdateSettings(c, c.req.valid('json')), 200));
routes.openapi(AdminUpdateHomepageSettingsOpenAPI, async (c) =>
  c.json(await adminUpdateHomepageSettings(c, c.req.valid('json')), 200),
);
routes.openapi(AdminListBannersOpenAPI, async (c) => {
  const homepage = await getHomepageConfig(c.var.db);
  return c.json({ banners: homepage.banners }, 200);
});
routes.openapi(AdminCreateBannerOpenAPI, async (c) => {
  const body = await c.req.parseBody();
  return c.json(await adminCreateBanner(c, body as Record<string, unknown>), 201);
});
routes.openapi(AdminUpdateBannerOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  const body = await c.req.parseBody();
  return c.json(await adminUpdateBanner(c, id, body as Record<string, unknown>), 200);
});
routes.openapi(AdminDeleteBannerOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await adminDeleteBanner(c, id), 200);
});
routes.openapi(AdminUpdateBankInfoOpenAPI, async (c) => {
  const body = await c.req.parseBody();
  return c.json(await adminUpdateBankInfo(c, body as Record<string, unknown>), 200);
});

export default routes;
