import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createMeterReading: Tool<any, any> = {
  name: 'create_meter_reading',
  description: 'Creates a meter reading for a device register. Readings must be sequential (ascending date and value per register).',
  parameters: z.object({
    deviceId: z.string().describe("must exist in entity store"),
    registerId: z.string().describe("register on the device"),
    readingValue: z.number().describe("cumulative meter reading value"),
    readingUnit: z.string().describe("unit of measurement, e.g. kWh, m3, MJ"),
    readingDate: z.string().describe("ISO 8601 date, e.g. 2024-01-15"),
    reason: z.enum(["01", "02", "09", "11"]).describe("01=actual, 02=scheduled, 09=move-out, 11=estimated")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const readingId = `READ-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    return {
      success: true,
      data: {
        table: 'EABL',
        ABLEESSION: readingId,
        GERAET: input.deviceId,
        ZWNUMMER: input.registerId,
        ZWSTAND: input.readingValue,
        UNIT: input.readingUnit || 'kWh',
        ADESSION: input.readingDate,
        ABLGRUND: input.reason || '01'
      }
    };
  }
};
