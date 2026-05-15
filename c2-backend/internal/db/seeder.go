package db

import (
	"database/sql"
	"encoding/json"
)

type toolSeed struct {
	Name     string
	Category string
	Desc     string
	Binary   string
	Profiles []profileSeed
}

type profileSeed struct {
	Name string
	Args []string
}

func SeedTools(db *sql.DB) error {
	tools := []toolSeed{
		// RECON
		{
			Name: "Nmap", Category: "Recon", Desc: "Network Exploration and Security Auditing", Binary: "nmap",
			Profiles: []profileSeed{
				{Name: "Stealth Scan", Args: []string{"-sS", "-sV", "-T3", "<target>"}},
				{Name: "Aggressive Scan", Args: []string{"-A", "-T4", "-p-", "-v", "<target>"}},
				{Name: "Vuln Script Scan", Args: []string{"-sV", "--script", "vuln", "<target>"}},
				{Name: "UDP Scan", Args: []string{"-sU", "-T4", "--top-ports", "100", "<target>"}},
				{Name: "Ping Sweep", Args: []string{"-sn", "<target>"}},
				{Name: "OS & Version Detection", Args: []string{"-O", "-sV", "<target>"}},
				{Name: "Fast Scan (Top 100)", Args: []string{"-F", "<target>"}},
				{Name: "No Ping (Firewall Bypass)", Args: []string{"-Pn", "-sS", "-T4", "<target>"}},
				{Name: "Full Connect Scan", Args: []string{"-sT", "<target>"}},
				{Name: "Safe NSE Scripts", Args: []string{"-sV", "--script", "safe", "<target>"}},
			},
		},
		{
			Name: "Amass", Category: "Recon", Desc: "In-depth Attack Surface Mapping", Binary: "amass",
			Profiles: []profileSeed{
				{Name: "Passive Enumeration", Args: []string{"enum", "-passive", "-d", "<target>"}},
				{Name: "Active Intel", Args: []string{"intel", "-d", "<target>", "-active"}},
				{Name: "Standard Enum", Args: []string{"enum", "-d", "<target>"}},
				{Name: "ASN Discovery", Args: []string{"intel", "-asn", "<target>"}},
				{Name: "Brute Force Subdomains", Args: []string{"enum", "-brute", "-d", "<target>"}},
				{Name: "Tracking Mode", Args: []string{"track", "-d", "<target>"}},
			},
		},
		{
			Name: "Subfinder", Category: "Recon", Desc: "Passive Subdomain Enumeration", Binary: "subfinder",
			Profiles: []profileSeed{
				{Name: "Default Scan", Args: []string{"-d", "<target>"}},
				{Name: "All Sources (Slow)", Args: []string{"-d", "<target>", "-all"}},
				{Name: "Recursive Discovery", Args: []string{"-d", "<target>", "-recursive"}},
				{Name: "IP Version 4 Only", Args: []string{"-d", "<target>", "-v4"}},
				{Name: "Silent Mode", Args: []string{"-d", "<target>", "-silent"}},
			},
		},
		{
			Name: "httpx", Category: "Recon", Desc: "HTTP Toolkit for probing", Binary: "httpx",
			Profiles: []profileSeed{
				{Name: "Title & Status", Args: []string{"-u", "<target>", "-title", "-status-code"}},
				{Name: "Technology Detection", Args: []string{"-u", "<target>", "-td", "-ip"}},
				{Name: "Probe All Ports", Args: []string{"-u", "<target>", "-p", "80,443,8080,8443,9000,9443"}},
				{Name: "WAF Detection", Args: []string{"-u", "<target>", "-waf"}},
				{Name: "Method Probe", Args: []string{"-u", "<target>", "-x", "all"}},
				{Name: "Content Length & Hash", Args: []string{"-u", "<target>", "-cl", "-hash", "sha256"}},
			},
		},
		{
			Name: "Naabu", Category: "Recon", Desc: "Fast Port Scanner by ProjectDiscovery", Binary: "naabu",
			Profiles: []profileSeed{
				{Name: "Full Port Scan", Args: []string{"-p", "-", "-host", "<target>"}},
				{Name: "Top 1000 Ports", Args: []string{"-top-ports", "1000", "-host", "<target>"}},
				{Name: "Service Discovery", Args: []string{"-p", "80,443,8080,8443", "-sV", "-host", "<target>"}},
			},
		},
		{
			Name: "Masscan", Category: "Recon", Desc: "Internet-scale Port Scanner", Binary: "masscan",
			Profiles: []profileSeed{
				{Name: "Top 100 Ports", Args: []string{"--top-ports", "100", "<target>", "--rate", "1000"}},
				{Name: "Full Port Scan", Args: []string{"-p0-65535", "<target>", "--rate", "10000"}},
				{Name: "Banner Grab", Args: []string{"-p80,443,22,21", "<target>", "--banners"}},
			},
		},

		// FUZZING
		{
			Name: "ffuf", Category: "Fuzzing", Desc: "Fast web fuzzer", Binary: "ffuf",
			Profiles: []profileSeed{
				{Name: "Directory Fuzz", Args: []string{"-w", "/usr/share/wordlists/dirb/common.txt", "-u", "<target>/FUZZ", "-fc", "404", "-r"}},
				{Name: "Extension Fuzz", Args: []string{"-w", "/usr/share/wordlists/dirb/common.txt", "-u", "<target>/FUZZ", "-e", ".php,.html,.bak", "-fc", "404", "-r"}},
				{Name: "Filter 404", Args: []string{"-w", "/usr/share/wordlists/dirb/common.txt", "-u", "<target>/FUZZ", "-fc", "404", "-r"}},
				{Name: "VHost Discovery", Args: []string{"-w", "/usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt", "-u", "<target>", "-H", "Host: FUZZ.<target>", "-fc", "404", "-r"}},
				{Name: "Recursive Discovery", Args: []string{"-w", "/usr/share/wordlists/dirb/common.txt", "-u", "<target>/FUZZ", "-recursion", "-fc", "404", "-r"}},
				{Name: "Rockyou Pass Fuzz", Args: []string{"-w", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt", "-u", "<target>/FUZZ", "-fc", "404"}},
			},
		},
		{
			Name: "Arjun", Category: "Fuzzing", Desc: "HTTP Parameter Discovery", Binary: "arjun",
			Profiles: []profileSeed{
				{Name: "Discover GET Params", Args: []string{"-u", "<target>", "-m", "GET"}},
				{Name: "Discover POST Params", Args: []string{"-u", "<target>", "-m", "POST"}},
				{Name: "JSON Body Discovery", Args: []string{"-u", "<target>", "-m", "JSON"}},
				{Name: "XML Body Discovery", Args: []string{"-u", "<target>", "-m", "XML"}},
			},
		},
		{
			Name: "Gobuster", Category: "Fuzzing", Desc: "Multi-purpose Bruteforcer", Binary: "gobuster",
			Profiles: []profileSeed{
				{Name: "Dir Enumeration", Args: []string{"dir", "-u", "<target>", "-w", "/usr/share/wordlists/dirb/common.txt", "--force", "-b", "404", "-r"}},
				{Name: "Deep Scan", Args: []string{"dir", "-u", "<target>", "-w", "/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt", "-x", "php,html,txt,bak", "-t", "50", "-b", "404", "-r"}},
				{Name: "DNS Enumeration", Args: []string{"dns", "-d", "<target>", "-w", "/usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt"}},
				{Name: "VHost Discovery", Args: []string{"vhost", "-u", "<target>", "-w", "/usr/share/wordlists/dirb/common.txt"}},
				{Name: "S3 Bucket Scan", Args: []string{"s3", "-w", "/usr/share/wordlists/dirb/common.txt"}},
			},
		},
		{
			Name: "Feroxbuster", Category: "Fuzzing", Desc: "Recursive Content Discovery", Binary: "feroxbuster",
			Profiles: []profileSeed{
				{Name: "Standard Scan", Args: []string{"-u", "<target>"}},
				{Name: "Deep Recursive", Args: []string{"-u", "<target>", "-d", "5"}},
				{Name: "Filtered Status", Args: []string{"-u", "<target>", "-s", "200,301,302"}},
			},
		},

		// VULN SCANNERS
		{
			Name: "Nuclei", Category: "Vuln Scanners", Desc: "Template-based vulnerability scanner", Binary: "nuclei",
			Profiles: []profileSeed{
				{Name: "Critical & High CVEs", Args: []string{"-u", "<target>", "-severity", "critical,high"}},
				{Name: "Misconfigurations Only", Args: []string{"-u", "<target>", "-tags", "misconfiguration"}},
				{Name: "Full Arsenal", Args: []string{"-u", "<target>", "-as"}},
				{Name: "Exposed Panels", Args: []string{"-u", "<target>", "-tags", "exposed-panel"}},
				{Name: "Headless Browser", Args: []string{"-u", "<target>", "-headless"}},
				{Name: "Fuzzing Templates", Args: []string{"-u", "<target>", "-tags", "fuzzing"}},
				{Name: "Technological Profile", Args: []string{"-u", "<target>", "-tags", "tech"}},
			},
		},
		{
			Name: "Searchsploit", Category: "Vuln Scanners", Desc: "Exploit Database Search", Binary: "searchsploit",
			Profiles: []profileSeed{
				{Name: "Search Service", Args: []string{"<target>"}},
				{Name: "Full Path Search", Args: []string{"-p", "<target>"}},
				{Name: "Exhaustive Search", Args: []string{"-e", "<target>"}},
				{Name: "Nmap XML Import", Args: []string{"--nmap", "<target>"}},
			},
		},
		{
			Name: "Nikto", Category: "Vuln Scanners", Desc: "Web Server Scanner", Binary: "nikto",
			Profiles: []profileSeed{
				{Name: "Standard Scan", Args: []string{"-h", "<target>", "-Tuning", "123bde"}},
				{Name: "SSL Scan", Args: []string{"-h", "<target>", "-ssl"}},
				{Name: "Comprehensive", Args: []string{"-h", "<target>", "-C", "all"}},
			},
		},
		{
			Name: "WPScan", Category: "Vuln Scanners", Desc: "WordPress Security Scanner", Binary: "wpscan",
			Profiles: []profileSeed{
				{Name: "Aggressive Enumeration", Args: []string{"--url", "<target>", "--enumerate", "vp,vt,u", "--no-banner", "--random-user-agent"}},
				{Name: "Plugin Vulnerabilities", Args: []string{"--url", "<target>", "--enumerate", "ap", "--plugins-detection", "aggressive", "--no-banner"}},
			},
		},

		// EXPLOITATION
		{
			Name: "SQLMap", Category: "Exploitation", Desc: "Automatic SQL Injection", Binary: "sqlmap",
			Profiles: []profileSeed{
				{Name: "Auto Batch", Args: []string{"-u", "<target>", "--batch", "--random-agent", "--level", "1", "--risk", "1"}},
				{Name: "Deep Analysis", Args: []string{"-u", "<target>", "--batch", "--random-agent", "--level", "5", "--risk", "3", "--tamper", "space2comment"}},
				{Name: "Dump All Tables", Args: []string{"-u", "<target>", "--batch", "--dump-all"}},
				{Name: "OS Shell Attempt", Args: []string{"-u", "<target>", "--batch", "--os-shell"}},
			},
		},
		{
			Name: "Commix", Category: "Exploitation", Desc: "Command Injection Exploitation", Binary: "commix",
			Profiles: []profileSeed{
				{Name: "Automated Scan", Args: []string{"--url", "<target>", "--batch"}},
				{Name: "Aggressive Scan", Args: []string{"--url", "<target>", "--level", "3", "--batch"}},
				{Name: "Shell Attempt", Args: []string{"--url", "<target>", "--os-shell", "--batch"}},
			},
		},
		{
			Name: "Dalfox", Category: "Exploitation", Desc: "Advanced XSS Scanner", Binary: "dalfox",
			Profiles: []profileSeed{
				{Name: "Standard Scan", Args: []string{"url", "<target>"}},
				{Name: "Deep DOM XSS", Args: []string{"url", "<target>", "--deep-domxss"}},
				{Name: "Blind XSS (URL)", Args: []string{"url", "<target>", "-b", "your.xss.ht"}},
				{Name: "Pipeline Mode", Args: []string{"pipe"}},
			},
		},
		{
			Name: "tplmap", Category: "Exploitation", Desc: "SSTI tool", Binary: "tplmap",
			Profiles: []profileSeed{
				{Name: "Detect SSTI", Args: []string{"-u", "<target>"}},
				{Name: "Force RCE Shell", Args: []string{"-u", "<target>", "--os-shell"}},
				{Name: "Read Arbitrary File", Args: []string{"-u", "<target>", "--file-read", "/etc/passwd"}},
			},
		},

		// BRUTEFORCE
		{
			Name: "Hydra", Category: "Bruteforce", Desc: "Network Logon Cracker", Binary: "hydra",
			Profiles: []profileSeed{
				{Name: "SSH Bruteforce", Args: []string{"-L", "/usr/share/wordlists/dirb/common.txt", "-P", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt", "ssh://<target>"}},
				{Name: "FTP Bruteforce", Args: []string{"-L", "/usr/share/wordlists/dirb/common.txt", "-P", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt", "ftp://<target>"}},
				{Name: "RDP Bruteforce", Args: []string{"-L", "/usr/share/wordlists/dirb/common.txt", "-P", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt", "rdp://<target>"}},
			},
		},
		{
			Name: "Medusa", Category: "Bruteforce", Desc: "Parallel login brute-forcer", Binary: "medusa",
			Profiles: []profileSeed{
				{Name: "FTP Bruteforce", Args: []string{"-h", "<target>", "-U", "/usr/share/wordlists/dirb/common.txt", "-P", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt", "-M", "ftp"}},
				{Name: "SSH Login", Args: []string{"-h", "<target>", "-u", "root", "-P", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt", "-M", "ssh"}},
			},
		},
		{
			Name: "Hashcat", Category: "Bruteforce", Desc: "Password Recovery Tool", Binary: "hashcat",
			Profiles: []profileSeed{
				{Name: "MD5 Dictionary", Args: []string{"-m", "0", "<target>", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt"}},
				{Name: "SHA256 Dictionary", Args: []string{"-m", "1400", "<target>", "/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt"}},
				{Name: "NTLM Bruteforce", Args: []string{"-m", "1000", "<target>", "-a", "3"}},
			},
		},

		// FORENSICS
		{
			Name: "Binwalk", Category: "Forensics", Desc: "Firmware Analysis Tool", Binary: "binwalk",
			Profiles: []profileSeed{
				{Name: "Signature Scan", Args: []string{"<target>"}},
				{Name: "Extract All (Hidden)", Args: []string{"-e", "<target>"}},
				{Name: "Entropy Analysis", Args: []string{"-E", "<target>"}},
				{Name: "Matryoshka Recursive", Args: []string{"-M", "-e", "<target>"}},
				{Name: "Raw Signature Match", Args: []string{"-B", "<target>"}},
			},
		},
		{
			Name: "Exiftool", Category: "Forensics", Desc: "Metadata Extraction", Binary: "exiftool",
			Profiles: []profileSeed{
				{Name: "All Metadata", Args: []string{"-a", "-u", "-g1", "<target>"}},
				{Name: "Strip Metadata", Args: []string{"-all=", "<target>"}},
				{Name: "GPS Info Extraction", Args: []string{"-gps:all", "<target>"}},
				{Name: "Extract Thumbnails", Args: []string{"-b", "-ThumbnailImage", "<target>"}},
			},
		},
		{
			Name: "Steghide", Category: "Forensics", Desc: "Steganography Program", Binary: "steghide",
			Profiles: []profileSeed{
				{Name: "Extract Data", Args: []string{"extract", "-sf", "<target>", "-p", ""}},
				{Name: "File Info", Args: []string{"info", "<target>"}},
			},
		},
		{
			Name: "Tshark", Category: "Forensics", Desc: "Network Traffic Analyzer", Binary: "tshark",
			Profiles: []profileSeed{
				{Name: "Read PCAP", Args: []string{"-r", "<target>"}},
				{Name: "Extract HTTP URLs", Args: []string{"-r", "<target>", "-Y", "http.request", "-T", "fields", "-e", "http.host", "-e", "http.request.uri"}},
				{Name: "Expert Info", Args: []string{"-r", "<target>", "-z", "expert"}},
			},
		},
		{
			Name: "Foremost", Category: "Forensics", Desc: "File Carving Tool", Binary: "foremost",
			Profiles: []profileSeed{
				{Name: "Recover All Files", Args: []string{"-i", "<target>", "-v"}},
				{Name: "JPEG & PDF Only", Args: []string{"-t", "jpg,pdf", "-i", "<target>"}},
			},
		},
	}

	for _, t := range tools {
		var toolID int64
		err := db.QueryRow("SELECT id FROM tools WHERE LOWER(name) = LOWER(?)", t.Name).Scan(&toolID)
		if err == sql.ErrNoRows {
			res, err := db.Exec("INSERT INTO tools (name, category, description, default_binary_name) VALUES (?, ?, ?, ?)",
				t.Name, t.Category, t.Desc, t.Binary)
			if err != nil {
				return err
			}
			toolID, _ = res.LastInsertId()
		} else {
			// Update the tool information to ensure it's current
			_, err = db.Exec("UPDATE tools SET category = ?, description = ?, default_binary_name = ? WHERE id = ?",
				t.Category, t.Desc, t.Binary, toolID)
			if err != nil {
				return err
			}
		}

		for _, p := range t.Profiles {
			argsJSON, _ := json.Marshal(p.Args)
			var profExists int
			db.QueryRow("SELECT 1 FROM attack_profiles WHERE tool_id = ? AND name = ?", toolID, p.Name).Scan(&profExists)
			if profExists == 0 {
				_, err := db.Exec("INSERT INTO attack_profiles (tool_id, name, args) VALUES (?, ?, ?)",
					toolID, p.Name, string(argsJSON))
				if err != nil {
					return err
				}
			} else {
				// Update existing profile to ensure args are correct (e.g. wordlist paths)
				_, err := db.Exec("UPDATE attack_profiles SET args = ? WHERE tool_id = ? AND name = ?",
					string(argsJSON), toolID, p.Name)
				if err != nil {
					return err
				}
			}
		}
	}

	return nil
}
