import { MaerskCarrier } from './carriers/maersk.js';
import { createSampleBooking } from './models/booking.js';
import logger from './utils/logger.js';
import { writeFile } from 'fs/promises';

export async function extractMaerskRates() {
    let carrier;
    
    try {
        logger.section('Maersk Rate Extraction with Claude');
        
        // Verify environment variables
        if (!process.env.MAERSK_USERNAME || !process.env.MAERSK_PASSWORD) {
            throw new Error('Missing MAERSK_USERNAME or MAERSK_PASSWORD in environment variables');
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('Missing ANTHROPIC_API_KEY in environment variables');
        }

        logger.info(`Using credentials for user: ${process.env.MAERSK_USERNAME}`);
        logger.info('🤖 Using Claude Computer Use for automation');

        // Create sample booking details
        const booking = createSampleBooking();
        logger.info(`Booking details: ${booking.origin} → ${booking.destination}`);
        logger.info(`Commodity: ${booking.commodity}`);
        logger.info(`Container: ${booking.containers[0].quantity}x ${booking.containers[0].size}ft ${booking.containers[0].type}`);

        // Initialize Maersk carrier
        logger.step('Initializing Maersk carrier with Claude...');
        carrier = new MaerskCarrier();

        // Start browser automation
        logger.step('Starting Stagehand browser with Claude...');
        await carrier.initBrowser(false); // Set to true for headless mode
        logger.success('Stagehand browser with Claude started successfully');

        // Claude Sequential Login
        logger.section('Claude Sequential Login System');
        logger.info('Using Sequential Tool Calling for intelligent login automation');

        const maxLoginAttempts = 2;
        let loginSuccess = false;

        for (let attempt = 1; attempt <= maxLoginAttempts && !loginSuccess; attempt++) {
            try {
                logger.step(`Claude login attempt ${attempt}/${maxLoginAttempts}`);
                
                loginSuccess = await carrier.hybridLogin();
                
                if (loginSuccess) {
                    logger.success('Claude sequential login completed successfully!');
                } else {
                    logger.warning('Claude sequential login returned false');
                }

            } catch (loginError) {
                logger.warning(`Claude login attempt ${attempt} failed: ${loginError.message}`);

                if (attempt < maxLoginAttempts) {
                    logger.step(`Retrying Claude login (attempt ${attempt + 1}/${maxLoginAttempts})...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } else {
                    logger.failure('Maximum Claude login attempts reached.');
                    throw loginError;
                }
            }
        }

        if (!loginSuccess) {
            throw new Error('All Claude login attempts failed');
        }

        // Navigate to booking page if needed and start form filling immediately
        logger.section('Form Filling Process');
        const currentUrl = carrier.page.url();
        logger.info(`Current URL: ${currentUrl}`);

        if (!currentUrl.includes('/book')) {
            logger.step('Navigating to booking page...');
            await carrier.page.goto(`${carrier.baseUrl}/book/`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Skip unnecessary verification - if we're on book page, we're logged in
        logger.success('On booking page - proceeding directly to form filling');

        // Claude Page Analysis
        logger.section('Claude Page Analysis');
        const pageAnalysis = await carrier.verifyBookingPage();

        logger.info(`📊 Page Analysis Results:`);
        logger.info(`  - Has booking form: ${pageAnalysis.hasBookingForm ? '✅' : '❌'}`);
        logger.info(`  - Has location fields: ${pageAnalysis.hasLocationFields ? '✅' : '❌'}`);
        logger.info(`  - Has continue button: ${pageAnalysis.hasContinueButton ? '✅' : '❌'}`);
        logger.info(`  - Elements found: ${pageAnalysis.elementsFound.length}`);

        if (pageAnalysis.hasBookingForm && pageAnalysis.hasLocationFields) {
            // Claude Booking Form Filling
            logger.section('Claude Booking Form Filling');

            const formResult = await carrier.fillBookingForm(booking);
            logger.success('✅ Booking form filled successfully with Claude!');
            
            if (formResult.canContinue) {
                logger.success(`✅ Continue button available: ${formResult.buttonText}`);
                
                // Submit form automatically
                logger.step('Submitting form with Claude...');
                const submitResult = await carrier.submitBookingForm();
                
                if (submitResult.success) {
                    logger.success('Booking form submitted successfully');
                    
                    // Claude Rate Extraction
                    logger.section('Claude Rate Extraction');
                    
                    const rateResults = await carrier.extractRates();
                    logger.success('✅ Rate extraction completed!');
                    logger.info(`🤖 Claude Analysis: ${rateResults.claudeAnalysis}`);
                    
                    // Save results to JSON file
                    await writeFile('maersk-rates.json', JSON.stringify(rateResults, null, 2));
                    logger.success('📄 Results saved to maersk-rates.json');
                    
                    // Return results in expected format
                    return {
                        success: true,
                        summary: {
                            totalOptions: rateResults.rateData.totalOptionsFound,
                            pageAnalyzed: rateResults.rateData.pageType
                        },
                        rateData: rateResults.rateData,
                        claudeAnalysis: rateResults.claudeAnalysis,
                        extractionTimestamp: rateResults.extractionTimestamp
                    };
                    
                } else {
                    throw new Error('Form submission failed');
                }
                
            } else {
                throw new Error('No continue button found - form may need manual review');
            }

        } else {
            throw new Error('Expected booking form elements not found');
        }

    } catch (error) {
        logger.failure(`❌ Error during Claude automation: ${error.message}`);
        
        // Take error screenshot if possible
        if (carrier && carrier.page) {
            try {
                await carrier.takeScreenshot('error_claude_extraction.png');
            } catch (screenshotError) {
                logger.warning(`Screenshot error: ${screenshotError.message}`);
            }
        }
        
        // Return error result
        const errorResult = {
            success: false,
            error: error.message,
            extractionTimestamp: new Date().toISOString(),
            summary: {
                totalOptions: 0,
                pageAnalyzed: 'Error occurred'
            }
        };
        
        await writeFile('maersk-rates.json', JSON.stringify(errorResult, null, 2));
        throw error;
        
    } finally {
        // Cleanup
        if (carrier) {
            try {
                await carrier.close();
                logger.success('✅ Browser closed successfully');
            } catch (cleanupError) {
                logger.warning(`Cleanup error: ${cleanupError.message}`);
            }
        }
    }
}
