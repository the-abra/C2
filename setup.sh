#!/bin/bash

# C2 Tactical Arsenal - Automated Setup Script for Arch Linux
# ----------------------------------------------------------
# This script installs all 30+ tools required by the C2 Backend.
# It uses pacman, yay, pip, gem, and git.

if [ "$EUID" -eq 0 ]; then
  echo "[!] Please do not run this script as root."
  echo "    'yay' and 'pip' should be run as a normal user with sudo privileges."
  exit 1
fi

echo "[*] Updating system and installing core build dependencies..."
sudo pacman -Syu --noconfirm
sudo pacman -S --noconfirm --needed base-devel git python python-pip ruby go curl wget libpcap pcre2 openssl zlib

echo "[*] Installing standard repository tools (pacman)..."
sudo pacman -S --noconfirm \
  nmap masscan ffuf gobuster nuclei nikto wpscan sqlmap \
  hydra medusa hashcat binwalk perl-image-exiftool \
  steghide wireshark-cli foremost

echo "[*] Ensuring 'yay' is installed for AUR packages..."
if ! command -v yay &> /dev/null; then
    echo "    Installing yay..."
    git clone https://aur.archlinux.org/yay.git /tmp/yay
    cd /tmp/yay
    makepkg -si --noconfirm
    cd -
    rm -rf /tmp/yay
fi

echo "[*] Installing AUR tools..."
yay -S --noconfirm httpx-bin whatweb feroxbuster-bin amass-bin subfinder-bin dalfox-bin

echo "[*] Installing Ruby gems..."
sudo gem install getoptlong resolv-replace

echo "[*] Installing Python packages..."
# Using --break-system-packages for Arch Linux PEP 668 compliance in user/global scope
pip install six chardet pycurl commix wfuzz --break-system-packages

echo "[*] Installing tools from source (Git)..."
sudo mkdir -p /opt
sudo chown $USER:$USER /opt

# tplmap
if [ ! -d "/opt/tplmap" ]; then
    echo "    Cloning tplmap..."
    git clone https://github.com/epinna/tplmap.git /opt/tplmap
    pip install -r /opt/tplmap/requirements.txt --break-system-packages
else
    echo "    tplmap already installed."
fi

# XSStrike
if [ ! -d "/opt/XSStrike" ]; then
    echo "    Cloning XSStrike..."
    git clone https://github.com/s0md3v/XSStrike.git /opt/XSStrike
    pip install -r /opt/XSStrike/requirements.txt --break-system-packages
    sudo ln -sf /opt/XSStrike/xsstrike.py /usr/local/bin/xsstrike
else
    echo "    XSStrike already installed."
fi

# bulk_extractor
if [ ! -d "/opt/bulk_extractor" ]; then
    echo "    Cloning and building bulk_extractor (this may take a few minutes)..."
    git clone --recursive https://github.com/simsong/bulk_extractor.git /opt/bulk_extractor
    cd /opt/bulk_extractor
    chmod +x bootstrap.sh
    ./bootstrap.sh
    ./configure
    make
    sudo make install
    cd -
else
    echo "    bulk_extractor already installed."
fi

echo ""
echo "[+] ----------------------------------------------------"
echo "[+] Arsenal setup complete!"
echo "[+] All tools have been installed to your system."
echo "[+] ----------------------------------------------------"
