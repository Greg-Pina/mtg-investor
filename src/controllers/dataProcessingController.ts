import { Request, Response } from 'express';
import { ProcessedDataModel, IProcessedData } from '../models';
import { PythonService, PythonExecutionResult } from '../services';
import { ValidatedRequest } from '../middleware';

export interface DataProcessingRequest {
  data: Record<string, any>;
  pythonScript?: string;
  options?: {
    timeout?: number;
    source?: string;
  };
}

export class DataProcessingController {
  private pythonService: PythonService;

  constructor() {
    this.pythonService = PythonService.getInstance();
  }

  /**
   * Process incoming JSON data with optional Python processing
   */
  public async processData(req: ValidatedRequest<DataProcessingRequest>, res: Response): Promise<void> {
    try {
      const { data, pythonScript, options } = req.validatedData!;
      const startTime = Date.now();

      // Create initial database record
      const processedData = new ProcessedDataModel({
        originalData: data,
        processedData: data, // Will be updated after processing
        status: 'processing',
        metadata: {
          source: options?.source || 'api',
          pythonScript: pythonScript || null
        }
      });

      await processedData.save();

      let pythonResult: PythonExecutionResult | null = null;

      // Execute Python script if provided
      if (pythonScript) {
        pythonResult = await this.pythonService.executeScript(data, {
          scriptName: pythonScript,
          timeout: options?.timeout
        });

        // Update the document with Python results
        if (pythonResult.success) {
          processedData.pythonOutput = pythonResult.output;
          processedData.processedData = {
            ...data,
            pythonResult: pythonResult.output
          };
          processedData.status = 'success';
        } else {
          processedData.status = 'error';
          processedData.errorMessage = pythonResult.error;
        }
      } else {
        // No Python processing needed
        processedData.status = 'success';
      }

      // Update metadata with processing time
      const processingTime = Date.now() - startTime;
      processedData.metadata = {
        ...processedData.metadata,
        processingTime
      };

      await processedData.save();

      // Return response
      res.status(200).json({
        success: true,
        id: processedData._id,
        data: processedData.processedData,
        pythonOutput: pythonResult?.output || null,
        processingTime,
        status: processedData.status
      });

    } catch (error) {
      console.error('Error processing data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get processed data by ID
   */
  public async getProcessedData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const data = await ProcessedDataModel.findById(id);
      if (!data) {
        res.status(404).json({
          success: false,
          error: 'Processed data not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: data._id,
          originalData: data.originalData,
          processedData: data.processedData,
          pythonOutput: data.pythonOutput,
          processedAt: data.processedAt,
          status: data.status,
          errorMessage: data.errorMessage,
          metadata: data.metadata
        }
      });

    } catch (error) {
      console.error('Error retrieving data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all processed data with pagination
   */
  public async getAllProcessedData(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        ProcessedDataModel.find(query)
          .sort({ processedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ProcessedDataModel.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error retrieving all data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete processed data by ID
   */
  public async deleteProcessedData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await ProcessedDataModel.findByIdAndDelete(id);
      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Processed data not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Processed data deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}