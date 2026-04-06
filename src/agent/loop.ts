import { Tool } from '../tools/index';
import { ChatLLM, Message } from './llm';
import { EntityStore } from '../entity/store';
import { buildSystemPrompt } from './systemPrompt';

export async function agentLoop(
  description: string,
  tools: Tool<any, any>[],
  llm: ChatLLM,
  entityStore: EntityStore,
  maxTurns: number = 30
) {
  const messages: Message[] = [];
  
  messages.push({ role: 'system', content: buildSystemPrompt(description, entityStore, tools) });
  messages.push({ role: 'user', content: description });

  for (let turn = 0; turn < maxTurns; turn++) {
    console.log(`\n--- Turn ${turn + 1} ---`);
    console.log(`Calling LLM...`);
    
    const response = await llm.chat(messages, tools);

    if (!response.hasToolCalls()) {
      console.log(`LLM finished: ${response.assistantMessage.content}`);
      messages.push({ role: 'assistant', content: response.assistantMessage.content });
      break;
    }

    console.log(`LLM requested tools: ${response.toolCalls.map((tc: any) => tc.function.name).join(', ')}`);
    messages.push(response.assistantMessage as any);

    for (const toolCall of response.toolCalls) {
      const tool = tools.find((t) => t.name === toolCall.function.name);
      if (!tool) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Tool ${toolCall.function.name} not found`,
        });
        continue;
      }

      try {
         const args = JSON.parse(toolCall.function.arguments);
         console.log(`Executing tool [${tool.name}] with args:`, JSON.stringify(args));
         
         const parsedInput = tool.parameters.parse(args);
         const result = await tool.execute(parsedInput);

         if (result.success) {
           if (Array.isArray(result.data)) {
             result.data.forEach((d: any) => entityStore.add(tool.name, d));
           } else {
             entityStore.add(tool.name, result.data);
           }
         }

         messages.push({
           role: 'tool',
           tool_call_id: toolCall.id,
           content: JSON.stringify(result)
         });
      } catch (err: any) {
         console.error(`Tool execution error:`, err);
         messages.push({
           role: 'tool',
           tool_call_id: toolCall.id,
           content: JSON.stringify({ error: err.message })
         });
      }
    }
  }

  return {
    entities: entityStore.getAll(),
    messages
  };
}
