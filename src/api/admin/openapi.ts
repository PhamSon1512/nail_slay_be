import { createRoute, z } from '@hono/zod-openapi';
import { jsonSchemaBuilder } from '../../utils';
import { defaultResponseSchema, IdParamSchema } from '../../utils/schema';

const fileBinary = (description: string) => z.any().openapi({ type: 'string', format: 'binary', description });

export const AdminCreateCategoryMultipartSchema = z.object({
  image: fileBinary('Ảnh danh mục (tuỳ chọn). Upload R2 thư mục `categories/`.').optional(),
  code: z.string().min(1).openapi({ description: 'Mã danh mục (bắt buộc), ví dụ: NB-01' }),
  name: z.string().min(1).openapi({ description: 'Tên danh mục (bắt buộc)' }),
  slug: z.string().min(1).openapi({ description: 'Slug URL (bắt buộc)' }),
  parentId: z.string().optional().openapi({ description: 'ID danh mục cha (tuỳ chọn)' }),
});

export const AdminUpdateCategoryMultipartSchema = z.object({
  image: fileBinary('Ảnh mới (tuỳ chọn). Không gửi thì giữ URL ảnh cũ.').optional(),
  code: z.string().min(1).optional().openapi({ description: 'Mã danh mục mới (tuỳ chọn)' }),
  name: z.string().min(1).optional().openapi({ description: 'Tên mới (tuỳ chọn)' }),
  slug: z.string().min(1).optional().openapi({ description: 'Slug mới (tuỳ chọn)' }),
  parentId: z.string().optional().openapi({ description: 'ID danh mục cha mới (tuỳ chọn, gửi rỗng để bỏ cha)' }),
});

export const AdminProductMultipartSchema = z.object({
  categoryId: z.string().openapi({ description: 'ID danh mục (bắt buộc khi tạo mới)' }),
  sku: z.string().openapi({ description: 'SKU sản phẩm (bắt buộc khi tạo mới), ví dụ: NS-Y2K-001' }),
  name: z.string().min(1).openapi({ description: 'Tên sản phẩm (bắt buộc khi tạo mới)' }),
  slug: z.string().min(1).openapi({ description: 'Slug URL (bắt buộc khi tạo mới)' }),
  description: z.string().optional().openapi({ description: 'Mô tả sản phẩm (tuỳ chọn)' }),
  price: z.string().openapi({ description: 'Giá VND (số nguyên dạng text, bắt buộc khi tạo mới)' }),
  originalPrice: z.string().optional().openapi({ description: 'Giá gốc VND (số nguyên dạng text, tuỳ chọn)' }),
  status: z.enum(['active', 'hidden', 'draft']).optional().openapi({ description: 'Trạng thái hiển thị' }),
  variants: z.string().optional().openapi({ description: 'JSON array các biến thể (Product Variant)' }),
  stock: z.string().openapi({ description: 'Tồn kho (số nguyên dạng text, bắt buộc khi tạo mới)' }),
  existingImages: z
    .string()
    .optional()
    .openapi({ description: 'JSON array URL ảnh giữ lại khi cập nhật, ví dụ `["https://..."]`' }),
  images: fileBinary('Ảnh sản phẩm (có thể upload nhiều file cùng tên part `images`).').optional(),
});

export const AdminUpdateUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  accountStatus: z.enum(['active', 'blocked']).optional(),
  blockReason: z.string().optional(),
});

export const AdminUpdateOrderStatusSchema = z.object({
  status: z.enum(['PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED']),
});

export const AdminResolveComplaintSchema = z.object({
  admin_response: z.string().min(1),
  status: z.literal('RESOLVED'),
});

export const AdminUpdateSettingsSchema = z.object({
  banner: z.unknown().optional(),
  contact_info: z.unknown().optional(),
});

const HomepageFeatureSchema = z.object({
  id: z.string(),
  icon: z.enum(['truck', 'shield', 'bag']),
  title: z.string(),
  description: z.string(),
});

const HomepageThankYouStatSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
});

const HomepageThankYouSchema = z.object({
  title: z.string(),
  content: z.string(),
  stats: z.array(HomepageThankYouStatSchema).max(6),
});

export const AdminUpdateHomepageSettingsSchema = z.object({
  features: z.array(HomepageFeatureSchema).optional(),
  featuredProductIds: z.array(z.string()).max(6).optional(),
  thankYou: HomepageThankYouSchema.optional(),
  contact_info: z.unknown().optional(),
});

export const AdminBannerMultipartSchema = z.object({
  image: fileBinary('Ảnh banner (bắt buộc khi tạo mới). Upload R2 thư mục `banners/`.').optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  link: z.string().optional(),
  isActive: z.string().optional().openapi({ description: 'true/false' }),
  sortOrder: z.string().optional(),
});

export const AdminUpdateBankInfoMultipartSchema = z.object({
  bank_name: z.string().min(1).openapi({ description: 'Tên ngân hàng đích (bắt buộc)' }),
  account_number: z.string().min(1).openapi({ description: 'Số tài khoản (bắt buộc)' }),
  account_name: z.string().min(1).openapi({ description: 'Chủ thẻ / tên tài khoản (bắt buộc)' }),
  transfer_content: z
    .string()
    .optional()
    .openapi({ description: 'Nội dung chuyển khoản. Dùng `{order_id}` cho mã đơn. Mặc định: NAILSLAY {order_id}' }),
  qr_image: fileBinary('Ảnh mã QR (bắt buộc lần đầu, tuỳ chọn khi cập nhật). Upload R2 thư mục `settings/qr/`.').optional(),
});

const PaginationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

export const AdminStatsOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/stats',
  security: [{ Bearer: [] }],
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminListUsersOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/users',
  security: [{ Bearer: [] }],
  request: { query: PaginationQuerySchema },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminGetUserOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/users/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminUpdateUserOpenAPI = createRoute({
  method: 'patch',
  tags: ['Admin'],
  path: '/users/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema, body: jsonSchemaBuilder(AdminUpdateUserSchema) },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminDeleteUserOpenAPI = createRoute({
  method: 'delete',
  tags: ['Admin'],
  path: '/users/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.object({ success: z.boolean() })), ...defaultResponseSchema },
});

export const AdminListCategoriesOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/categories',
  security: [{ Bearer: [] }],
  responses: { 200: jsonSchemaBuilder(z.array(z.record(z.string(), z.unknown()))), ...defaultResponseSchema },
});

export const AdminCreateCategoryOpenAPI = createRoute({
  method: 'post',
  tags: ['Admin'],
  path: '/categories',
  summary: 'Tạo danh mục — upload ảnh multipart (tuỳ chọn)',
  description:
    'Gửi `multipart/form-data`: `code`, `name`, `slug` (text, bắt buộc), `parentId` (tuỳ chọn), `image` (file, tuỳ chọn). Ảnh upload R2 (`categories/`).',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': { schema: AdminCreateCategoryMultipartSchema },
      },
    },
  },
  responses: { 201: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminUpdateCategoryOpenAPI = createRoute({
  method: 'put',
  tags: ['Admin'],
  path: '/categories/{id}',
  summary: 'Cập nhật danh mục — multipart',
  description: 'Chỉ gửi các part cần đổi. Có thể đổi code / tên / slug / danh mục cha / ảnh độc lập.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'multipart/form-data': { schema: AdminUpdateCategoryMultipartSchema },
      },
    },
  },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminDeleteCategoryOpenAPI = createRoute({
  method: 'delete',
  tags: ['Admin'],
  path: '/categories/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.object({ success: z.boolean() })), ...defaultResponseSchema },
});

export const AdminListProductsOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/products',
  security: [{ Bearer: [] }],
  request: { query: PaginationQuerySchema },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminCreateProductOpenAPI = createRoute({
  method: 'post',
  tags: ['Admin'],
  path: '/products',
  summary: 'Tạo sản phẩm — upload ảnh multipart',
  description:
    'Gửi `multipart/form-data`: `sku`, giá, thuộc tính (size/form JSON) + `images` (file, có thể nhiều). Ảnh upload R2 (`products/`).',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': { schema: AdminProductMultipartSchema },
      },
    },
  },
  responses: { 201: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminUpdateProductOpenAPI = createRoute({
  method: 'put',
  tags: ['Admin'],
  path: '/products/{id}',
  summary: 'Cập nhật sản phẩm — multipart',
  description:
    'Gửi các field cần đổi. Có thể cập nhật `sku`, `originalPrice`, `sizeOptions`, `formOptions`. `existingImages` = JSON array URL ảnh giữ lại; `images` = file ảnh mới upload.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'multipart/form-data': { schema: AdminProductMultipartSchema.partial() },
      },
    },
  },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminDeleteProductOpenAPI = createRoute({
  method: 'delete',
  tags: ['Admin'],
  path: '/products/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.object({ success: z.boolean() })), ...defaultResponseSchema },
});

export const AdminListOrdersOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/orders',
  security: [{ Bearer: [] }],
  request: { query: PaginationQuerySchema },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminGetOrderOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/orders/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminUpdateOrderStatusOpenAPI = createRoute({
  method: 'patch',
  tags: ['Admin'],
  path: '/orders/{id}/status',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema, body: jsonSchemaBuilder(AdminUpdateOrderStatusSchema) },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminListComplaintsOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/complaints',
  security: [{ Bearer: [] }],
  responses: { 200: jsonSchemaBuilder(z.array(z.record(z.string(), z.unknown()))), ...defaultResponseSchema },
});

export const AdminResolveComplaintOpenAPI = createRoute({
  method: 'patch',
  tags: ['Admin'],
  path: '/complaints/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema, body: jsonSchemaBuilder(AdminResolveComplaintSchema) },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminGetSettingsOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/settings',
  security: [{ Bearer: [] }],
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminUpdateSettingsOpenAPI = createRoute({
  method: 'put',
  tags: ['Admin'],
  path: '/settings',
  summary: 'Cập nhật banner / liên hệ (JSON)',
  description: 'Thông tin ngân hàng + QR dùng `PUT /admin/settings/bank` (multipart).',
  security: [{ Bearer: [] }],
  request: { body: jsonSchemaBuilder(AdminUpdateSettingsSchema) },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminUpdateHomepageSettingsOpenAPI = createRoute({
  method: 'put',
  tags: ['Admin'],
  path: '/settings/homepage',
  summary: 'Cập nhật cấu hình trang chủ (features, sản phẩm nổi bật, liên hệ)',
  security: [{ Bearer: [] }],
  request: { body: jsonSchemaBuilder(AdminUpdateHomepageSettingsSchema) },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminListBannersOpenAPI = createRoute({
  method: 'get',
  tags: ['Admin'],
  path: '/banners',
  security: [{ Bearer: [] }],
  responses: {
    200: jsonSchemaBuilder(z.object({ banners: z.array(z.record(z.string(), z.unknown())) })),
    ...defaultResponseSchema,
  },
});

export const AdminCreateBannerOpenAPI = createRoute({
  method: 'post',
  tags: ['Admin'],
  path: '/banners',
  summary: 'Tạo banner — upload ảnh multipart',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': { schema: AdminBannerMultipartSchema },
      },
    },
  },
  responses: { 201: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminUpdateBannerOpenAPI = createRoute({
  method: 'put',
  tags: ['Admin'],
  path: '/banners/{id}',
  summary: 'Cập nhật banner — multipart',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'multipart/form-data': { schema: AdminBannerMultipartSchema },
      },
    },
  },
  responses: { 200: jsonSchemaBuilder(z.record(z.string(), z.unknown())), ...defaultResponseSchema },
});

export const AdminDeleteBannerOpenAPI = createRoute({
  method: 'delete',
  tags: ['Admin'],
  path: '/banners/{id}',
  security: [{ Bearer: [] }],
  request: { params: IdParamSchema },
  responses: { 200: jsonSchemaBuilder(z.object({ success: z.boolean() })), ...defaultResponseSchema },
});

export const AdminUpdateBankInfoOpenAPI = createRoute({
  method: 'put',
  tags: ['Admin'],
  path: '/settings/bank',
  summary: 'Cập nhật thông tin chuyển khoản + upload QR multipart',
  description:
    'Gửi `multipart/form-data`: `bank_name`, `account_number`, `account_name` (text, bắt buộc), `transfer_content` (tuỳ chọn), `qr_image` (file — bắt buộc lần đầu).',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': { schema: AdminUpdateBankInfoMultipartSchema },
      },
    },
  },
  responses: {
    200: jsonSchemaBuilder(
      z.object({
        bank_info: z.object({
          bank_name: z.string(),
          account_number: z.string(),
          account_name: z.string(),
          transfer_content: z.string(),
          qr_code_url: z.string(),
        }),
      }),
    ),
    ...defaultResponseSchema,
  },
});
