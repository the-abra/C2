package core

import (
	"c2-backend/internal/db"
	"encoding/json"
	"regexp"
	"strings"
)

type Parser struct {
	store *db.Store
}

func NewParser(s *db.Store) *Parser {
	return &Parser{store: s}
}

// ExtractEntities parses tool output and returns discovered entities.
func (p *Parser) ExtractEntities(toolName string, scanID, sessionID int64, output string) []db.Discovery {
	lines := strings.Split(output, "\n")
	var discoveries []db.Discovery
	
	switch strings.ToLower(toolName) {
	case "subfinder", "amass":
		discoveries = p.parseDomains(scanID, sessionID, lines)
	case "nmap", "naabu":
		discoveries = p.parseNmap(scanID, sessionID, output)
	case "httpx":
		discoveries = p.parseHttpx(scanID, sessionID, lines)
	case "nuclei":
		discoveries = p.parseNuclei(scanID, sessionID, lines)
	}
	return discoveries
}

func (p *Parser) parseNuclei(scanID, sessionID int64, lines []string) []db.Discovery {
	re := regexp.MustCompile(`\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+([^\s]+)`)
	var discoveries []db.Discovery

	for _, line := range lines {
		match := re.FindStringSubmatch(line)
		if len(match) >= 5 {
			templateID := match[1]
			severity := match[3]
			url := match[4]

			metadata, _ := json.Marshal(map[string]string{
				"template_id": templateID,
				"severity":    severity,
				"url":         url,
			})

			d := db.Discovery{
				Type:         "vuln",
				Value:        templateID + " on " + url,
				Metadata:     string(metadata),
				SourceScanID: scanID,
				SessionID:    sessionID,
			}
			p.store.SaveDiscovery(d)
			discoveries = append(discoveries, d)
		}
	}
	return discoveries
}

func (p *Parser) parseDomains(scanID, sessionID int64, lines []string) []db.Discovery {
	re := regexp.MustCompile(`^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.)+[a-zA-Z]{2,}$`)
	var discoveries []db.Discovery
	
	for _, line := range lines {
		domain := strings.TrimSpace(line)
		if re.MatchString(domain) {
			d := db.Discovery{
				Type:         "domain",
				Value:        domain,
				SourceScanID: scanID,
				SessionID:    sessionID,
			}
			p.store.SaveDiscovery(d)
			discoveries = append(discoveries, d)
		}
	}
	return discoveries
}

func (p *Parser) parseNmap(scanID, sessionID int64, output string) []db.Discovery {
	ipRe := regexp.MustCompile(`(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})`)
	portRe := regexp.MustCompile(`(\d+)/(tcp|udp)\s+open\s+([^\s]+)`)
	var discoveries []db.Discovery

	ips := ipRe.FindAllString(output, -1)
	for _, ip := range ips {
		d := db.Discovery{
			Type:         "ip",
			Value:        ip,
			SourceScanID: scanID,
			SessionID:    sessionID,
		}
		p.store.SaveDiscovery(d)
		discoveries = append(discoveries, d)
	}

	ports := portRe.FindAllStringSubmatch(output, -1)
	for _, match := range ports {
		if len(match) >= 4 {
			port := match[1]
			proto := match[2]
			service := match[3]
			
			metadata, _ := json.Marshal(map[string]string{
				"port":     port,
				"protocol": proto,
				"service":  service,
			})

			d := db.Discovery{
				Type:         "service",
				Value:        service + " on " + port,
				Metadata:     string(metadata),
				SourceScanID: scanID,
				SessionID:    sessionID,
			}
			p.store.SaveDiscovery(d)
			discoveries = append(discoveries, d)
		}
	}
	return discoveries
}

func (p *Parser) parseHttpx(scanID, sessionID int64, lines []string) []db.Discovery {
	var discoveries []db.Discovery
	// Regex to match URLs even with ANSI codes or surrounding text
	re := regexp.MustCompile(`(https?://[^\s\[\x1b]+)`)

	for _, line := range lines {
		match := re.FindString(line)
		if match != "" {
			d := db.Discovery{
				Type:         "service",
				Value:        match,
				SourceScanID: scanID,
				SessionID:    sessionID,
			}
			p.store.SaveDiscovery(d)
			discoveries = append(discoveries, d)
		}
	}
	return discoveries
}
