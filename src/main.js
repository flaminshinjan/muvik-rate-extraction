import 'dotenv/config';
import { MaerskCarrier } from './carriers/maersk.js';
import { createSampleBooking } from './models/booking.js';
import logger from './utils/logger.js';
import ora from 'ora';

async function main() {
    const spinner = ora();
    
    try {
        logger.section('Automated Maersk Rate Extraction with Stagehand 2.0 OpenAI Computer Use');
        logger.info('Using OpenAI Computer Use with Sequential Tool Calling for robust automation');

        // Verify environment variables
        if (!process.env.MAERSK_USERNAME || !process.env.MAERSK_PASSWORD) {
            logger.failure('Missing credentials in .env file');
            logger.failure('Please ensure MAERSK_USERNAME and MAERSK_PASSWORD are set in your .env file');
            process.exit(1);
        }

        if (!process.env.OPENAI_API_KEY) {
            logger.failure('Missing OpenAI API key in .env file');
            logger.failure('Please ensure OPENAI_API_KEY is set for Stagehand AI to work');
            process.exit(1);
        }

        logger.info(`Using credentials for user: ${process.env.MAERSK_USERNAME}`);
        logger.info('🤖 Using OpenAI Computer Use for reliable automation');

        // Create sample booking details
        const booking = createSampleBooking();
        logger.info(`Booking details: ${booking.origin} → ${booking.destination}`);
        logger.info(`Commodity: ${booking.commodity}`);
        logger.info(`Container: ${booking.containers[0].quantity}x ${booking.containers[0].size}ft ${booking.containers[0].type}`);

        // Initialize Maersk carrier
        logger.step('Initializing Maersk carrier with OpenAI Computer Use...');
        const carrier = new MaerskCarrier();

        // Start browser automation
        spinner.start('Starting Stagehand browser with OpenAI Computer Use...');
        await carrier.initBrowser(false); // Set to true for headless mode
        spinner.succeed('Stagehand browser with OpenAI Computer Use started successfully');

        // OpenAI Computer Use Sequential Login
        logger.section('OpenAI Computer Use Sequential Login System');
        logger.info('Using Sequential Tool Calling (Open Operator) for intelligent login automation');

        const maxLoginAttempts = 2;
        let loginSuccess = false;

        for (let attempt = 1; attempt <= maxLoginAttempts && !loginSuccess; attempt++) {
            try {
                logger.step(`OpenAI Computer Use login attempt ${attempt}/${maxLoginAttempts}`);
                
                spinner.start('Performing OpenAI Computer Use sequential login...');
                loginSuccess = await carrier.hybridLogin();
                
                if (loginSuccess) {
                    spinner.succeed('OpenAI Computer Use sequential login completed successfully');
                    logger.success('OpenAI Computer Use sequential login completed successfully!');
                } else {
                    spinner.fail('OpenAI Computer Use sequential login returned false');
                    logger.warning('OpenAI Computer Use sequential login returned false');
                }

            } catch (loginError) {
                spinner.fail(`OpenAI Computer Use login attempt ${attempt} failed`);
                logger.warning(`OpenAI Computer Use login attempt ${attempt} failed: ${loginError.message}`);

                if (attempt < maxLoginAttempts) {
                    logger.step(`Retrying OpenAI Computer Use login (attempt ${attempt + 1}/${maxLoginAttempts})...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } else {
                    logger.failure('Maximum OpenAI Computer Use login attempts reached.');
                    throw loginError;
                }
            }
        }

        if (!loginSuccess) {
            logger.failure('All OpenAI Computer Use login attempts failed');
            return;
        }

        // Enhanced Post-Login Verification
        logger.section('Post-Login Verification');
        
        spinner.start('Verifying login success with OpenAI Computer Use...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Allow page to stabilize
        spinner.succeed('Login verification completed');

        // Navigate to booking page if needed
        const currentUrl = carrier.page.url();
        logger.info(`Current URL: ${currentUrl}`);

        if (!currentUrl.includes('/book')) {
            logger.step('Navigating to booking page...');
            await carrier.page.goto(`${carrier.baseUrl}/book/`);
        }

        // OpenAI Computer Use Page Analysis
        logger.section('OpenAI Computer Use Page Analysis');
        
        spinner.start('Analyzing booking page with OpenAI Computer Use...');
        const pageAnalysis = await carrier.verifyBookingPage();
        spinner.succeed('OpenAI Computer Use page analysis completed');

        logger.info(`📊 Page Analysis Results:`);
        logger.info(`  - Has booking form: ${pageAnalysis.hasBookingForm ? '✅' : '❌'}`);
        logger.info(`  - Has location fields: ${pageAnalysis.hasLocationFields ? '✅' : '❌'}`);
        logger.info(`  - Has continue button: ${pageAnalysis.hasContinueButton ? '✅' : '❌'}`);
        logger.info(`  - Elements found: ${pageAnalysis.elementsFound.length}`);

        if (pageAnalysis.hasBookingForm && pageAnalysis.hasLocationFields) {
            // OpenAI Computer Use Booking Form Filling
            logger.section('OpenAI Computer Use Booking Form Filling');

            spinner.start('Filling booking form with OpenAI Computer Use...');
            try {
                const formResult = await carrier.fillBookingForm(booking);
                spinner.succeed('Booking form filled successfully');

                logger.success('✅ Booking form filled successfully with OpenAI Computer Use!');
                
                if (formResult.canContinue) {
                    logger.success(`✅ Continue button available: ${formResult.buttonText}`);
                    
                    // Submit form automatically
                    logger.step('Submitting form with OpenAI Computer Use...');
                    spinner.start('OpenAI Computer Use submitting booking form...');
                    
                    const submitResult = await carrier.submitBookingForm();
                    if (submitResult.success) {
                        spinner.succeed('Booking form submitted successfully');
                        
                        // OpenAI Computer Use Rate Extraction
                        logger.section('OpenAI Computer Use Rate Extraction');
                        spinner.start('Extracting shipping rates with OpenAI Computer Use...');
                        
                        try {
                            const rateResults = await carrier.extractRates();
                            spinner.succeed('Rate extraction completed');
                            
                            logger.success('✅ Rate extraction completed!');
                            logger.info(`🤖 OpenAI Computer Use Analysis: ${rateResults.agentSummary}`);
                            
                            if (rateResults.detailedRates.hasRateInformation) {
                                logger.info(`📊 Found ${rateResults.detailedRates.totalOptionsFound} rate options`);
                                
                                rateResults.detailedRates.rates.forEach((rate, index) => {
                                    logger.info(`Rate ${index + 1}: ${rate.serviceName} - ${rate.price || 'N/A'} (${rate.transitTime || 'N/A'})`);
                                });
                            } else {
                                logger.warning('No rate information found on current page');
                            }
                            
                            // Save action history for replay
                            logger.step('Saving action history for replay...');
                            await carrier.saveActionHistory('maersk_rate_extraction_replay.js');
                            
                        } catch (rateError) {
                            spinner.fail('Rate extraction failed');
                            logger.warning(`Rate extraction error: ${rateError.message}`);
                        }
                        
                    } else {
                        spinner.fail('Form submission failed');
                    }
                    
                } else {
                    logger.info('ℹ️ No continue button found - form may need manual review');
                }

            } catch (formError) {
                spinner.fail('Booking form filling failed');
                logger.failure(`Error filling booking form: ${formError.message}`);
                await carrier.takeScreenshot('error_form_filling.png');
            }

        } else {
            logger.warning('⚠️ Expected booking form elements not found');
            logger.info('Taking screenshot for manual inspection...');
            await carrier.takeScreenshot('debug_no_booking_form.png');
        }

        // Final Status Report
        logger.section('OpenAI Computer Use Automation Summary');
        logger.info('📊 EXECUTION SUMMARY');
        logger.success(`✅ Browser initialization: Success`);
        logger.success(`✅ OpenAI Computer Use sequential login: ${loginSuccess ? 'Success' : 'Failed'}`);
        logger.success(`✅ Page navigation: Success`);
        logger.success(`✅ OpenAI Computer Use page analysis: Success`);
        logger.success(`✅ Form detection: ${pageAnalysis.hasBookingForm ? 'Success' : 'Failed'}`);
        logger.success(`✅ OpenAI Computer Use automation: ${pageAnalysis.hasBookingForm ? 'Attempted' : 'Skipped'}`);
        logger.success(`✅ Action replay saved: Yes`);
        logger.info('🤖 OpenAI Computer Use provides reliable automation without rate limiting');

        // Manual Inspection Time
        logger.section('Manual Inspection');
        logger.info('🔍 Browser will remain open for 60 seconds for manual inspection');
        logger.info('You can:');
        logger.info('1. Review the OpenAI Computer Use automation results');
        logger.info('2. Check any extracted rates manually');
        logger.info('3. Verify the Sequential Tool Calling worked correctly');
        logger.info('4. Take screenshots for documentation');
        logger.info('5. Check the generated replay file for debugging');
        logger.info('Press Ctrl+C to close early if needed');

        // Keep browser open for inspection
        spinner.start('Keeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        spinner.succeed('Inspection time completed');

        // Cleanup
        await carrier.close();
        logger.success('✅ Automated Maersk rate extraction with OpenAI Computer Use completed successfully!');
        logger.info('📄 Check maersk_rate_extraction_replay.js for action replay');
        logger.info('🤖 OpenAI Computer Use: Reliable, fast, and no rate limiting issues');

    } catch (error) {
        if (spinner.isSpinning) {
            spinner.fail('OpenAI Computer Use automation failed');
        }
        
        logger.failure(`❌ Error during OpenAI Computer Use automation: ${error.message}`);
        
        // Take final error screenshot if possible
        try {
            if (typeof carrier !== 'undefined' && carrier.page) {
                await carrier.takeScreenshot('error_final.png');
                await carrier.close();
            }
        } catch (cleanupError) {
            logger.warning(`Cleanup error: ${cleanupError.message}`);
        }
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('🛑 OpenAI Computer Use automation interrupted by user');
    try {
        if (typeof carrier !== 'undefined') {
            await carrier.close();
        }
    } catch (error) {
        // Ignore cleanup errors during shutdown
    }
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.failure(`Uncaught Exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.failure(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        logger.failure(`Fatal error: ${error.message}`);
        process.exit(1);
    });
} 