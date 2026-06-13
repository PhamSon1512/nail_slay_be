import { createAuthRouter } from '../shared/router';
import { UploadComplaintOpenAPI } from './openapi';
import { uploadComplaintImage } from './service';

const routes = createAuthRouter();

routes.openapi(UploadComplaintOpenAPI, async (c) => c.json(await uploadComplaintImage(c), 201));

export default routes;
