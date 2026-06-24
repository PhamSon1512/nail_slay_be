import type { HonoApp } from './shared/router';
import AddressesRoutes from './addresses';
import AdminRoutes from './admin';
import ArticlesRoutes from './articles';
import AuthRoutes from './auth';
import CartRoutes from './cart';
import CategoriesRoutes from './categories';
import CheckoutRoutes from './checkout';
import MediaRoutes from './media';
import OrdersRoutes from './orders';
import ProductsRoutes from './products';
import ProfileRoutes from './profile';
import ReviewsRoutes from './reviews';
import SettingsRoutes from './settings';
import { createRouter } from './shared/router';
import UploadRoutes from './upload';
import UsersRoutes from './users';

/** Register all API routes on the given app (prefix mount — matches admin pattern, works on Workers). */
export function registerApiRoutes(app: HonoApp) {
  app.route('/auth', AuthRoutes);
  app.route('/media', MediaRoutes);
  app.route('/profile', ProfileRoutes);
  app.route('/users', UsersRoutes);
  app.route('/categories', CategoriesRoutes);
  app.route('/products', ProductsRoutes);
  app.route('/articles', ArticlesRoutes);
  app.route('/settings', SettingsRoutes);
  app.route('/cart', CartRoutes);
  app.route('/checkout', CheckoutRoutes);
  app.route('/orders', OrdersRoutes);
  app.route('/addresses', AddressesRoutes);
  app.route('/upload', UploadRoutes);
  app.route('/admin', AdminRoutes);
  app.route('/reviews', ReviewsRoutes);
}

const routes = createRouter();
registerApiRoutes(routes);

export default routes;
