import { Command } from 'commander';
import { config } from 'dotenv';
import { EntityStore } from './entity/store';
import { ChatLLM } from './agent/llm';
import { agentLoop } from './agent/loop';
import { createBusinessPartner } from './tools/createBusinessPartner';
import { createContractAccount } from './tools/createContractAccount';
import { createInstallation } from './tools/createInstallation';
import { createDevice } from './tools/createDevice';

// Load environment variables (.env file)
config();

const program = new Command();

program
  .name('isu-data-agent')
  .description('S/4HANA ISU Test Data Generation Agent CLI')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate scenario data')
  .argument('<scenario>', 'Natural language scenario description')
  .option('-d, --database <path>', 'Path to SQLite database', 'data.sqlite')
  .action(async (scenario, options) => {
    try {
      console.log(`Initializing scenario: "${scenario}"`);
      console.log(`Database: ${options.database}`);
      
      const store = new EntityStore(options.database);
      const llm = new ChatLLM();
      const tools = [
        createBusinessPartner,
        createContractAccount,
        createInstallation,
        createDevice
      ];

      const result = await agentLoop(scenario, tools, llm, store);

      console.log('\n--- Final Entity Store ---');
      console.log(JSON.stringify(result.entities, null, 2));

    } catch (err) {
      console.error("Error executing agent:", err);
      process.exit(1);
    }
  });

program.parse(process.argv);
