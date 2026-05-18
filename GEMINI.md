# C2 Tactical Control Center - V3 (Go Edition)

## Architecture
- **Frontend:** Next.js 15 (App Router, Tailwind CSS, Zustand, XYFlow, Lucide).
- **Backend:** Go 1.22+ (File-Based Persistence, Gin, Gorilla WebSocket).
- **Communication:** REST API for CRUD + WebSockets for real-time logs and tactical discoveries.
- **Engine:** Asynchronous process runner with regex-based output parsing for discovery automation.

## Quick Start
1.  **Install Dependencies:**
    ```bash
    make install-all
    ```
2.  **Run Environment:**
    ```bash
    make run-all
    ```

## Tooling
Tools are defined in the `/tools/*.yaml` directory. The backend automatically syncs these definitions on startup and checks for binary availability.
