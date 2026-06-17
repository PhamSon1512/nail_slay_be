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

const routes = createRouter();

routes.route('/auth', AuthRoutes);
routes.route('/media', MediaRoutes);
routes.route('/profile', ProfileRoutes);
routes.route('/users', UsersRoutes);
routes.route('/categories', CategoriesRoutes);
routes.route('/products', ProductsRoutes);
routes.route('/articles', ArticlesRoutes);
routes.route('/settings', SettingsRoutes);
routes.route('/cart', CartRoutes);
routes.route('/checkout', CheckoutRoutes);
routes.route('/orders', OrdersRoutes);
routes.route('/addresses', AddressesRoutes);
routes.route('/upload', UploadRoutes);
routes.route('/admin', AdminRoutes);
routes.route('/reviews', ReviewsRoutes);

export default routes;
