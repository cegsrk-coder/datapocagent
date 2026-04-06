import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createBillingDocument: Tool<any, any> = {
  name: 'create_billing_document',
  description: 'Creates a billing/invoice document for a contract account with line items.',
  parameters: z.object({
    contractAccountId: z.string().describe("must exist in entity store"),
    billingPeriodStart: z.string().describe("ISO 8601 date"),
    billingPeriodEnd: z.string().describe("ISO 8601 date"),
    lineItems: z.array(z.object({
      description: z.string(),
      amount: z.number(),
      quantity: z.number().optional(),
      unit: z.string().optional()
    })),
    invoiceDate: z.string().optional().describe("ISO 8601 date, defaults to billingPeriodEnd"),
    currency: z.string().optional().describe("ISO 4217, e.g. USD or EUR")
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    const billingDocId = `BILL-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    const grossAmount = input.lineItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const currency = input.currency || 'USD';

    return {
      success: true,
      data: {
        table: 'ERDK',
        OPBEL: billingDocId,
        VKONT: input.contractAccountId,
        AB: input.billingPeriodStart,
        BIS: input.billingPeriodEnd,
        FAEDN: input.invoiceDate || input.billingPeriodEnd,
        BETRW: grossAmount.toFixed(2),
        WAERS: currency,
        ITEMS: input.lineItems.length
      }
    };
  }
};
