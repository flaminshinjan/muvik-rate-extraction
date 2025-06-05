import 'dotenv/config';
import { extractMaerskRates } from './src/maersk-claude-extraction.js';
import ora from 'ora';

async function main() {
  const spinner = ora('Starting Maersk rate extraction with Claude').start();
  
  try {
    // Check required environment variables
    const requiredVars = ['MAERSK_USERNAME', 'MAERSK_PASSWORD', 'ANTHROPIC_API_KEY'];
    const missingVars = requiredVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
      spinner.fail(`Missing required environment variables: ${missingVars.join(', ')}`);
      console.error('Please make sure these variables are set in your .env file');
      process.exit(1);
    }
    
    spinner.succeed('Environment variables verified');
    spinner.start('Running rate extraction with Claude...');
    
    // Run the extraction
    const result = await extractMaerskRates();
    
    spinner.succeed('Rate extraction completed successfully');
    console.log('\n📊 Summary:');
    console.log(`Total rates found: ${result.summary.totalOptions}`);
    console.log(`Page analyzed: ${result.summary.pageAnalyzed}`);
    console.log('\nDetailed rates saved to maersk-rates.json');
    
  } catch (error) {
    spinner.fail(`Rate extraction failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
