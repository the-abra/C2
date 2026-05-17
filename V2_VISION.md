# ⚔️ Duelist C2: V2 Vision & Development Plan

## 1. The Vision of Purpose
Duelist C2 is a **Scenario-Driven Tactical Orchestration Platform**. It moves away from manual tool selection to structured "Missions" where complex tool chains are executed as single units of work.

The core purpose is to:
1. **Scenario-First Orchestration:** Pick a mission objective (e.g., "Full Recon," "Vulnerability Assessment") rather than individual binaries.
2. **Chain Propagation:** Automatically feed the discoveries of Step A (e.g., Subfinder's domains) into Step B (e.g., Httpx's service scan) without operator intervention.
3. **Augment & Synthesize:** Use local AI to monitor the entire chain, providing cross-tool insights.
4. **Persist:** Maintain a flawless, chronological audit trail (Timeline) and cross-session memory (Global Vault).

## 2. Project Architecture & Requirements

### A. Scenario-Based Chains
*   **Missions/Scenarios:** A collection of ordered `Steps`.
*   **Step Logic:** Each step defines a `Tool` + `Profile`. 
*   **Data Propagation:** Steps can be configured to "Auto-Inherit" targets found in previous steps.
*   **Parameterization:** Dynamic templates (e.g., `nmap {{TARGET}} -p {{PORTS}}`).

### B. Data Workflow
1.  **Input:** Operator initiates a **Scenario**.
2.  **Chain Execution:** The Orchestrator runs Step 1.
3.  **Synthesis:** Step 1 output is parsed into structured entities.
4.  **Propagation:** New entities trigger Step 2 (if configured).
5.  **Intelligence:** The `Advisor` background worker analyzes the logs via AI to suggest next steps.

---

## 3. V2 Development Plan

### Phase 1: Backend Scenario Engine & Batch Execution (CURRENT)
*   **Goal:** Implement the logic to run a chain of tools as a single Scenario.
*   **Task:** Create `scenarios` and `scenario_steps` tables. Update `Orchestrator` to handle sequences.
*   **Validation:** Run a "Recon" scenario (Subfinder -> Httpx) against a target via CLI.

### Phase 2: Parameterized Attack Profiles & Dynamic Forms
*   **Goal:** Allow runtime variable injection into Scenarios.
*   **Task:** Implement `{{VARIABLE}}` detection and prompt logic.

### Phase 3: Frontend Refactor - Mission Control UI
*   **Goal:** Navigate the UI via Scenarios.
*   **Task:** Update Sidebar and Execution panels to focus on Missions.

### Phase 4: Advanced AI & Global Intelligence
*   **Goal:** Multi-mission trend analysis.
