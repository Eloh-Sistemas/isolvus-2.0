import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry.js';

// IMPORTA TODAS AS DOCS (APENAS DECLARAÇÃO)
import './solicitacaoDespesa.swagger.js';

export function generateSwaggerDoc() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'API Isolvus',
      version: '10.0.30',
      description: 'API DO SISTEMA ISOLVUS ERP',
      contact: {
        name: 'Equipe Técnica Isolvus',
        email: 'crsampler96@gmail.com',
        url: 'http://localhost:3000/'
      }

    },
    servers: [
      { url: 'http://localhost:3011/v1' }
    ]
  });
}
