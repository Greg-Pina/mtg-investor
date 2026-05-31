import { PythonShell, Options } from 'python-shell';
import path from 'path';

export interface PythonExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
}

export interface PythonScriptOptions {
  scriptName: string;
  args?: string[];
  pythonPath?: string;
  scriptPath?: string;
  timeout?: number;
}

export class PythonService {
  private static instance: PythonService;
  private readonly defaultScriptPath: string;
  private readonly defaultTimeout: number = 30000; // 30 seconds

  private constructor() {
    this.defaultScriptPath = path.join(__dirname, '../../python');
  }

  public static getInstance(): PythonService {
    if (!PythonService.instance) {
      PythonService.instance = new PythonService();
    }
    return PythonService.instance;
  }

  /**
   * Execute a Python script with the provided data
   */
  public async executeScript(
    data: any,
    options: PythonScriptOptions
  ): Promise<PythonExecutionResult> {
    const startTime = Date.now();
    
    try {
      const pythonOptions: Options = {
        mode: 'text',
        pythonPath: options.pythonPath || 'python3',
        scriptPath: options.scriptPath || this.defaultScriptPath,
        args: options.args || [],
      };

      // Add data as a JSON string argument
      if (data) {
        pythonOptions.args = [...(pythonOptions.args || []), JSON.stringify(data)];
      }

      const results = await this.runPythonScript(options.scriptName, pythonOptions, options.timeout);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: this.parseOutput(results),
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  /**
   * Execute a Python script and return a Promise
   */
  private async runPythonScript(
    scriptName: string, 
    options: Options, 
    timeout?: number
  ): Promise<string[]> {
    const timeoutMs = timeout || this.defaultTimeout;
    
    return new Promise((resolve, reject) => {
      let hasTimedOut = false;

      const timeoutId = setTimeout(() => {
        hasTimedOut = true;
        reject(new Error(`Python script execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        PythonShell.run(scriptName, options)
          .then((results: string[]) => {
            clearTimeout(timeoutId);
            if (!hasTimedOut) {
              resolve(results || []);
            }
          })
          .catch((err: Error) => {
            clearTimeout(timeoutId);
            if (!hasTimedOut) {
              reject(err);
            }
          });
      } catch (err) {
        clearTimeout(timeoutId);
        if (!hasTimedOut) {
          reject(err);
        }
      }
    });
  }

  /**
   * Parse Python script output
   */
  private parseOutput(results: string[]): any {
    if (!results || results.length === 0) {
      return null;
    }

    // Try to parse the last line as JSON
    const lastLine = results[results.length - 1];
    try {
      return JSON.parse(lastLine);
    } catch {
      // If JSON parsing fails, return all output as strings
      return results.length === 1 ? results[0] : results;
    }
  }

  public getDefaultScriptPath(): string {
    return this.defaultScriptPath;
  }
}