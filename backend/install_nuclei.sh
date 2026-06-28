#!/bin/bash
# install_nuclei.sh
# Downloads and extracts the latest Nuclei binary into a local /bin folder for Pxxl deployments.

set -e

# Create a bin directory inside the backend folder
mkdir -p bin
cd bin

echo "Downloading Nuclei for Linux AMD64..."
# Download the specific release (v3.8.0 to match the local Windows version)
curl -sL -o nuclei.zip https://github.com/projectdiscovery/nuclei/releases/download/v3.8.0/nuclei_3.8.0_linux_amd64.zip

echo "Extracting Nuclei..."
unzip -o nuclei.zip nuclei

echo "Making it executable..."
chmod +x nuclei

# Clean up
rm nuclei.zip

echo "Nuclei installed successfully to backend/bin/nuclei"
./nuclei -version
