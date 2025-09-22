#!/bin/bash

# AI Post Robot - Linux/Mac Deployment Script
# Simple wrapper for the Node.js deployment script

echo "🤖 AI Post Robot - Linux/Mac Deployment"
echo "======================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if deploy.js exists
if [ ! -f "deploy.js" ]; then
    echo "❌ Error: deploy.js not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Run the Node.js deployment script
if [ -z "$1" ]; then
    node deploy.js
else
    node deploy.js "$1"
fi
