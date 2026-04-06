import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const moveOut: Tool<any, any> = {
  name: 'move_out',
  description: 'Creates a move-out by recording the end date and final reading on the supply contract (EVER).',
  parameters: z.object({
    vertrag: z.string().describe("supply contract ID from EVER, must exist"),
    installationId: z.string().describe("must exist in entity store"),
    moveOutDate: z.string().describe("ISO 8601 date, e.g. 2024-06-30"),
    finalReading: z.number().describe("final meter reading at move-out")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    return {
      success: true,
      data: {
        table: 'EVER',
        VERTRAG: input.vertrag,
        ANLAGE: input.installationId,
        AUSZDAT: input.moveOutDate,
        ZWSTAND_OUT: input.finalReading,
        VSTATUS: 'INACTIVE'
      }
    };
  }
};
