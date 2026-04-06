import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const moveOut: Tool<any, any> = {
  name: 'move_out',
  description: 'Creates a move-out from an installation. Records the move-out document (ETTIFN). The existing EVER supply contract remains — move-out is tracked as an ETTIFN document with OPERAND=MOVE_OUT.',
  parameters: z.object({
    vertrag: z.string().describe("supply contract ID from EVER, must exist"),
    installationId: z.string().describe("must exist in entity store"),
    moveOutDate: z.string().describe("ISO 8601 date, e.g. 2024-06-30"),
    finalReading: z.number().describe("final meter reading at move-out")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const ettifnId = `ETFO-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    return {
      success: true,
      data: {
        table: 'ETTIFN',
        ETTIFN_ID: ettifnId,
        VERTRAG: input.vertrag,
        ANLAGE: input.installationId,
        OPERAND: 'MOVE_OUT',
        KEYDATE: input.moveOutDate,
        ZWSTAND: input.finalReading
      }
    };
  }
};
