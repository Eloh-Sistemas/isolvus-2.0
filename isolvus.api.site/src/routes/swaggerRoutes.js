import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateSwaggerDoc } from '../docs/swagger.js';

const router = express.Router();

router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(generateSwaggerDoc())
);

export default router;
