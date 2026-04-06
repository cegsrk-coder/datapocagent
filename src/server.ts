import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { EntityStore } from './entity/store';
import { ChatLLM } from './agent/llm';
import { agentLoop } from './agent/loop';
import { createBusinessPartner } from './tools/createBusinessPartner';
import { createContractAccount } from './tools/createContractAccount';
import { createInstallation } from './tools/createInstallation';
import { createDevice } from './tools/createDevice';
import { createMeterReading } from './tools/createMeterReading';
import { moveIn } from './tools/moveIn';
import { moveOut } from './tools/moveOut';
import { createBillingDocument } from './tools/createBillingDocument';
import { validateScenario } from './tools/validateScenario';

config();

const __dirname = path.resolve();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { scenario } = req.body;
  if (!scenario) {
    return res.status(400).json({ error: 'Scenario is required' });
  }

  try {
    const store = new EntityStore();
    const llm = new ChatLLM();
    const tools = [
      createBusinessPartner,
      createContractAccount,
      createInstallation,
      createDevice,
      createMeterReading,
      moveIn,
      moveOut,
      createBillingDocument,
      validateScenario
    ];

    const result = await agentLoop(scenario, tools, llm, store);

    return res.json({
      success: true,
      messages: result.messages,
      entities: result.entities
    });
  } catch (error: any) {
    console.error("Agent execution error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
