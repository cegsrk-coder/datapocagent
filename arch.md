# S/4HANA ISU Test Data Agent — Architecture & Implementation Plan

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  CLI or Web: "Generate 100 residential customers with..."   │
└──────────────────────┬──────────────────────────────────────┘
                       │ scenario request
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ System      │  │ Message      │  │ LLM Router       │   │
│  │ Prompt      │  │ History      │  │ (OpenAI-compat) │   │
│  │ Builder     │  │ Manager      │  │                  │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │              │
│  ┌──────▼────────────────▼────────────────────▼──────────┐  │
│  │                  Agent Loop                            │  │
│  │  1. Build context (system prompt + history)           │  │
│  │  2. Call LLM → parse tool calls                       │  │
│  │  3. Execute tools → collect results                   │  │
│  │  4. Feed results back, repeat until done              │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ tool calls / results
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Tool Registry                           │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │ ISU Data     │ │ Validation   │ │ Export           │    │
│  │ Tools        │ │ Tools        │ │ Tools            │    │
│  │              │ │              │ │                  │    │
│  │ create_bp    │ │ validate_bp  │ │ export_bdc       │    │
│  │ create_ca    │ │ validate_ca  │ │ export_sql       │    │
│  │ create_inst  │ │ check_links  │ │ export_idoc      │    │
│  │ create_dev   │ │ check_rules  │ │ export_csv       │    │
│  │ create_reading││              │ │                  │    │
│  │ create_invoice│              │ │                  │    │
│  └──────────────┘ └──────────────┘ └──────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │ generated data
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Persistence Layer                      │
│                                                              │
│  Scenario Store  │  Entity Store  │  Session Log           │
│  (what was       │  (created IDs  │  (LLM calls, costs,    │
│   requested)     │   + refs)      │   tool results)         │
└─────────────────────────────────────────────────────────────┘
```

## 2. Core Interfaces

### 2.1 Tool Interface

Every tool implements this contract:

```
interface Tool<Input, Output> {
  name: string
  description: string              // fed to LLM as function spec
  parameters: JSONSchema           // validated before execution
  execute(input: Input): Promise<ToolResult<Output>>
}

interface ToolResult<T> {
  success: boolean
  data?: T                         // created entity with IDs
  error?: string                   // human-readable error
  context?: Record<string, any>    // metadata for debugging
}
```

### 2.2 Agent Loop

```typescript
async function agentLoop(
  scenario: ScenarioRequest,
  tools: Tool[],
  llm: LLMClient,
  maxTurns: number = 50
): Promise<ScenarioResult> {

  const messages: Message[] = []
  const entityStore = new EntityStore()

  const systemPrompt = buildSystemPrompt(scenario, entityStore)
  messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: scenario.description })

  for (let turn = 0; turn < maxTurns; turn++) {

    // 1. Call LLM
    const response = await llm.chat(messages, { tools })

    // 2. Check if model is done (no tool calls, text only)
    if (!response.hasToolCalls()) {
      // Model summarized results or declared completion
      break
    }

    // 3. Execute tool calls
    const toolResults = await executeParallel(
      response.toolCalls,
      async (toolCall) => {
        const tool = findTool(tools, toolCall.name)
        const input = validateInput(toolCall.parameters, tool.parameters)
        const result = await tool.execute(input)

        // Track in entity store
        if (result.success) {
          entityStore.add(toolCall.name, result.data)
        }

        return {
          tool_use_id: toolCall.id,
          result: result
        }
      }
    )

    // 4. Append assistant response + tool results to history
    messages.push(response.assistantMessage)
    for (const r of toolResults) {
      messages.push({
        role: 'user',
        content: formatToolResult(r)
      })
    }
  }

  // 5. Validate complete scenario
  const validation = await validateScenario(scenario, entityStore)

  return {
    entities: entityStore.getAll(),
    validation,
    turnCount: turn,
    messages
  }
}
```

### 2.3 LLM Client (OpenAI-compatible)

```typescript
interface LLMClient {
  chat(
    messages: Message[],
    config: { tools: Tool[], model?: string }
  ): Promise<LLMResponse>
}

class OpenAILLMClient implements LLMClient {
  constructor(config: {
    baseUrl: string      // "https://api.openai.com/v1" for cloud
                         // "http://localhost:11434/v1" for Ollama
    apiKey: string
    model: string
  }) {}

  // ... implements OpenAI function calling spec
}
```

## 3. Tool Definitions

### 3.1 ISU Data Tools

```
Tool: create_business_partner
  Input: {
    type: "1" | "2",                    // 1=person, 2=organization
    firstName?: string,                 // required for type 1
    lastName?: string,                  // required for type 1
    organizationName?: string,          // required for type 2
    role: "RESIDENTIAL" | "COMMERCIAL"
    countryCode: string                 // ISO 3166-1 alpha-2
    address: { street, city, postalCode, region }
  }
  Output: {
    partnerId: string,                  // generated BP number
    roleAdded: string[]                 // roles actually assigned
  }

Tool: create_contract_account
  Input: {
    partnerId: string,                  // must exist in entity store
    billingCycle: "01" | "10" | "30"   // monthly, 10-day, 30-day
    currency: string,                   // ISO 4217
    category: string,                   // CA category
    invoiceGrouping?: string
  }
  Output: {
    contractAccountId: string,
    partnerId: string,
    status: string
  }

Tool: create_installation
  Input: {
    contractAccountId: string,          // must exist
    addressId?: string,                 // optional, links to location
    category: string,                   // installation category
    rateType: string,                   // tariff/rate category
    devices?: DeviceSpec[]              // optional inline device creation
  }
  Output: {
    installationId: string,
    connectedDevices: string[]
  }

Tool: create_device
  Input: {
    installationId: string,             // must exist
    deviceType: string,                 // meter type (electricity, gas, water)
    manufacturer?: string,
    serialNumber?: string,
    registers: [{
      registerId: string,
      direction: "CONSUMPTION" | "FEED_IN" | "FEED_OUT"
    }]
  }
  Output: {
    deviceId: string,
    registerIds: string[]
  }

Tool: create_meter_reading
  Input: {
    deviceId: string,
    registerId: string,
    readingValue: number,
    readingUnit: string,                // kWh, m3, etc.
    readingDate: string,                // ISO 8601
    reason: string                      // "01"=actual, "11"=estimated
  }
  Output: {
    readingId: string,
    previousReading?: number,
    consumption?: number                // calculated delta
  }

Tool: create_billing_document
  Input: {
    contractAccountId: string,
    billingPeriodStart: string,
    billingPeriodEnd: string,
    lineItems: LineItem[],
    invoiceDate?: string
  }
  Output: {
    billingDocumentId: string,
    grossAmount: number,
    currency: string
  }

Tool: move_in
  Input: {
    partnerId: string,
    installationId: string,
    moveInDate: string,
    initialReading?: number
  }
  Output: {
    moveInId: string,
    installationId: string
  }

Tool: move_out
  Input: {
    installationId: string,
    moveOutDate: string,
    finalReading: number
  }
  Output: {
    moveOutId: string,
    finalBillingRef?: string
  }
```

### 3.2 Validation Tools

```
Tool: validate_scenario
  Input: {
    scenarioId: string
    rules?: string[]                    // optional subset of rules
  }
  Output: {
    valid: boolean,
    errors: ValidationError[],
    warnings: string[]
  }

  Validates:
  - All BPs have valid roles
  - All CAs link to valid BPs
  - All installations linked to valid CAs
  - All devices linked to valid installations
  - Register readings are sequential (no gaps, no rollback)
  - Move-in/move-out dates are logical (no overlap)
  - Required fields populated per entity type
```

### 3.3 Export Tools

```
Tool: export_bdc_session
  Input: { entityTypes: string[], scenarioId: string }
  Output: { file: string, recordCount: number }

Tool: export_sql_script
  Input: { entityTypes: string[], scenarioId: string, dialect: string }
  Output: { file: string, statements: number }

Tool: export_idoc_xml
  Input: { messageType: string, entityIds: string[] }
  Output: { files: string[], count: number }
```

## 4. System Prompt Builder

This is the brain. It injects domain knowledge dynamically:

```typescript
function buildSystemPrompt(
  scenario: ScenarioRequest,
  entityStore: EntityStore
): string {

  return `
You are an S/4HANA ISU test data generation agent.

## ROLE
Generate valid, consistent test data for SAP ISU scenarios.
Always follow entity dependency order:
  Business Partner → Contract Account → Installation → Device → Meter Reading

## CURRENT SCENARIO
${scenario.description}

## ENTITIES CREATED SO FAR
${entityStore.summary()}

## AVAILABLE TOOLS
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

## TOOL CALL RULES
- Always call tools in dependency order (parent before child)
- Use IDs from entities created earlier in this conversation
- If an entity doesn't exist, create it first
- Never skip validation steps
- When all entities are created, call validate_scenario

## BUSINESS RULES
${loadBusinessRules(scenario.domain)}

## KNOWN ISSUES TO AVOID
- Don't create overlapping move-in periods
- Reading dates must be ascending per register
- Contract accounts require valid BP with appropriate role
- Devices require valid installation before creation
  `.trim()
}
```

The business rules are loaded from YAML/JSON files:

```yaml
# rules/residential.yaml
business_partner:
  required_roles:
    - "CRM000"        # standard BP
    - "ISURESIDENT"   # ISU residential
  valid_partner_types:
    - "1"             # person
    - "2"             # organization

contract_account:
  valid_billing_cycles:
    - "01": "Monthly"
    - "10": "10-day"
    - "30": "30-day"

validation:
  reading_sequence:
    rule: "next_reading_date >= previous_reading_date"
    severity: "error"
  move_in_overlap:
    rule: "no overlapping installation assignments"
    severity: "error"
```

## 5. Data Flow — Complete Example

```
User: "Generate a residential customer with high-low consumption pattern"

Turn 1 — LLM calls tools:
  create_business_partner({type:"1", role:"RESIDENTIAL", ...})
    → { partnerId: "0010000001" }

Turn 2 — LLM sees result, continues:
  create_contract_account({partnerId:"0010000001", billingCycle:"01", ...})
    → { contractAccountId: "CA-10001" }

Turn 3:
  create_installation({contractAccountId:"CA-10001", rateType:"RESIDENTIAL", ...})
    → { installationId: "INST-20001" }

Turn 4:
  create_device({installationId:"INST-20001", deviceType:"ELEC_METER", ...})
    → { deviceId: "DEV-30001", registerIds: ["REG-001"] }

Turn 5:
  create_meter_reading({deviceId:"DEV-30001", registerId:"REG-001",
                       readingValue:1500, readingDate:"2024-01-01", ...})
    → { readingId: "READ-001" }

Turn 6 — Create high consumption next month:
  create_meter_reading({deviceId:"DEV-30001", registerId:"REG-001",
                       readingValue:2800, readingDate:"2024-02-01", ...})
    → { readingId: "READ-002", consumption: 1300 }

Turn 7 — Move out with final reading:
  create_meter_reading({deviceId:"DEV-30001", registerId:"REG-001",
                       readingValue:3100, readingDate:"2024-03-01", reason:"09"})
    → { readingId: "READ-003", consumption: 300 }

Turn 8:
  move_out({installationId:"INST-20001", moveOutDate:"2024-03-01", finalReading:3100})
    → { moveOutId: "MO-001" }

Turn 9:
  validate_scenario({scenarioId:"SCN-001"})
    → { valid: true, errors: [], warnings: [] }

Turn 10 — Model produces text only (no tool calls):
  "Scenario complete. Generated residential customer SCN-001 with..."

→ Loop exits. User gets full entity list.
→ User can now export to BDC/SQL/IDoc.
```

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup + TypeScript config
- [ ] Tool interface + registry
- [ ] LLM client (OpenAI-compatible)
- [ ] Basic agent loop (call → execute → loop)
- [ ] Console-based CLI or simple REPL
- [ ] Test with 1-2 simple tools

### Phase 2: Core ISU Tools (Week 3-5)
- [ ] Implement `create_business_partner` with validation
- [ ] Implement `create_contract_account`
- [ ] Implement `create_installation`
- [ ] Implement `create_device`
- [ ] Entity store (in-memory tracking of created IDs)
- [ ] Basic system prompt with dependency rules

### Phase 3: Scenario Completion (Week 6-7)
- [ ] Implement `create_meter_reading`
- [ ] Implement `move_in` / `move_out`
- [ ] `validate_scenario` tool with business rules
- [ ] System prompt with business rules from YAML
- [ ] Multi-turn scenario generation (full loop working)

### Phase 4: Export & Polish (Week 8-10)
- [ ] BDC script export
- [ ] SQL script export
- [ ] Scenario templates (pre-baked scenarios)
- [ ] Bulk generation ("generate 100 customers with patterns")
- [ ] Error recovery (retry on LLM failures)
- [ ] Cost tracking

### Phase 5: Advanced (Future)
- [ ] SAP system connection (RFC/BAPI direct execution)
- [ ] Parallel scenario generation
- [ ] Learning from validation failures
- [ ] Scenario templates → YAML → natural language

## 7. Tech Stack Recommendation

```
Language:    TypeScript (run with bun or Node 20+)
LLM calls:   OpenAI SDK (works with any compatible endpoint)
CLI:         Commander.js (simple) or Ink + React (fancy terminal)
Validation:  Zod (for input schemas)
Storage:     SQLite (scenario store, entity tracking)
Config:      YAML (business rules)
Testing:     Vitest
```

Why TypeScript? Your S/4 ISU team likely already has TypeScript/JavaScript tooling, it has good OpenAI SDK, and the type system catches errors early. Python would also work well if you prefer it (better SAP RFC connectors via `pyrfc`).

## 8. Minimal Viable Code Structure

```
isu-data-agent/
├── src/
│   ├── tools/
│   │   ├── index.ts                 # tool registry
│   │   ├── createBusinessPartner.ts
│   │   ├── createContractAccount.ts
│   │   ├── createInstallation.ts
│   │   ├── createDevice.ts
│   │   ├── createMeterReading.ts
│   │   ├── moveIn.ts
│   │   ├── moveOut.ts
│   │   ├── validateScenario.ts
│   │   ├── exportBdc.ts
│   │   └── exportSql.ts
│   ├── agent/
│   │   ├── loop.ts                  # the agent loop
│   │   ├── systemPrompt.ts          # prompt builder
│   │   └── llm.ts                   # LLM client wrapper
│   ├── entity/
│   │   ├── store.ts                 # entity tracking
│   │   └── types.ts                 # entity type definitions
│   ├── rules/
│   │   ├── residential.yaml
│   │   ├── commercial.yaml
│   │   └── industrial.yaml
│   └── cli.ts                       # entry point
├── tests/
│   ├── tools/
│   ├── agent/
│   └── e2e/
└── package.json
```

## 9. Key Design Decisions

**One tool = one entity creation vs batch creation**
- Go with one tool per entity. The LLM will naturally batch by calling multiple tools in parallel.
- Batching adds complexity (partial failures, mixed success/error) for little gain.

**In-memory vs database storage**
- Start in-memory. Add SQLite when you need session persistence or bulk generation.

**Direct SAP connection vs file export**
- Export-first architecture: generate files (BDC, SQL, XML) that humans review before loading to SAP.
- Add direct RFC/BAPI later once you trust the generated data.

**Single provider lock-in vs OpenAI-compatible**
- OpenAI-compatible from day one. Lets you use Ollama, any cloud provider, any model.
- Zero extra work — just accept `baseUrl` and `apiKey` as config.

---

Questions, adjustments, or want to dive into Phase 1 implementation?
