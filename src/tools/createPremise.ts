import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createPremise: Tool<any, any> = {
  name: 'create_premise',
  description: 'Creates a premise (supply location / physical address) where installations are located. A premise represents a unit, flat, or building.',
  parameters: z.object({
    street: z.string().describe("street name"),
    houseNumber: z.string().describe("house/building number"),
    city: z.string().describe("city or locality"),
    postalCode: z.string().describe("postal/ZIP code"),
    countryCode: z.string().describe("ISO country code, e.g. US, DE, AU"),
    region: z.string().optional().describe("state or region")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const premiseId = `PREM-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    return {
      success: true,
      data: {
        table: 'EHAUS',
        VSTELLE: premiseId,
        STR: input.street,
        HSNR: input.houseNumber,
        ORT: input.city,
        PSTLZ: input.postalCode,
        LAND: input.countryCode,
        REGION: input.region || '',
        STATUS: 'A'
      }
    };
  }
};
