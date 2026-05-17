# ⚔️ Duelist C2: Strategic Roadmap (Phase 2)

This document outlines the planned improvements for the Duelist C2 platform, focusing on operational efficiency, data intelligence, and enhanced user experience.

---

## 🎯 Vision
To transform Duelist C2 from a tool-orchestration interface into a **comprehensive tactical intelligence platform** that supports multi-operator collaboration, autonomous pivoting, and deep historical insights.

---

## 🚀 Planned Improvements

### 1. Dynamic OODA Rule Builder (Visual Automation)
*   **Description:** Move away from hardcoded tool-chaining.
*   **Backend:** 
    *   Create a `automation_rules` table.
    *   Schema: `id, name, trigger_type (discovery_type), trigger_value_pattern, action_tool_id, action_profile_id, is_enabled`.
*   **Frontend:** 
    *   A new "Automation Center" modal.
    *   Visual "If-This-Then-That" (IFTTT) style interface for operators to build custom OODA loops.
*   **Value:** Complete control over how the system reacts to data in real-time.

### 2. Tactical Chronology (The Timeline)
*   **Description:** A vertical, searchable log of every significant event in a mission.
*   **Data Points:**
    *   Command execution start/stop.
    *   New entity discoveries (IPs, Domains).
    *   AI-generated insights.
    *   Manual operator notes.
*   **UI/UX:** A slide-out panel or a dedicated tab next to the Terminal/Graph.
*   **Value:** Simplifies mission reconstruction and post-action reporting.

### 3. Cross-Session Asset Intelligence (The Global Vault)
*   **Description:** Break the data silo between sessions while keeping work areas clean.
*   **Implementation:**
    *   A "Global Assets" view in the Session Manager.
    *   Automatic flagging: When an entity (e.g., `api.example.com`) is found in a new session, show a badge: `[PREVIOUSLY SEEN]`.
    *   Ability to "Import Intelligence" from a previous session into the current one.
*   **Value:** Leverages historical knowledge to speed up recurring engagements.

### 4. AI-Powered "Next-Step" Command Suggestions
*   **Description:** Proactive AI assistance integrated into the terminal flow.
*   **Logic:**
    *   Backend sends latest log snippets to AI in a low-priority background thread.
    *   AI suggests 1-2 tactical next steps.
*   **UI:** Small, non-intrusive "Quick Action" buttons above the terminal prompt.
*   **Value:** Reduces operator fatigue and ensures no low-hanging fruit is missed during high-pressure missions.

### 5. Multi-Operator "Ghost-Sync"
*   **Description:** Collaborative features for red-team operations.
*   **Features:**
    *   Session Locking/Sharing: See which operator is currently active on a tool.
    *   Shared Terminal: Multi-user output streaming.
    *   Live Note Collab: Concurrent editing of mission intelligence.
*   **Value:** Essential for professional team-based operations.

---

## 🛠 Current Progress & Next Steps
- [x] Phase 1: Session Scoping & Communication Refactor (Completed)
- [ ] **Next Step:** Implement **Item 1: Dynamic OODA Rule Builder** logic in the backend.
- [ ] **Next Step:** Design the **Tactical Timeline** UI component.

---
*Note: This roadmap is intended for internal tracking and strategic alignment.*
