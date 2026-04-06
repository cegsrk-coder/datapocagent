import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createInstallation: Tool<any, any> = {
  name: 'create_installation',
  description: 'Creates an installation linked to a contract account and premise. An installation is the billing-relevant technical object at a premise.',
  parameters: z.object({
    contractAccountId: z.string().describe("must exist (VKONT from FKKVKP)"),
    premiseId: z.string().describe("must exist (VSTELLE from EHAUS)"),
    connectionObjectId: z.string().optional().describe("optional (HAUS from ICONNOBJ)"),
    category: z.string().describe("installation category"),
    rateType: z.string().describe("tariff/rate category, e.g. RESIDENTIAL, COMMERCIAL")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const installationId = `INST-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    return {
      success: true,
      data: {
        table: 'EANL',
        ANLAGE: installationId,
        VSTELLE: input.premiseId,
        HAUS: input.connectionObjectId || '',
        SPARTE: input.rateType || 'ELEC',
        VKONT: input.contractAccountId
      }
    };
  }
};
