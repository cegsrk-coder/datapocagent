import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const validateScenario: Tool<any, any> = {
  name: 'validate_scenario',
  description: 'Validates all created entities for referential integrity and business rules. Call this after all entities are created.',
  parameters: z.object({
    entities: z.array(z.any()).describe("pass the full list of entities created so far")
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
    const installations = byTable['EANL'] || [];
    const devices = byTable['EGER'] || [];
    const readings = byTable['EABL'] || [];
    const moveIns = byTable['EANL_MOVEIN'] || [];
    const moveOuts = byTable['EANL_MOVEOUT'] || [];
    const billings = byTable['ERDK'] || [];

    const partnerIds = new Set(partners.map((p: any) => p.PARTNER));
    const contractIds = new Set(contracts.map((c: any) => c.VKONT));
    const installationIds = new Set(installations.map((i: any) => i.ANLAGE));
    const deviceIds = new Set(devices.map((d: any) => d.GERAET));

    // Validate contract accounts link to existing partners
    for (const ca of contracts) {
      if (!partnerIds.has(ca.GPART)) {
        errors.push(`Contract Account ${ca.VKONT} references non-existent partner ${ca.GPART}`);
      }
    }

    // Validate installations link to existing contract accounts
    for (const inst of installations) {
      if (!contractIds.has(inst.VKONT)) {
        errors.push(`Installation ${inst.ANLAGE} references non-existent contract account ${inst.VKONT}`);
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

    // Validate move-ins link to existing partners and installations
    for (const mi of moveIns) {
      if (!partnerIds.has(mi.PARTNER)) {
        errors.push(`Move-in ${mi.EINESSION} references non-existent partner ${mi.PARTNER}`);
      }
      if (!installationIds.has(mi.ANLAGE)) {
        errors.push(`Move-in ${mi.EINESSION} references non-existent installation ${mi.ANLAGE}`);
      }
    }

    // Validate move-outs link to existing installations
    for (const mo of moveOuts) {
      if (!installationIds.has(mo.ANLAGE)) {
        errors.push(`Move-out ${mo.AESSION} references non-existent installation ${mo.ANLAGE}`);
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
