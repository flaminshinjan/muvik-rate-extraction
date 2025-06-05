#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { createInterface } from 'readline';

function promptUser(question, defaultValue = '') {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim() || defaultValue);
        });
    });
}

function createEnvExample() {
    const envExample = `# Maersk Configuration
MAERSK_BASE_URL=https://www.maersk.com
MAERSK_USERNAME=your_maersk_username
MAERSK_PASSWORD=your_maersk_password

# AI Model Configuration for Stagehand
# Note: You need an OpenAI API key for Stagehand to work
OPENAI_API_KEY=your_openai_api_key

# Claude API Configuration (for Computer Use models)
# Note: Required for Claude Computer Use functionality
ANTHROPIC_API_KEY=your_anthropic_api_key

# Standard AI Model (default: gpt-4o-mini)
MODEL_NAME=gpt-4o-mini

# Claude Computer Use Model (Optional - for enhanced automation)
# Available options: claude-3-7-sonnet-20250219, claude-3-7-sonnet-20250219
# COMPUTER_USE_MODEL=claude-3-7-sonnet-20250219

# Logging Configuration
LOG_LEVEL=info

# Browser Configuration (Optional)
# Set to true for headless mode (no browser window)
HEADLESS=false

# Rate Limiting (Optional)
# Delay between actions in milliseconds
ACTION_DELAY=1000`;

    if (!existsSync('.env.example')) {
        writeFileSync('.env.example', envExample);
        console.log(chalk.green('✅ Created .env.example file'));
    }
    
    return envExample;
}

async function setup() {
    console.log(chalk.blue.bold('🚀 Muvik Rate Extraction - JavaScript + Stagehand AI Setup\n'));

    // Install dependencies
    console.log(chalk.yellow('📦 Installing dependencies...'));
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log(chalk.green('✅ Dependencies installed successfully\n'));
    } catch (error) {
        console.error(chalk.red('❌ Failed to install dependencies'));
        process.exit(1);
    }

    // Install Playwright browsers
    console.log(chalk.yellow('🌐 Installing Playwright Chromium browser...'));
    try {
        execSync('npx playwright install chromium', { stdio: 'inherit' });
        console.log(chalk.green('✅ Chromium browser installed successfully\n'));
    } catch (error) {
        console.error(chalk.red('❌ Failed to install Chromium browser'));
    }

    // Create .env file
    console.log(chalk.yellow('⚙️ Setting up environment configuration...\n'));

    // Create .env.example if needed and get content
    const envExample = createEnvExample();

    // Create .env if it doesn't exist
    if (!existsSync('.env')) {
        console.log(chalk.cyan('🤖 AI Model Configuration:'));
        const modelName = await promptUser('Standard AI Model (gpt-4o-mini, gpt-4o, claude-3-5-sonnet-20241022): ', 'gpt-4o-mini');
        
        console.log(chalk.cyan('\n🚀 Claude Computer Use Model Configuration:'));
        console.log(chalk.gray('Claude Computer Use models provide enhanced automation with visual understanding'));
        const computerUseModel = await promptUser('Claude Computer Use Model (claude-3-7-sonnet-20250219, claude-3-7-sonnet-20250219, or leave empty): ', 'claude-3-7-sonnet-20250219');

        let envContent = envExample;
        envContent += `\n# AI Model Configuration\n`;
        envContent += `MODEL_NAME=${modelName}\n`;
        
        if (computerUseModel.trim()) {
            envContent += `COMPUTER_USE_MODEL=${computerUseModel}\n`;
        }

        writeFileSync('.env', envContent);
        console.log(chalk.green('\n✅ Created .env file with AI model configuration'));
    } else {
        console.log(chalk.green('✅ .env file already exists'));
    }

    // Final instructions
    console.log(chalk.blue.bold('\n🎉 Setup complete! Next steps:\n'));
    console.log(chalk.white('1. Edit .env file with your credentials:'));
    console.log(chalk.gray('   - MAERSK_USERNAME=your_username'));
    console.log(chalk.gray('   - MAERSK_PASSWORD=your_password'));
    console.log(chalk.gray('   - OPENAI_API_KEY=your_openai_key'));
    console.log(chalk.gray('   - ANTHROPIC_API_KEY=your_anthropic_key'));
    
    console.log(chalk.white('\n2. Test the setup:'));
    console.log(chalk.cyan('   npm test         ') + chalk.gray('# Test login functionality'));
    console.log(chalk.cyan('   npm run demo     ') + chalk.gray('# Run Claude Computer Use demo'));
    console.log(chalk.cyan('   npm start        ') + chalk.gray('# Run full automation'));

    console.log(chalk.white('\n3. Claude Computer Use Features:'));
    console.log(chalk.green('   ✅ Claude Computer Use models configured for enhanced automation'));
    console.log(chalk.gray('   Claude provides visual understanding and better reasoning'));
    console.log(chalk.gray('   Standard agent will be used as fallback if Claude unavailable'));

    console.log(chalk.white('\n📚 Documentation:'));
    console.log(chalk.gray('   README.md        # Full documentation'));
    console.log(chalk.gray('   MIGRATION_GUIDE.md # Migration from Python'));
}

// Run setup
setup().catch(error => {
    console.error(chalk.red('❌ Setup failed:'), error.message);
    process.exit(1); 