import { z } from 'zod';

export interface Tool<Input, Output> {
  name: string;
  description: string;
  parameters: z.ZodType<Input>;
  execute(input: Input): Promise<ToolResult<Output>>;
}

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  context?: Record<string, any>;
}
