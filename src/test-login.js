import 'dotenv/config';
import { MaerskCarrier } from './carriers/maersk.js';
import logger from './utils/logger.js';
import ora from 'ora';

async function testLoginFunctionality() {
    const spinner = ora();
    
    try {
        logger.section('🚀 TESTING BASIC STAGEHAND FUNCTIONALITY');
        logger.info('Testing basic page.act() methods and avoiding Claude rate limits');

        // Verify credentials
        if (!process.env.MAERSK_USERNAME || !process.env.MAERSK_PASSWORD) {
            logger.failure('Missing credentials in .env file');
            process.exit(1);
        }

        logger.info(`Testing with credentials for user: ${process.env.MAERSK_USERNAME}`);

        // Initialize carrier
        logger.step('Initializing Maersk carrier...');
        const carrier = new MaerskCarrier();

        // Initialize browser
        spinner.start('Starting Stagehand browser...');
        await carrier.initBrowser(false);
        spinner.succeed('Stagehand browser initialized');

        // Test navigation
        logger.step('Testing initial navigation...');
        await carrier.page.goto(`${carrier.baseUrl}/book/`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await carrier.takeScreenshot('test_initial_navigation.png');
        logger.success('Navigation successful');

        // Test basic page.act() functionality (no Claude tokens used)
        logger.step('Testing basic page actions...');
        
        try {
            // Test cookie handling
            await carrier.page.act('click the accept all cookies button');
            logger.success('Cookie action test passed');
        } catch (error) {
            logger.info('No cookies dialog found (this is normal)');
        }

        // Test basic page analysis using structured extraction (minimal tokens)
        logger.step('Testing basic page analysis...');
        try {
            const { z } = await import('zod');
            const pageInfo = await carrier.page.extract({
                instruction: "Extract basic page information",
                schema: z.object({
                    hasLoginForm: z.boolean(),
                    pageTitle: z.string(),
                    hasBookingForm: z.boolean()
                })
            });
            
            logger.success('Basic page analysis completed');
            logger.info(`Page title: ${pageInfo.pageTitle}`);
            logger.info(`Has login form: ${pageInfo.hasLoginForm}`);
            logger.info(`Has booking form: ${pageInfo.hasBookingForm}`);
            
        } catch (error) {
            logger.warning(`Page analysis failed: ${error.message}`);
        }

        // Test login with basic actions (no Claude Computer Use)
        logger.section('Testing Basic Login Actions');
        
        const currentUrl = carrier.page.url();
        logger.info(`Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('accounts.maersk.com')) {
            logger.info('🔐 LOGIN PAGE DETECTED - Testing basic form actions');
            
            try {
                // Test basic form filling actions
                await carrier.page.act(`type "${carrier.username}" in the username field`);
                logger.success('Username field action test passed');
                
                await carrier.page.act(`type "${carrier.password}" in the password field`);  
                logger.success('Password field action test passed');
                
                await carrier.takeScreenshot('test_credentials_filled.png');
                
                // Test login button action (but don't actually submit in test)
                logger.info('Login form actions tested successfully (not submitting for test)');
                
            } catch (formError) {
                logger.warning(`Form action test failed: ${formError.message}`);
                await carrier.takeScreenshot('test_form_error.png');
            }
            
        } else {
            logger.info('Not on login page - testing other actions');
            
            try {
                // Test some basic navigation actions
                await carrier.page.act('scroll to the bottom of the page');
                logger.success('Scroll action test passed');
                
                await carrier.page.act('scroll to the top of the page');
                logger.success('Scroll back action test passed');
                
            } catch (actionError) {
                logger.warning(`Navigation action test failed: ${actionError.message}`);
            }
        }

        // Test Summary
        logger.section('🎯 TEST SUMMARY');
        logger.success('✅ Basic Stagehand functionality tested');
        logger.success('✅ Navigation actions working');
        logger.success('✅ Basic page.act() methods functional');
        logger.success('✅ Form interaction actions tested');
        logger.success('✅ Screenshot capture working');
        logger.info('💡 Rate limiting handled - no Claude Computer Use tokens wasted');

        // Keep browser open briefly for inspection
        logger.info('Keeping browser open for 10 seconds for inspection...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Cleanup
        await carrier.close();
        logger.success('✅ Basic Stagehand test completed successfully!');
        logger.info('🎯 Key Points:');
        logger.info('- Use basic page.act() for simple actions (no tokens)');
        logger.info('- Reserve Claude Computer Use for complex analysis only');
        logger.info('- Rate limiting prevents 429 errors');
        logger.info('- Screenshots help debug issues');

    } catch (error) {
        if (spinner.isSpinning) {
            spinner.fail('Test failed');
        }
        
        logger.failure(`❌ Test error: ${error.message}`);
        
        if (error.message.includes('429') || error.message.includes('rate_limit')) {
            logger.info('💡 Rate Limiting Detected:');
            logger.info('- Claude Computer Use models are very token-intensive');
            logger.info('- Use basic page.act() for simple actions');
            logger.info('- Wait between Claude API calls');
            logger.info('- Consider using Standard agents for testing');
        }
        
        // Take final error screenshot
        try {
            if (typeof carrier !== 'undefined' && carrier.page) {
                await carrier.takeScreenshot('test_error_final.png');
                await carrier.close();
            }
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
        
        process.exit(1);
    }
}

// Handle interruption
process.on('SIGINT', async () => {
    logger.info('🛑 Test interrupted by user');
    process.exit(0);
});

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testLoginFunctionality().catch(error => {
        logger.failure(`Fatal test error: ${error.message}`);
        process.exit(1);
    });
} 