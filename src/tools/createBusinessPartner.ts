import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const createBusinessPartner: Tool<any, any> = {
  name: 'create_business_partner',
  description: 'Creates a business partner in the test data',
  parameters: z.object({
    type: z.enum(["1", "2"]),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    organizationName: z.string().optional(),
    role: z.enum(["RESIDENTIAL", "COMMERCIAL"]),
    countryCode: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      region: z.string().optional()
    })
  }),
  execute: async (input): Promise<ToolResult<any>> => {
    // Generate a mock partner id
    const partnerId = `100${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    // Mock fallbacks for optional fields
    const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'William', 'Jessica', 'Robert', 'Emma', 'Daniel'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const orgNames = ['Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Corp', 'Stark Industries', 'Wayne Enterprises'];
    const r = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    return {
      success: true,
      data: {
        table: 'BUT000',
        PARTNER: partnerId,
        BU_TYPE: input.type,
        NAME_FIRST: input.firstName || (input.type === '1' ? r(firstNames) : ''),
        NAME_LAST: input.lastName || (input.type === '1' ? r(lastNames) : ''),
        NAME_ORG1: input.organizationName || (input.type === '2' ? r(orgNames) : ''),
        ROLE: input.role
      }
    };
  }
};
