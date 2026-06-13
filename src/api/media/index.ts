import { createAuthRouter } from '../shared/router';
import { DownloadOpenAPI, UploadOpenAPI } from './openapi';
import { getMediaForDownload, uploadMedia } from './service';

const routes = createAuthRouter();

routes.openapi(UploadOpenAPI, async (c) => {
  const data = await uploadMedia(c);
  return c.json(data, 201);
});

routes.openapi(DownloadOpenAPI, async (c) => {
  const { id } = c.req.valid('param');
  const { body, fileType, fileName } = await getMediaForDownload(c, id);
  return new Response(body, {
    headers: {
      'Content-Type': fileType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
});

export default routes;
