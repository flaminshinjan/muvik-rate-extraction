import { MaerskCarrier } from '../carriers/maersk.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let carrier = null;

async function cleanup() {
    if (carrier) {
        try {
            await carrier.close();
            carrier = null;
        } catch (error) {
            logger.warning(`Cleanup error: ${error.message}`);
        }
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Cleaning up...');
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Cleaning up...');
    await cleanup();
    process.exit(0);
});

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation(operation, maxAttempts = 3, delayMs = 5000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logger.info(`Attempt ${attempt}/${maxAttempts}`);
            const result = await operation();
            logger.success('Operation successful!');
            return result;
        } catch (error) {
            lastError = error;
            logger.warning(`Attempt ${attempt} failed: ${error.message}`);
            
            if (attempt < maxAttempts) {
                logger.info(`Waiting ${delayMs/1000} seconds before retry...`);
                await delay(delayMs);
            }
        }
    }
    
    throw new Error(`Operation failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
}

async function testRateExtraction() {
    logger.section('Testing Maersk Rate Extraction with Browser Use');
    
    try {
        // Initialize carrier and browser
        carrier = new MaerskCarrier();
        await retryOperation(async () => {
            logger.step('Initializing browser...');
            await carrier.initBrowser(false); // false = show browser for debugging
        });
        
        // Login
        logger.step('Testing login...');
        await retryOperation(async () => {
            await carrier.hybridLogin();
        });
        
        // Create test booking details
        const testBooking = {
            origin: 'Mumbai, India',
            destination: 'Hamburg, Germany',
            commodity: 'Electronics',
            containers: [
                {
                    size: '20',
                    type: 'Dry',
                    quantity: 1
                }
            ],
            originTransport: { type: 'CY' },
            destinationTransport: { type: 'CY' },
            validate: () => [] // Mock validation for testing
        };
        
        // Fill booking form
        logger.step('Testing booking form fill...');
        await retryOperation(async () => {
            await carrier.fillBookingForm(testBooking);
        });
        
        // Extract rates
        logger.step('Testing rate extraction...');
        const rates = await retryOperation(async () => {
            return await carrier.extractRates();
        });
        
        // Log the results
        logger.success('Rate extraction completed successfully!');
        logger.info('📊 Extracted Rates:');
        console.log(JSON.stringify(rates, null, 2));
        
    } catch (error) {
        logger.failure(`Rate extraction test failed: ${error.message}`);
        console.error('Full error:', error);
    } finally {
        // Cleanup
        await cleanup();
    }
}

// Run the test
testRateExtraction().catch(async (error) => {
    console.error(error);
    await cleanup();
    process.exit(1);
}); 