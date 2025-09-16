import { Router } from 'express';
import { JSONSchemaType } from 'ajv';
import { DataProcessingController, DataProcessingRequest } from '../controllers';
import { jsonParsingMiddleware } from '../middleware';

const router = Router();
const dataProcessingController = new DataProcessingController();

// JSON schema for data processing request validation
const dataProcessingSchema: JSONSchemaType<DataProcessingRequest> = {
  type: 'object',
  properties: {
    data: {
      type: 'object',
      additionalProperties: true
    },
    pythonScript: {
      type: 'string',
      nullable: true
    },
    options: {
      type: 'object',
      nullable: true,
      properties: {
        timeout: {
          type: 'number',
          nullable: true,
          minimum: 1000,
          maximum: 300000 // 5 minutes max
        },
        source: {
          type: 'string',
          nullable: true
        }
      },
      additionalProperties: false
    }
  },
  required: ['data'],
  additionalProperties: false
};

// Routes
router.post(
  '/process',
  jsonParsingMiddleware.parseJsonWithLimits({ maxSize: 2 * 1024 * 1024 }), // 2MB limit
  jsonParsingMiddleware.sanitizeJson(),
  jsonParsingMiddleware.validateJson(dataProcessingSchema),
  dataProcessingController.processData.bind(dataProcessingController)
);

router.get(
  '/processed/:id',
  dataProcessingController.getProcessedData.bind(dataProcessingController)
);

router.get(
  '/processed',
  dataProcessingController.getAllProcessedData.bind(dataProcessingController)
);

router.delete(
  '/processed/:id',
  dataProcessingController.deleteProcessedData.bind(dataProcessingController)
);

export default router;