import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createInstallation: Tool<any, any> = {
  name: 'create_installation',
  description: 'Creates an installation linked to a contract account',
  parameters: z.object({
    contractAccountId: z.string().describe("must exist"),
    addressId: z.string().optional().describe("optional, links to location"),
    category: z.string().describe("installation category"),
    rateType: z.string().describe("tariff/rate category, e.g. RESIDENTIAL")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const installationId = `INST-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    return {
      success: true,
      data: {
        table: 'EANL',
        ANLAGE: installationId,
        VSTELLE: input.addressId || 'PREMISE-' + Math.floor(Math.random() * 900 + 100),
        SPARTE: input.rateType || 'ELEC',
        VKONT: input.contractAccountId
      }
    };
  }
};
