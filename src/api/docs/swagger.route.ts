/**
 * Swagger UI Route
 * Serves interactive API documentation
 */

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPISpec } from './openapi-generator';

const router = Router();

// Generate OpenAPI spec
const openApiSpec = generateOpenAPISpec();

// Swagger UI options
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Rangkai Protocol API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

// Serve Swagger UI at /docs
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec, swaggerUiOptions));

// Also serve raw JSON spec at /docs/json
router.get('/json', (req, res) => {
  res.json(openApiSpec);
});

export default router;