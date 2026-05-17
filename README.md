# Duelist C2 - Tactical Command & Control Center

Duelist C2 is a high-performance, multi-threaded Command & Control (C2) interface designed for modern security operations. It provides a unified, tactical dashboard for reconnaissance, exploitation, forensics, and AI-driven vulnerability analysis.

![Dashboard Preview](https://via.placeholder.com/1200x600?text=Duelist+C2+Tactical+Interface)

## ⚔️ Key Features

- **🚀 Multi-Threaded Execution:** Engage multiple security tools simultaneously. navigation is never blocked by active scans.
- **🛡️ Massive Arsenal:** Over 30 pre-configured tactical tools with 150+ realistic attack profiles (Nmap, SQLMap, Nuclei, Ffuf, etc.).
- **🤖 AI Intelligence:** Integrated analysis engine supporting Gemini 2.0, GPT-4o, and Claude 3.5. Features Persona settings and Evidence Context Injection.
- **📂 Tactical File Manager:** Upload payloads and manage forensics files directly from the web interface.
- **🔍 Evidence Explorer:** Real-time log streaming and a 30/70 split file explorer for deep data analysis.
- **💾 Ghost Notes:** Persistent Markdown reporting system backed by browser IndexedDB (data never leaves your machine).

## 🛠️ Tool Arsenal Categories

- **Recon:** Nmap, Amass, Subfinder, Masscan, WhatWeb, Httpx.
- **Fuzzing:** ffuf, Gobuster, Feroxbuster, Wfuzz.
- **Vuln Scanners:** Nuclei, Nikto, WPScan.
- **Exploitation:** SQLMap, Commix, Dalfox, Tplmap, XSStrike.
- **Bruteforce:** Hydra, Medusa, Hashcat.
- **Forensics:** Binwalk, Exiftool, Steghide, Tshark, Foremost, Bulk_Extractor.

## 🚀 Rapid Engagement

The system is optimized for Arch Linux. Use the integrated entrypoint for a one-click launch.

1.  **Clone & Setup:**
    ```bash
    git clone https://github.com/the-abra/C2.git
    cd C2
    chmod +x entrypoint.sh setup.sh scripts/cleanup.sh
    ./setup.sh
    ```

2.  **Launch Dashboard:**
    ```bash
    # This builds frontend, backend, and starts servers
    ./entrypoint.sh
    ```

3.  **Access:**
    - Dashboard: `http://localhost:8080`
    - API Hub: `http://localhost:1453`

## 🧠 AI Configuration

1.  Open the **AI Intelligence** panel in the sidebar.
2.  Click **Configure API Access**.
3.  Paste your API key (Gemini, OpenAI, or Anthropic).
4.  The system will auto-detect the provider and load the latest models (e.g., Gemini 2.0 Flash).
5.  Use the **Paperclip** icon to attach scan results from the Evidence Explorer directly to your AI prompts.

## ⚠️ Disclaimer

This tool is for educational and authorized security testing purposes only. Usage for attacking targets without prior mutual consent is illegal. It is the end user's responsibility to obey all applicable local, state, and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program.

---
**Duelist C2** - *High-Fidelity Cyber Engagement*
