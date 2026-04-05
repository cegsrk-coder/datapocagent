import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createDevice: Tool<any, any> = {
  name: 'create_device',
  description: 'Creates a device/meter linked to an installation',
  parameters: z.object({
    installationId: z.string().describe("must exist"),
    deviceType: z.string().describe("meter type (e.g. ELEC_METER, GAS_METER)"),
    manufacturer: z.string().optional(),
    serialNumber: z.string().optional(),
    registers: z.array(z.object({
      registerId: z.string(),
      direction: z.enum(["CONSUMPTION", "FEED_IN", "FEED_OUT"])
    }))
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const deviceId = `DEV-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const manufacturers = ['General Electric', 'Siemens', 'ABB', 'Schneider Electric', 'Honeywell', 'Itron'];
    const r = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    return {
      success: true,
      data: {
        table: 'EGER',
        GERAET: deviceId,
        ANLAGE: input.installationId,
        HERST: input.manufacturer || r(manufacturers),
        SERNR: input.serialNumber || 'SN-' + Math.floor(Math.random() * 1000000),
        MATNR: input.deviceType || 'E-METER-01'
      }
    };
  }
};
