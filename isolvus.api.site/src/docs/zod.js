import { z as baseZod } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(baseZod);

export const z = baseZod;
