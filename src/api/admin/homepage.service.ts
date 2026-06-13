import type { HonoCtx } from '../../@types';
import type { HomepageBanner, HomepageConfig } from '../../utils/homepage';
import { createId } from '@paralleldrive/cuid2';
import { SETTING_KEYS } from '../../models/setting';
import { throwError } from '../../utils';
import { collectFormFile, optionalString, parseBooleanField, parseIntField } from '../../utils/formParse';
import { getHomepageConfig, saveHomepageConfig } from '../../utils/homepage';
import { uploadUserFileToR2 } from '../../utils/r2Upload';
import { getSettingValue, upsertSetting } from '../../utils/settings';

export async function adminGetHomepageSettings(c: HonoCtx) {
  const homepage = await getHomepageConfig(c.var.db);
  const contactInfo = await getSettingValue(c.var.db, SETTING_KEYS.CONTACT_INFO);
  const bankInfo = await getSettingValue(c.var.db, SETTING_KEYS.BANK_INFO);
  return { homepage, contact_info: contactInfo, bank_info: bankInfo };
}

export async function adminUpdateHomepageSettings(
  c: HonoCtx,
  input: {
    features?: HomepageConfig['features'];
    featuredProductIds?: string[];
    thankYou?: HomepageConfig['thankYou'];
    contact_info?: unknown;
  },
) {
  const homepage = await getHomepageConfig(c.var.db);

  if (input.features !== undefined) {
    homepage.features = input.features;
  }
  if (input.featuredProductIds !== undefined) {
    homepage.featuredProductIds = input.featuredProductIds.slice(0, 6);
  }
  if (input.thankYou !== undefined) {
    homepage.thankYou = input.thankYou;
  }

  await saveHomepageConfig(c.var.db, homepage);

  if (input.contact_info !== undefined) {
    await upsertSetting(c.var.db, SETTING_KEYS.CONTACT_INFO, input.contact_info);
  }

  return adminGetHomepageSettings(c);
}

export async function adminCreateBanner(c: HonoCtx, body: Record<string, unknown>) {
  const imageFile = collectFormFile(body, 'image');
  if (!imageFile) return throwError.badRequest('Banner image is required (field `image`)');

  const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'banners', imageFile);

  const homepage = await getHomepageConfig(c.var.db);
  if (homepage.banners.length >= 6) {
    return throwError.validation('Maximum 6 banners allowed');
  }

  const banner: HomepageBanner = {
    id: createId(),
    imageUrl: publicUrl,
    title: optionalString(body['title']) ?? undefined,
    subtitle: optionalString(body['subtitle']) ?? undefined,
    link: optionalString(body['link']) ?? '/products',
    isActive: parseBooleanField(body['isActive'], true),
    sortOrder: parseIntField(body['sortOrder']) ?? homepage.banners.length,
  };

  homepage.banners.push(banner);
  await saveHomepageConfig(c.var.db, homepage);
  return banner;
}

export async function adminUpdateBanner(c: HonoCtx, id: string, body: Record<string, unknown>) {
  const homepage = await getHomepageConfig(c.var.db);
  const index = homepage.banners.findIndex((b) => b.id === id);
  if (index < 0) return throwError.notFound('Banner not found', { id });

  const existing = homepage.banners[index];
  let imageUrl = existing.imageUrl;

  const imageFile = collectFormFile(body, 'image');
  if (imageFile) {
    const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, c.var.jwtPayload.id, 'banners', imageFile);
    imageUrl = publicUrl;
  }

  const updated: HomepageBanner = {
    ...existing,
    imageUrl,
    title: 'title' in body ? (optionalString(body['title']) ?? undefined) : existing.title,
    subtitle: 'subtitle' in body ? (optionalString(body['subtitle']) ?? undefined) : existing.subtitle,
    link: 'link' in body ? (optionalString(body['link']) ?? existing.link) : existing.link,
    isActive: 'isActive' in body ? parseBooleanField(body['isActive'], existing.isActive) : existing.isActive,
    sortOrder: 'sortOrder' in body ? (parseIntField(body['sortOrder']) ?? existing.sortOrder) : existing.sortOrder,
  };

  homepage.banners[index] = updated;
  await saveHomepageConfig(c.var.db, homepage);
  return updated;
}

export async function adminDeleteBanner(c: HonoCtx, id: string) {
  const homepage = await getHomepageConfig(c.var.db);
  const nextBanners = homepage.banners.filter((b) => b.id !== id);
  if (nextBanners.length === homepage.banners.length) {
    return throwError.notFound('Banner not found', { id });
  }
  homepage.banners = nextBanners;
  await saveHomepageConfig(c.var.db, homepage);
  return { success: true };
}
