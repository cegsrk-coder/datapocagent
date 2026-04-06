import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const moveIn: Tool<any, any> = {
  name: 'move_in',
  description: 'Creates a move-in by generating a supply contract (EVER) linking a business partner to an installation via contract account.',
  parameters: z.object({
    partnerId: z.string().describe("must exist in entity store"),
    contractAccountId: z.string().describe("must exist in entity store"),
    installationId: z.string().describe("must exist in entity store"),
    moveInDate: z.string().describe("ISO 8601 date, e.g. 2024-01-01"),
    initialReading: z.number().optional().describe("initial meter reading at move-in")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const vertrag = `VT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    return {
      success: true,
      data: {
        table: 'EVER',
        VERTRAG: vertrag,
        GPART: input.partnerId,
        VKONT: input.contractAccountId,
        ANLAGE: input.installationId,
        EINZDAT: input.moveInDate,
        ZWSTAND_IN: input.initialReading ?? 0,
        VSTATUS: 'ACTIVE'
      }
    };
  }
};
