import OpenAI from "openai";
import { Tool } from "../tools/index";
import { zodToJsonSchema } from "zod-to-json-schema";

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

export class ChatLLM {
  private openai: OpenAI;
  private deployment: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.DEPLOYMENT_NAME}`,
      defaultQuery: { "api-version": "2024-02-15-preview" },
      defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY || "" },
    });
    this.deployment = process.env.DEPLOYMENT_NAME || "";
  }

  async chat(messages: Message[], tools: Tool<any, any>[]) {
    const openaiTools = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: (() => {
          const schema = zodToJsonSchema(t.parameters);
          delete (schema as any).$schema;
          return schema;
        })(),
      },
    }));

    const response = await this.openai.chat.completions.create({
      model: this.deployment,
      messages: messages as any,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
    });

    const choice = response.choices[0].message;
    return {
      assistantMessage: choice,
      hasToolCalls: () => !!choice.tool_calls && choice.tool_calls.length > 0,
      toolCalls: choice.tool_calls || [],
    };
  }
}
