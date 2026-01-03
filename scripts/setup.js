#!/usr/bin/env node

/**
 * Quatrix Setup Script
 * One-time setup for initial installation
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function header(message) {
    console.log('');
    log(`${'='.repeat(60)}`, colors.cyan);
    log(`  ${message}`, colors.bright + colors.cyan);
    log(`${'='.repeat(60)}`, colors.cyan);
    console.log('');
}

function step(number, message) {
    log(`[${number}/4] ${message}`, colors.blue);
}

async function runCommand(command, cwd = process.cwd()) {
    try {
        execSync(command, { stdio: 'inherit', cwd });
        return true;
    } catch (error) {
        log(`❌ Command failed: ${command}`, colors.reset);
        return false;
    }
}

async function setup() {
    header('🎮 Quatrix CS2 Server Manager - Setup');

    const rootDir = join(__dirname, '..');
    const backendDir = join(rootDir, 'backend');
    const frontendDir = join(rootDir, 'frontend');

    // Step 1: Install Backend Dependencies
    step(1, 'Installing backend dependencies...');
    if (!await runCommand('npm install', backendDir)) {
        log('❌ Backend installation failed!', colors.reset);
        process.exit(1);
    }
    log('✅ Backend dependencies installed\n', colors.green);

    // Step 2: Install Frontend Dependencies
    step(2, 'Installing frontend dependencies...');
    if (!await runCommand('npm install', frontendDir)) {
        log('❌ Frontend installation failed!', colors.reset);
        process.exit(1);
    }
    log('✅ Frontend dependencies installed\n', colors.green);

    // Step 3: Generate Prisma Client
    step(3, 'Generating Prisma Client...');
    if (!await runCommand('npx prisma generate', backendDir)) {
        log('❌ Prisma generation failed!', colors.reset);
        process.exit(1);
    }
    log('✅ Prisma Client generated\n', colors.green);

    // Step 4: Run Database Migrations
    step(4, 'Setting up database...');
    const dbPath = join(backendDir, 'prisma', 'dev.db');

    if (existsSync(dbPath)) {
        log('⚠️  Database already exists, skipping migration...', colors.yellow);
    } else {
        if (!await runCommand('npx prisma migrate deploy', backendDir)) {
            log('❌ Database migration failed!', colors.reset);
            process.exit(1);
        }
    }
    log('✅ Database ready\n', colors.green);

    // Success message
    header('✅ Setup Complete!');

    log('You can now start the development server:', colors.green);
    log('', colors.reset);
    log('  npm run dev', colors.bright + colors.cyan);
    log('', colors.reset);
    log('The application will be available at:', colors.green);
    log('  Frontend: http://localhost:3001', colors.cyan);
    log('  Backend:  http://localhost:3000', colors.cyan);
    console.log('');
}

setup().catch((error) => {
    console.error('');
    log('❌ Setup failed!', colors.reset);
    console.error(error);
    process.exit(1);
});
