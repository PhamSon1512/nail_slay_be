import type { HonoCtx } from '../../@types';
import { throwError } from '../../utils';
import { uploadUserFileToR2 } from '../../utils/r2Upload';

export async function uploadComplaintImage(c: HonoCtx) {
  const userId = c.var.jwtPayload.id!;
  const body = await c.req.parseBody();
  const file = body['file'] as File;

  if (!file) return throwError.badRequest('No file uploaded');
  if (file.size <= 0) return throwError.badRequest('File is empty');

  const { publicUrl } = await uploadUserFileToR2(c.var.db, c.env, userId, `complaints/${userId}`, file);

  return { url: publicUrl, fileName: file.name, fileType: file.type };
}
