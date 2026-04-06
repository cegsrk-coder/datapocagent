import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createConnectionObject: Tool<any, any> = {
  name: 'create_connection_object',
  description: 'Creates a connection object that links a premise to the utility network. Represents the physical connection point (e.g. electricity grid connection at a building).',
  parameters: z.object({
    premiseId: z.string().describe("must exist in entity store (VSTELLE from EHAUS)"),
    connectionType: z.string().describe("utility type: ELEC, GAS, WATER, DISTRICT_HEATING"),
    gridArea: z.string().optional().describe("distribution network area identifier")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const connId = `CONN-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const gridAreas = ['GRID-N01', 'GRID-S02', 'GRID-E03', 'GRID-W04', 'GRID-C05'];
    const r = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    return {
      success: true,
      data: {
        table: 'ICONNOBJ',
        HAUS: connId,
        VSTELLE: input.premiseId,
        CONNTYPE: input.connectionType || 'ELEC',
        NETZGEBIET: input.gridArea || r(gridAreas),
        STATUS: 'A'
      }
    };
  }
};
