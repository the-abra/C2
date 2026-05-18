#!/bin/bash

# C2 Tool Installer
# Installs essential tools for CTF and Penetration Testing

set -e

echo "🔧 Starting Tool Installation..."

# 1. Update & Install system dependencies
sudo apt-get update
sudo apt-get install -y git python3 python3-pip golang-go nmap gobuster ffuf nikto hydra sqlmap foremost binwalk steghide tshark curl amass foremost steghide masscan whatweb exiftool python3-wfuzz

# 2. ProjectDiscovery Tools (via Go)
echo "🚀 Installing ProjectDiscovery tools..."
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# 3. Web Fuzzers & Scanners
echo "🚀 Installing Dalfox & Amass..."
go install github.com/hahwul/dalfox/v2@latest
# Amass installation (binary usually preferred)
# sudo snap install amass # Or use go install

# 4. Tplmap & Arjun
if [ ! -d "/opt/tplmap" ]; then
    echo "🚀 Installing Tplmap..."
    sudo git clone https://github.com/epinna/tplmap.git /opt/tplmap
    sudo pip3 install -r /opt/tplmap/requirements.txt
fi

echo "🚀 Installing Arjun..."
sudo pip3 install arjun

# 5. Move Go binaries to /usr/local/bin for global access if needed
# or just ensure ~/go/bin is in PATH
export PATH=$PATH:$(go env GOPATH)/bin
echo "export PATH=\$PATH:$(go env GOPATH)/bin" >> ~/.bashrc

echo "✅ All tools installed successfully!"
