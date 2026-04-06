import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const moveOut: Tool<any, any> = {
  name: 'move_out',
  description: 'Creates a move-out from an installation. Ends the occupancy and records the final meter reading.',
  parameters: z.object({
    installationId: z.string().describe("must exist in entity store"),
    moveOutDate: z.string().describe("ISO 8601 date, e.g. 2024-06-30"),
    finalReading: z.number().describe("final meter reading at move-out")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const moveOutId = `MO-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    return {
      success: true,
      data: {
        table: 'EANL_MOVEOUT',
        AESSION: moveOutId,
        ANLAGE: input.installationId,
        AUSZDAT: input.moveOutDate,
        ZWSTAND: input.finalReading
      }
    };
  }
};
