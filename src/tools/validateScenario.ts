import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const validateScenario: Tool<any, any> = {
  name: 'validate_scenario',
  description: 'Validates all created entities for referential integrity and business rules. Call this after all entities are created.',
  parameters: z.object({
    entities: z.array(z.any()).optional().default([]).describe("pass the full list of entities created so far")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const entities = input.entities || [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Index entities by table
    const byTable: Record<string, any[]> = {};
    for (const e of entities) {
      const data = e.data || e;
      const table = data.table || 'UNKNOWN';
      if (!byTable[table]) byTable[table] = [];
      byTable[table].push(data);
    }

    const partners = byTable['BUT000'] || [];
    const contracts = byTable['FKKVKP'] || [];
    const premises = byTable['EHAUS'] || [];
    const connObjects = byTable['ICONNOBJ'] || [];
    const installations = byTable['EANL'] || [];
    const devices = byTable['EGER'] || [];
    const readings = byTable['EABL'] || [];
    const supplyContracts = byTable['EVER'] || [];
    const billings = byTable['ERDK'] || [];

    const partnerIds = new Set(partners.map((p: any) => p.PARTNER));
    const contractIds = new Set(contracts.map((c: any) => c.VKONT));
    const premiseIds = new Set(premises.map((p: any) => p.VSTELLE));
    const connObjIds = new Set(connObjects.map((c: any) => c.HAUS));
    const installationIds = new Set(installations.map((i: any) => i.ANLAGE));
    const deviceIds = new Set(devices.map((d: any) => d.GERAET));
    const supplyContractIds = new Set(supplyContracts.map((s: any) => s.VERTRAG));

    // Validate contract accounts link to existing partners
    for (const ca of contracts) {
      if (!partnerIds.has(ca.GPART)) {
        errors.push(`Contract Account ${ca.VKONT} references non-existent partner ${ca.GPART}`);
      }
    }

    // Validate connection objects link to existing premises
    for (const conn of connObjects) {
      if (!premiseIds.has(conn.VSTELLE)) {
        errors.push(`Connection Object ${conn.HAUS} references non-existent premise ${conn.VSTELLE}`);
      }
    }

    // Validate installations link to existing contract accounts and premises
    for (const inst of installations) {
      if (!contractIds.has(inst.VKONT)) {
        errors.push(`Installation ${inst.ANLAGE} references non-existent contract account ${inst.VKONT}`);
      }
      if (inst.VSTELLE && !premiseIds.has(inst.VSTELLE)) {
        errors.push(`Installation ${inst.ANLAGE} references non-existent premise ${inst.VSTELLE}`);
      }
    }

    // Validate devices link to existing installations
    for (const dev of devices) {
      if (!installationIds.has(dev.ANLAGE)) {
        errors.push(`Device ${dev.GERAET} references non-existent installation ${dev.ANLAGE}`);
      }
    }

    // Validate readings link to existing devices
    for (const read of readings) {
      if (!deviceIds.has(read.GERAET)) {
        errors.push(`Reading ${read.ABLEESSION} references non-existent device ${read.GERAET}`);
      }
    }

    // Validate supply contracts link to existing partners and installations
    for (const sc of supplyContracts) {
      if (sc.GPART && !partnerIds.has(sc.GPART)) {
        errors.push(`Supply contract ${sc.VERTRAG} references non-existent partner ${sc.GPART}`);
      }
      if (!installationIds.has(sc.ANLAGE)) {
        errors.push(`Supply contract ${sc.VERTRAG} references non-existent installation ${sc.ANLAGE}`);
      }
    }


    // Validate billing documents link to existing contract accounts
    for (const bill of billings) {
      if (!contractIds.has(bill.VKONT)) {
        errors.push(`Billing document ${bill.OPBEL} references non-existent contract account ${bill.VKONT}`);
      }
    }

    // Warnings for common issues
    if (partners.length === 0) {
      warnings.push('No business partners created');
    }
    if (partners.length > 0 && contracts.length === 0) {
      warnings.push('Business partners exist but no contract accounts created');
    }
    if (installations.length > 0 && devices.length === 0) {
      warnings.push('Installations exist but no devices created');
    }

    return {
      success: true,
      data: {
        table: 'VALIDATION',
        valid: errors.length === 0,
        totalEntities: entities.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings
      }
    };
  }
};
