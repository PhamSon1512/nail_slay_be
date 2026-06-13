import type { DrizzleDb } from '../db';
import { createId } from '@paralleldrive/cuid2';
import { SETTING_KEYS } from '../models/setting';
import { getSettingValue, upsertSetting } from './settings';

export type HomepageBanner = {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  link?: string;
  isActive: boolean;
  sortOrder: number;
};

export type HomepageFeature = {
  id: string;
  icon: 'truck' | 'shield' | 'bag';
  title: string;
  description: string;
};

export type HomepageThankYouStat = {
  id: string;
  value: string;
  label: string;
};

export type HomepageThankYou = {
  title: string;
  content: string;
  stats: HomepageThankYouStat[];
};

export type HomepageConfig = {
  banners: HomepageBanner[];
  features: HomepageFeature[];
  featuredProductIds: string[];
  thankYou: HomepageThankYou;
};

export const DEFAULT_HOMEPAGE_FEATURES: HomepageFeature[] = [
  {
    id: 'feat-1',
    icon: 'truck',
    title: 'Giao nhanh toàn quốc',
    description: 'Nhận hàng sau 2–3 ngày làm việc.',
  },
  {
    id: 'feat-2',
    icon: 'shield',
    title: 'An toàn cho móng',
    description: 'Chất liệu đã qua kiểm định, dễ sử dụng tại nhà.',
  },
  {
    id: 'feat-3',
    icon: 'bag',
    title: 'Nail box theo style',
    description: 'Đa dạng bộ sưu tập: Y2K, tiểu thư, công sở.',
  },
];

export const DEFAULT_HOMEPAGE_THANK_YOU: HomepageThankYou = {
  title: 'Cảm ơn bạn đã tin chọn Nail Slay!',
  content:
    'Hàng ngàn khách hàng đã trải nghiệm và hài lòng với Nail Slay. Chúng tôi tự hào mang đến những thiết kế nail box thủ công tinh xảo, chuẩn form, bền đẹp như ngoài tiệm. Tự tin tỏa sáng mọi lúc mọi nơi!',
  stats: [
    { id: 'stat-1', value: '10k+', label: 'Khách hàng' },
    { id: 'stat-2', value: '500+', label: 'Mẫu thiết kế' },
    { id: 'stat-3', value: '100%', label: 'Làm thủ công' },
    { id: 'stat-4', value: '5★', label: 'Đánh giá tốt' },
  ],
};

export const EMPTY_HOMEPAGE_CONFIG: HomepageConfig = {
  banners: [],
  features: DEFAULT_HOMEPAGE_FEATURES,
  featuredProductIds: [],
  thankYou: DEFAULT_HOMEPAGE_THANK_YOU,
};

function normalizeThankYouStat(raw: unknown): HomepageThankYouStat | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const value = typeof item.value === 'string' ? item.value.trim() : '';
  const label = typeof item.label === 'string' ? item.label.trim() : '';
  if (!value || !label) return null;
  return {
    id: typeof item.id === 'string' ? item.id : createId(),
    value,
    label,
  };
}

function normalizeThankYou(raw: unknown): HomepageThankYou {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_HOMEPAGE_THANK_YOU };

  const data = raw as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const content = typeof data.content === 'string' ? data.content.trim() : '';
  const stats = Array.isArray(data.stats)
    ? data.stats.map(normalizeThankYouStat).filter((s): s is HomepageThankYouStat => Boolean(s))
    : [];

  return {
    title: title || DEFAULT_HOMEPAGE_THANK_YOU.title,
    content: content || DEFAULT_HOMEPAGE_THANK_YOU.content,
    stats: stats.length ? stats.slice(0, 6) : DEFAULT_HOMEPAGE_THANK_YOU.stats,
  };
}

function normalizeBanner(raw: unknown): HomepageBanner | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl : '';
  if (!imageUrl) return null;
  return {
    id: typeof item.id === 'string' ? item.id : createId(),
    imageUrl,
    title: typeof item.title === 'string' ? item.title : undefined,
    subtitle: typeof item.subtitle === 'string' ? item.subtitle : undefined,
    link: typeof item.link === 'string' ? item.link : undefined,
    isActive: item.isActive !== false,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
  };
}

export function normalizeHomepageConfig(raw: unknown): HomepageConfig {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_HOMEPAGE_CONFIG };

  const data = raw as Record<string, unknown>;
  const banners = Array.isArray(data.banners)
    ? data.banners.map(normalizeBanner).filter((b): b is HomepageBanner => Boolean(b))
    : [];

  const features = Array.isArray(data.features)
    ? (data.features as HomepageFeature[]).filter((f) => f?.id && f?.title)
    : DEFAULT_HOMEPAGE_FEATURES;

  const featuredProductIds = Array.isArray(data.featuredProductIds)
    ? data.featuredProductIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    banners: banners.sort((a, b) => a.sortOrder - b.sortOrder),
    features: features.length ? features : DEFAULT_HOMEPAGE_FEATURES,
    featuredProductIds: featuredProductIds.slice(0, 6),
    thankYou: normalizeThankYou(data.thankYou),
  };
}

export async function getHomepageConfig(db: DrizzleDb): Promise<HomepageConfig> {
  const stored = await getSettingValue<unknown>(db, SETTING_KEYS.HOMEPAGE);
  return normalizeHomepageConfig(stored);
}

export async function saveHomepageConfig(db: DrizzleDb, config: HomepageConfig) {
  const normalized = normalizeHomepageConfig(config);
  await upsertSetting(db, SETTING_KEYS.HOMEPAGE, normalized);
  return normalized;
}
