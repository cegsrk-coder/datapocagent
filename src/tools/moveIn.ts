import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const moveIn: Tool<any, any> = {
  name: 'move_in',
  description: 'Creates a move-in for a business partner at an installation. Links partner to installation with a start date.',
  parameters: z.object({
    partnerId: z.string().describe("must exist in entity store"),
    installationId: z.string().describe("must exist in entity store"),
    moveInDate: z.string().describe("ISO 8601 date, e.g. 2024-01-01"),
    initialReading: z.number().optional().describe("initial meter reading at move-in")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const moveInId = `MI-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    return {
      success: true,
      data: {
        table: 'EANL_MOVEIN',
        EINESSION: moveInId,
        PARTNER: input.partnerId,
        ANLAGE: input.installationId,
        EINZDAT: input.moveInDate,
        ZWSTAND: input.initialReading ?? 0
      }
    };
  }
};
