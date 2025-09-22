#!/usr/bin/env node

/**
 * AI Post Robot - Standard Deployment Script
 * 
 * Simple, reliable deployment workflow:
 * 1. Updates local extension/ folder for Chrome testing
 * 2. Deploys clean extension files to GitHub repository
 * 
 * Usage:
 *   node deploy.js local    - Update local extension folder only
 *   node deploy.js github   - Deploy to GitHub (includes local update)
 *   node deploy.js all      - Update local + deploy to GitHub
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const EXTENSION_FILES = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'options.html',
    'options.js',
    'advanced-scheduler.html',
    'advanced-scheduler.js',
    'schedule.html',
    'schedule.js',
    'robopost-api.js',
    'gemini-api.js',
    'README.md'
];

const EXTENSION_DIRS = [
    'icons',
    'image-editor-module'
];

const EXTENSION_DIR = 'extension';
const GITHUB_REPO = 'https://github.com/charithharshana/AI-Post-Robot.git';
const BRANCH = 'main';

// Utility functions
function log(message, type = 'info') {
    const icons = { info: '📋', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${icons[type]} ${message}`);
}

function copyFile(src, dest) {
    try {
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            return true;
        }
        return false;
    } catch (error) {
        log(`Failed to copy ${src}: ${error.message}`, 'error');
        return false;
    }
}

function copyDir(src, dest) {
    try {
        if (fs.existsSync(src)) {
            fs.cpSync(src, dest, { recursive: true, force: true });
            return true;
        }
        return false;
    } catch (error) {
        log(`Failed to copy directory ${src}: ${error.message}`, 'error');
        return false;
    }
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function updateLocalExtension() {
    log('Updating local extension folder...');
    
    // Ensure extension directory exists
    ensureDir(EXTENSION_DIR);
    
    // Copy individual files
    let copiedFiles = 0;
    for (const file of EXTENSION_FILES) {
        if (copyFile(file, path.join(EXTENSION_DIR, file))) {
            copiedFiles++;
        }
    }
    
    // Copy directories
    let copiedDirs = 0;
    for (const dir of EXTENSION_DIRS) {
        const destDir = path.join(EXTENSION_DIR, dir);
        if (copyDir(dir, destDir)) {
            copiedDirs++;
        }
    }
    
    log(`Local extension updated: ${copiedFiles} files, ${copiedDirs} directories`, 'success');
    log(`Extension ready for Chrome testing: ${EXTENSION_DIR}/`, 'info');
    
    return true;
}

function deployToGitHub() {
    log('Deploying to GitHub...');
    
    try {
        // Check if we have git
        execSync('git --version', { stdio: 'ignore' });
        
        // Check if extension directory exists
        if (!fs.existsSync(EXTENSION_DIR)) {
            log('Extension directory not found. Run local update first.', 'error');
            return false;
        }
        
        // Navigate to extension directory and set up git
        process.chdir(EXTENSION_DIR);
        
        // Initialize git if needed
        if (!fs.existsSync('.git')) {
            execSync('git init', { stdio: 'ignore' });
        }
        
        // Configure git
        execSync('git config user.email "wcharithharshana@gmail.com"', { stdio: 'ignore' });
        execSync('git config user.name "Charith Harshana"', { stdio: 'ignore' });
        
        // Set up remote
        try {
            execSync('git remote remove origin', { stdio: 'ignore' });
        } catch (e) {
            // Remote doesn't exist, that's fine
        }
        execSync(`git remote add origin ${GITHUB_REPO}`, { stdio: 'ignore' });
        
        // Add all files
        execSync('git add .', { stdio: 'ignore' });
        
        // Check if there are changes
        try {
            execSync('git diff --cached --quiet', { stdio: 'ignore' });
            log('No changes detected - repository is up to date!', 'success');
            process.chdir('..');
            return true;
        } catch (e) {
            // There are changes, continue with commit
        }
        
        // Show changes
        const changes = execSync('git diff --cached --name-status', { encoding: 'utf8' });
        log('Changes detected:');
        console.log(changes);
        
        // Create commit
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        execSync(`git commit -m "Update Chrome extension files - ${timestamp}"`, { stdio: 'ignore' });
        
        // Push to GitHub
        try {
            execSync(`git push origin ${BRANCH}`, { stdio: 'ignore' });
        } catch (e) {
            // Try force push (expected for this workflow)
            execSync(`git push --force origin ${BRANCH}`, { stdio: 'ignore' });
        }
        
        process.chdir('..');
        log('Successfully deployed to GitHub!', 'success');
        log(`View at: ${GITHUB_REPO.replace('.git', '')}`, 'info');
        
        return true;
        
    } catch (error) {
        process.chdir('..');
        log(`GitHub deployment failed: ${error.message}`, 'error');
        return false;
    }
}

// Main execution
function main() {
    const command = process.argv[2] || 'help';
    
    log('🤖 AI Post Robot - Standard Deployment Script');
    log('==============================================');
    
    switch (command) {
        case 'local':
            updateLocalExtension();
            break;
            
        case 'github':
            if (updateLocalExtension()) {
                deployToGitHub();
            }
            break;
            
        case 'all':
            if (updateLocalExtension()) {
                deployToGitHub();
            }
            break;
            
        default:
            console.log(`
Usage:
  node deploy.js local    - Update local extension folder for Chrome testing
  node deploy.js github   - Deploy to GitHub (includes local update)  
  node deploy.js all      - Same as github

Examples:
  node deploy.js local    # Quick local testing
  node deploy.js github   # Full deployment
            `);
            break;
    }
}

if (require.main === module) {
    main();
}

module.exports = { updateLocalExtension, deployToGitHub };
