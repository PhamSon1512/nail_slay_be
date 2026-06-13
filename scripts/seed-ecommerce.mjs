#!/usr/bin/env node
// Seed e-commerce data: categories, products, settings
// Run: node scripts/seed-ecommerce.mjs [--remote]

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createId } from '@paralleldrive/cuid2';
import { Command } from 'commander';
import chalk from 'chalk';

const WRANGLER_PATH = new URL('../wrangler.jsonc', import.meta.url);

function readWranglerDbName() {
  try {
    const raw = readFileSync(WRANGLER_PATH, 'utf8');
    const stripped = raw.replace(/^(\s*)\/\/.*$/gm, '');
    const json = JSON.parse(stripped);
    return json.d1_databases?.[0]?.database_name;
  } catch {
    return undefined;
  }
}

const program = new Command();
program
  .name('seed-ecommerce')
  .description('Seed categories, products, and settings for NailSlay e-commerce')
  .option('-r, --remote', 'Target remote D1', false)
  .option('-d, --db <name>', 'D1 database name', readWranglerDbName())
  .parse();

const opts = program.opts();
const IS_REMOTE = opts.remote;
const DB_NAME = opts.db;

function sqlEscape(str) {
  return String(str).replace(/'/g, "''");
}

function d1Exec(sql) {
  const remoteFlag = IS_REMOTE ? ' --remote' : '';
  execSync(`npx wrangler d1 execute ${DB_NAME} --command="${sql.replace(/"/g, '\\"')}"${remoteFlag}`, {
    stdio: 'inherit',
  });
}

const now = Math.floor(Date.now() / 1000);

const categoriesSeed = [
  { id: createId(), code: 'NB-01', name: 'NAIL BOX THIET KE', slug: 'nail-box-thiet-ke', parentSlug: null },
  { id: createId(), code: 'NB-Y2K', name: 'Style Ca Tinh & Y2K', slug: 'style-ca-tinh-y2k', parentSlug: 'nail-box-thiet-ke' },
  { id: createId(), code: 'NB-TT', name: 'Style Tieu Thu & Dinh Da', slug: 'style-tieu-thu-dinh-da', parentSlug: 'nail-box-thiet-ke' },
  { id: createId(), code: 'NB-CS', name: 'Style Nhe Nhang & Cong So', slug: 'style-nhe-nhang-cong-so', parentSlug: 'nail-box-thiet-ke' },
  { id: createId(), code: 'PK-02', name: 'PHU KIEN MONG', slug: 'phu-kien-mong', parentSlug: null },
];

const categoryMap = Object.fromEntries(categoriesSeed.map((c) => [c.slug, c.id]));

const settingsData = [
  [
    'homepage',
    JSON.stringify({
      banners: [],
      features: [
        {
          id: 'feat-1',
          icon: 'truck',
          title: 'Giao nhanh toan quoc',
          description: 'Nhan hang sau 2-3 ngay lam viec.',
        },
        {
          id: 'feat-2',
          icon: 'shield',
          title: 'An toan cho mong',
          description: 'Chat lieu da qua kiem dinh, de su dung tai nha.',
        },
        {
          id: 'feat-3',
          icon: 'bag',
          title: 'Nail box theo style',
          description: 'Da dang bo suu tap: Y2K, tieu thu, cong so.',
        },
      ],
      featuredProductIds: [],
    }),
  ],
  [
    'contact_info',
    JSON.stringify({
      phone: '0901234567',
      email: 'hello@nailslay.vn',
      address: 'TP. Ho Chi Minh, Viet Nam',
    }),
  ],
  ['qr_code_url', JSON.stringify('')],
  [
    'bank_info',
    JSON.stringify({
      bank_name: 'Vietcombank',
      account_number: '1234567890',
      account_name: 'NAIL SLAY CO LTD',
      transfer_content: 'NAILSLAY {order_id}',
      qr_code_url: '',
    }),
  ],
];

const settingsSql = settingsData
  .map(([key, value]) => {
    const id = createId();
    return `INSERT OR IGNORE INTO settings (id, key, value, created_at) VALUES ('${id}', '${key}', '${sqlEscape(value)}', ${now});`;
  })
  .join(' ');

const categoriesSql = categoriesSeed
  .map(
    (cat) => {
      const parentId = cat.parentSlug ? categoryMap[cat.parentSlug] : null;
      return `INSERT OR IGNORE INTO categories (id, code, name, slug, parent_id, image_url, created_at) VALUES ('${cat.id}', '${cat.code}', '${sqlEscape(
        cat.name,
      )}', '${cat.slug}', ${parentId ? `'${parentId}'` : 'NULL'}, '/branding/brand-board.png', ${now});`;
    },
  )
  .join(' ');

const productsSql = [
  `INSERT OR IGNORE INTO products (id, category_id, sku, name, slug, description, price, original_price, size_options, form_options, stock, image_urls, created_at) VALUES ('${createId()}', '${categoryMap['style-ca-tinh-y2k']}', 'NS-Y2K-001', 'Nail Box Nailslay - Cyber Slay', 'nail-box-cyber-slay', 'Mang dam phong cach Y2K va vi lai (Futuristic). Su ket hop giua son thach den, line bac metallic va dinh xich ca tinh. Phu hop cho tiec tung, di club hoac chup anh concept.', 149000, 199000, '["XS","S","M","L"]', '["Nhon","Thang"]', 48, '["/branding/banner-web.png"]', ${now});`,
  `INSERT OR IGNORE INTO products (id, category_id, sku, name, slug, description, price, original_price, size_options, form_options, stock, image_urls, created_at) VALUES ('${createId()}', '${categoryMap['style-ca-tinh-y2k']}', 'NS-Y2K-002', 'Nail Box Nailslay - Pink Punk', 'nail-box-pink-punk', 'Su noi loan ngot ngao voi su pha tron giua mau hong neon va den metallic. Hoa tiet lua ket hop dinh khuyen mong trend. Danh cho co nang muon chiem spotlight.', 135000, 180000, '["XS","S","M","L"]', '["Thang","Tron vuong"]', 40, '["/branding/banner-web.png"]', ${now});`,
  `INSERT OR IGNORE INTO products (id, category_id, sku, name, slug, description, price, original_price, size_options, form_options, stock, image_urls, created_at) VALUES ('${createId()}', '${categoryMap['style-tieu-thu-dinh-da']}', 'NS-TT-001', 'Nail Box Nailslay - Glitz & Glam', 'nail-box-glitz-and-glam', 'Tuyet tac danh cho nang dau hoac di tiec sang. Nen son thach hong ombre trang tu nhien, dinh da khoi swarovski va no ngoc trai cao cap.', 199000, 250000, '["XS","S","M","L"]', '["Nhon dai","Thang"]', 30, '["/branding/banner-web.png"]', ${now});`,
  `INSERT OR IGNORE INTO products (id, category_id, sku, name, slug, description, price, original_price, size_options, form_options, stock, image_urls, created_at) VALUES ('${createId()}', '${categoryMap['style-tieu-thu-dinh-da']}', 'NS-TT-002', 'Nail Box Nailslay - Aurora Dream', 'nail-box-aurora-dream', 'Hieu ung xa cu cau vong (Aurora) doi mau theo goc nhin. Diem xuyet ngoc trai nho va an xa cu tu nhien duoi lop gel trong suot.', 169000, 210000, '["XS","S","M","L"]', '["Tron nhon","Oval"]', 28, '["/branding/banner-web.png"]', ${now});`,
  `INSERT OR IGNORE INTO products (id, category_id, sku, name, slug, description, price, original_price, size_options, form_options, stock, image_urls, created_at) VALUES ('${createId()}', '${categoryMap['style-nhe-nhang-cong-so']}', 'NS-CS-001', 'Nail Box Nailslay - Milk Tea Chiffon', 'nail-box-milk-tea-chiffon', 'Mang tone mau tra sua nude nhe nhang, ton da. Hoa tiet blush nails ket hop vien nhu vang thanh lich, thich hop di hoc di lam hang ngay.', 129000, 160000, '["XS","S","M","L"]', '["Tron vuong","Oval"]', 55, '["/branding/banner-web.png"]', ${now});`,
  `INSERT OR IGNORE INTO products (id, category_id, sku, name, slug, description, price, original_price, size_options, form_options, stock, image_urls, created_at) VALUES ('${createId()}', '${categoryMap['phu-kien-mong']}', 'NS-PK-001', 'Combo Dung Cu Dan Mong Hoan Hao (Nailslay Care Kit)', 'nailslay-care-kit', 'Bo phu kien giup tu dan va thao mong tai nha, gom keo nuoc, keo silicon, dua mini, que day da chet va bong tam con.', 29000, 50000, '[]', '[]', 200, '["/branding/brand-board.png"]', ${now});`,
].join(' ');

console.log(chalk.bold('\n🌱 Seeding e-commerce data...\n'));

try {
  d1Exec(settingsSql);
  d1Exec(categoriesSql);
  d1Exec(productsSql);
  console.log(chalk.green('\n✅ E-commerce seed completed!\n'));
} catch (err) {
  console.error(chalk.red('\n❌ Seed failed:'), err.message);
  process.exit(1);
}
