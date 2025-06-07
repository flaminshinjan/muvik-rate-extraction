import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MaerskCarrier {
    constructor() {
        this.baseUrl = process.env.MAERSK_BASE_URL || 'https://www.maersk.com';
        this.username = process.env.MAERSK_USERNAME;
        this.password = process.env.MAERSK_PASSWORD;
        this.stagehand = null;
        this.page = null;
        this.agent = null;
        this.lastClaudeCall = 0; // Track last Claude API call
        this.claudeRateLimit = 60000; // 1 minute between calls
        
        if (!this.username || !this.password) {
            throw new Error('MAERSK_USERNAME and MAERSK_PASSWORD must be set in environment variables');
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY must be set in environment variables for Claude');
        }
    }

    async initBrowser(headless = false) {
        logger.step('Initializing Stagehand with Claude Computer Use...');
        
        this.stagehand = new Stagehand({
            env: "LOCAL", // Force local browser instead of Browserbase
            modelName: process.env.MODEL_NAME || "gpt-4o-mini", // For browser actions
            headless: headless,
            // Browser-first optimization arguments
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--disable-web-security',
                '--disable-features=BlockThirdPartyCookies',
                '--disable-site-isolation-trials',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection'
            ]
        });

        await this.stagehand.init();
        this.page = this.stagehand.page;
        
        // Create Claude Computer Use agent
        try {
            this.agent = this.stagehand.agent({
                provider: "anthropic",
                model: process.env.COMPUTER_USE_MODEL || "claude-3-7-sonnet-20250219"
            });
            logger.success('Claude Computer Use agent initialized');
        } catch (error) {
            logger.warning('Claude Computer Use model not available, using standard agent');
            this.agent = this.stagehand.agent();
            logger.success('Standard agent initialized as fallback');
        }
        
        logger.success('Stagehand with Claude Computer Use initialized successfully');
    }

    async close() {
        if (this.stagehand) {
            await this.stagehand.close();
            logger.info('Browser closed');
        }
    }

    async takeScreenshot(filename) {
        if (this.page) {
            const screenshotPath = join(process.cwd(), filename);
            await this.page.screenshot({ path: screenshotPath });
            logger.info(`Screenshot saved: ${filename}`);
        }
    }

    async hybridLogin() {
        logger.section('Claude Computer Use Sequential Login');
        logger.info('Using browser-first approach with Claude Sequential Tool Calling');

        try {
            // Navigate to main page first (browser-first approach)
            logger.step('Navigating to Maersk main page...');
            await this.page.goto(this.baseUrl);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Use browser-first login with Playwright actions where possible
            logger.step('Attempting browser-first login sequence...');
            
            try {
                // Try direct Playwright actions first (browser-first)
                await this.page.click('text="Log in"').catch(() => 
                    this.page.click('text="Sign in"').catch(() => 
                        this.page.click('[data-testid*="login"]').catch(() => 
                            this.page.click('a[href*="login"]'))));
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                logger.success('Login page accessed via browser-first approach');
                
            } catch (browserError) {
                logger.info('Browser-first login navigation failed, using Claude...');
                // Fallback to Claude for complex navigation
                await this.agent.execute('Find and click the login or sign in button to access the login page');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Handle cookies with browser-first approach
            try {
                await this.page.click('button[data-testid*="accept"], button:has-text("Accept"), button:has-text("Allow")');
                logger.success('Cookies handled with browser-first approach');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (cookieError) {
                logger.info('No cookie dialog found or already handled');
            }

            // Fill credentials with browser-first approach
            try {
                await this.page.fill('input[name="username"], input[type="email"], input[id*="username"]', this.username);
                await this.page.fill('input[name="password"], input[type="password"]', this.password);
                logger.success('Credentials filled with browser-first approach');
            } catch (fillError) {
                logger.info('Browser-first credential filling failed, using Claude...');
                // Use Claude for complex form filling
                await this.agent.execute(`Fill the login form with username "${this.username}" and password "${this.password}"`);
            }

            // Submit form with browser-first approach
            try {
                await this.page.click('button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
                logger.success('Login submitted with browser-first approach');
            } catch (submitError) {
                logger.info('Browser-first submit failed, using Claude...');
                await this.agent.execute('Click the login or sign in button to submit the form');
            }
            
            // Wait for authentication
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Navigate to booking page after login
            logger.step('Navigating to booking page...');
            await this.page.goto('https://www.maersk.com/book/');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const currentUrl = this.page.url();
            logger.info(`Current URL after login: ${currentUrl}`);
            
            if (currentUrl.includes('maersk.com') && !currentUrl.includes('accounts.maersk.com') && !currentUrl.includes('login')) {
                logger.success('Login verification successful - on Maersk portal');
                return true;
            } else {
                throw new Error('Login verification failed - still appears to be on login page');
            }
            
        } catch (error) {
            logger.warning(`Claude login failed: ${error.message}`);
            throw error;
        }
    }

    async verifyBookingPage() {
        logger.section('Claude Page Analysis');
        
        try {
            // Use Claude for intelligent page analysis
            const pageElements = await this.page.extract({
                instruction: "Analyze this Maersk booking page and identify all form elements",
                schema: z.object({
                    hasBookingForm: z.boolean(),
                    hasLocationFields: z.boolean(), 
                    hasContinueButton: z.boolean(),
                    elementsFound: z.array(z.string()),
                    pageType: z.string(),
                    formReadyForInput: z.boolean()
                })
            });
            
            logger.success('Claude page analysis completed');
            logger.info(`Page type: ${pageElements.pageType}`);
            logger.info(`Form ready: ${pageElements.formReadyForInput}`);
            logger.info(`Elements found: ${pageElements.elementsFound.length}`);
            
            return pageElements;
        } catch (error) {
            logger.failure(`Booking page verification failed: ${error.message}`);
            throw error;
        }
    }

    async fillBookingForm(bookingDetails) {
        logger.section('Claude Computer Use Form Filling - Targeted Approach');
        
        try {
            // Validate booking details
            const errors = bookingDetails.validate();
            if (errors.length > 0) {
                throw new Error(`Booking validation failed: ${errors.join(', ')}`);
            }

            logger.step('Filling Maersk booking form step by step...');
            
            // Step 1: Fill FROM location field (left side)
            logger.step('Step 1: Filling FROM location...');
            const originFillResult = await this.agent.execute(`
                I need to fill the "From (City, Country/Region)" field on this Maersk booking form.
                
                Target field: The left input field under "From (City, Country/Region)" 
                Text to enter: ${bookingDetails.origin.toString()}
                
                Instructions:
                1. Click on the left input field that has placeholder "Enter city or port"
                2. Type: ${bookingDetails.origin.toString()}
                3. Wait for any dropdown suggestions to appear
                4. If suggestions appear, select the most appropriate match
                5. Verify the field is filled correctly
                
                This is the origin/departure location field on the left side of the Location details section.
            `);
            logger.success(`FROM location filled: ${originFillResult.message}`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for autocomplete
            
            // Step 2: Fill TO location field (right side)  
            logger.step('Step 2: Filling TO location...');
            const destFillResult = await this.agent.execute(`
                I need to fill the "To (City, Country/Region)" field on this Maersk booking form.
                
                Target field: The right input field under "To (City, Country/Region)"
                Text to enter: ${bookingDetails.destination.toString()}
                
                Instructions:
                1. Click on the right input field that has placeholder "Enter city or port"
                2. Type: ${bookingDetails.destination.toString()}
                3. Wait for any dropdown suggestions to appear  
                4. If suggestions appear, select the most appropriate match
                5. Verify the field is filled correctly
                
                This is the destination/arrival location field on the right side of the Location details section.
            `);
            logger.success(`TO location filled: ${destFillResult.message}`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for autocomplete
            
            // Step 3: Take screenshot to verify location filling
            await this.takeScreenshot('debug_locations_filled.png');
            
            // Step 4: Fill "What do you want to ship?" commodity field FIRST
            logger.step('Step 3: Filling "What do you want to ship?" commodity field...');
            const commodityResult = await this.agent.execute(`
                I need to fill the "What do you want to ship?" section on this Maersk booking form.
                
                Look for:
                - A section with heading "What do you want to ship?"
                - A field labeled "Commodity" 
                - An input field with placeholder "Type in minimum 2 characters"
                
                Target field: The commodity input field under "What do you want to ship?"
                Text to enter: ${bookingDetails.commodity}
                
                Instructions:
                1. Find the commodity input field under "What do you want to ship?"
                2. Click on the input field 
                3. Type: ${bookingDetails.commodity}
                4. IMPORTANT: Wait for the dropdown to appear with suggestions
                5. Select the most appropriate option from the dropdown (usually the first relevant match)
                6. Verify the commodity is properly selected and the dropdown closes
                
                This step is CRITICAL as it will unlock the container type and other form options.
                Make sure to actually SELECT from the dropdown, not just type!
            `);
            logger.success(`Commodity selected from dropdown: ${commodityResult.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for form to update after selection
            
            // Step 5: Take screenshot after commodity to see unlocked fields
            await this.takeScreenshot('debug_after_commodity.png');
            
            // Step 6: Scroll down to see additional form sections that should now be available
            logger.step('Step 4: Scrolling to see unlocked form fields...');
            await this.agent.execute(`
                Now that the commodity has been selected, scroll down to see the container options that should now be available.
                Look for container type and size selection options.
            `);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 7: Configure container details (should now be available)
            if (bookingDetails.containers && bookingDetails.containers.length > 0) {
                const container = bookingDetails.containers[0];
                
                logger.step('Step 5: Setting container details (now unlocked)...');
                const containerResult = await this.agent.execute(`
                    Now configure the container specifications that should be visible:
                    
                    Container size: ${container.size} feet (${container.size}ft)
                    Container type: ${container.type}
                    Quantity: ${container.quantity}
                    
                    Instructions:
                    1. Find and select container size: "${container.size}ft" or "${container.size} feet"
                    2. Find and select container type: "${container.type}"
                    3. Set quantity to ${container.quantity} if available
                    4. Complete any additional container fields that appear
                    
                    Work efficiently - these options should now be visible and selectable.
                `);
                logger.success(`Container details set: ${containerResult.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Step 8: Set transport options if Store Door is needed
            if (bookingDetails.originTransport.type === 'SD' || bookingDetails.destinationTransport.type === 'SD') {
                logger.step('Step 6: Configuring Store Door transport options...');
                const transportResult = await this.agent.execute(`
                    Configure inland transportation options on this Maersk form:
                    
                    ${bookingDetails.originTransport.type === 'SD' ? 
                        'Origin: Change from CY to SD - Select "I want Maersk to pick up the container at my facility"' : 
                        'Origin: Keep CY selected - "I will arrange to deliver the container to the port/inland location"'}
                    
                    ${bookingDetails.destinationTransport.type === 'SD' ? 
                        'Destination: Change from CY to SD - Select "I want Maersk to deliver the container to my facility"' : 
                        'Destination: Keep CY selected - "I will arrange for pick up of the container from the port/inland location"'}
                    
                    Look for the "Inland transportation" section with radio buttons for CY and SD options.
                    Click the appropriate radio buttons to change the selections as specified above.
                `);
                logger.success(`Transport options configured: ${transportResult.message}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Step 9: Fill any additional required fields (dates, weights, etc.)
            logger.step('Step 7: Filling additional required fields...');
            const additionalFieldsResult = await this.agent.execute(`
                Complete the remaining required fields on this form in this specific order:
                
                1. WEIGHT: Find the weight field and set it to "4000" (not 15000)
                2. PRICE OWNER: Look for and select "I'm the price owner" option
                3. DATE: Find the departure/ready date field and select a dummy date (use a date 7-10 days from today)
                4. Any other mandatory fields marked with asterisks (*)
                
                Instructions:
                - Set weight to exactly "4000"
                - Make sure to select "I'm the price owner" checkbox or radio button
                - Choose any reasonable future date for shipping
                - Complete these fields so the continue button becomes active
            `);
            logger.success(`Additional fields set - Weight: 4000, Price owner selected, Date set: ${additionalFieldsResult.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 10: Look for continue button
            logger.step('Step 8: Finding and clicking continue button...');
            const continueButtonResult = await this.agent.execute(`
                Now that all required fields are filled (weight: 4000, price owner selected, date set), 
                find and CLICK the continue button to proceed to the rates page.
                
                Look for buttons with text like:
                - "Continue"
                - "Get Rates" 
                - "Search"
                - "Submit"
                - "Next"
                
                IMPORTANT: Actually CLICK the button to submit the form and proceed to rates.
                The button should now be enabled since we've completed all required fields.
            `);
            logger.success(`Continue button clicked: ${continueButtonResult.message}`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for navigation to rates page
            
            await this.takeScreenshot('debug_form_completed.png');
            
            // Step 11: Quick validation
            logger.step('Step 9: Quick form validation...');
            const formValidation = await this.page.extract({
                instruction: "Check if this form submission was successful and we're now on a rates or results page",
                schema: z.object({
                    isOnRatesPage: z.boolean().describe("Are we now on a shipping rates or results page"),
                    pageTitle: z.string().describe("What type of page are we on now"),
                    hasRates: z.boolean().describe("Can you see any shipping rates or pricing information"),
                    nextAction: z.string().describe("What should be done next")
                })
            });
            
            logger.success('Quick validation completed');
            logger.info(`✅ On rates page: ${formValidation.isOnRatesPage}`);
            logger.info(`✅ Page type: ${formValidation.pageTitle}`);
            logger.info(`✅ Has rates: ${formValidation.hasRates}`);
            logger.info(`🎯 Next: ${formValidation.nextAction}`);
            
            if (formValidation.isOnRatesPage || formValidation.hasRates) {
                logger.success('🎉 Form submission successful - now on rates page!');
                return { 
                    success: true, 
                    canContinue: true, 
                    onRatesPage: true,
                    formValidation: formValidation
                };
            } else {
                logger.warning('⚠️ May still be on form page - need to check continue button');
                return { 
                    success: false, 
                    canContinue: false, 
                    needsContinueButton: true,
                    formValidation: formValidation
                };
            }
            
        } catch (error) {
            await this.takeScreenshot('error_form_filling_targeted.png');
            logger.failure(`Targeted form filling failed: ${error.message}`);
            throw error;
        }
    }

    async submitBookingForm() {
        logger.step('Submitting form with browser-first approach...');
        
        try {
            // Browser-first approach for form submission
            try {
                await this.page.act({
                    description: "Continue or Submit button to proceed to rates",
                    method: "click",
                    arguments: [],
                    selector: "button[type='submit'], button:has-text('Continue'), button:has-text('Get Rates'), button:has-text('Search'), input[type='submit']"
                });
                logger.success('Form submitted with browser-first approach');
            } catch (error) {
                // Fallback to Claude for complex form submission
                const submitResult = await this.agent.execute(`
                    Click the Continue or Submit button to proceed to the rates page.
                    Look for buttons with text like "Continue", "Get Rates", "Search", or "Submit".
                    Make sure to click the main action button that will take us to the shipping rates.
                `);
                logger.success('Form submitted using Claude fallback');
                logger.info(`Claude submission message: ${submitResult.message}`);
            }
            
            // Wait for rates page to load
            await new Promise(resolve => setTimeout(resolve, 8000));
            await this.takeScreenshot('debug_after_submit_browser_first.png');
            
            return { success: true };
        } catch (error) {
            logger.failure(`Form submission failed: ${error.message}`);
            throw error;
        }
    }

    async extractRates() {
        logger.section('Claude Rate Extraction');
        
        try {
            // Use Claude for comprehensive rate analysis and extraction
            logger.step('Analyzing rates page with Claude...');
            
            const rateAnalysis = await this.agent.execute(`
                Analyze this shipping rates page and provide a comprehensive summary of all available options.
                Look for service types, prices, transit times, departure dates, and any special offers.
                Identify the best value options and any premium services available.
                No need to click on Price breakdowns and details, just extract the data available.
            `);
            
            logger.success('Claude rate analysis completed');
            
            // Extract structured rate data
            const structuredRates = await this.page.extract({
                instruction: "Extract all shipping rates and service details in a structured format",
                schema: z.object({
                    rates: z.array(z.object({
                        serviceName: z.string(),
                        serviceType: z.string().optional(),
                        price: z.string().nullable(),
                        currency: z.string().nullable(),
                        transitTime: z.string().nullable(),
                        departureDate: z.string().nullable(),
                        arrivalDate: z.string().nullable(),
                        features: z.array(z.string()).optional(),
                        isRecommended: z.boolean().optional()
                    })),
                    totalOptionsFound: z.number(),
                    hasRateInformation: z.boolean(),
                    pageType: z.string(),
                    additionalServices: z.array(z.string()).optional(),
                    specialOffers: z.array(z.string()).optional()
                })
            });
            
            logger.success('Structured rate extraction completed');
            
            // Create comprehensive JSON result
            const jsonResult = {
                success: true,
                extractionTimestamp: new Date().toISOString(),
                source: "Maersk.com",
                claudeAnalysis: rateAnalysis.message,
                rateData: structuredRates,
                summary: {
                    totalOptions: structuredRates.totalOptionsFound,
                    hasRates: structuredRates.hasRateInformation,
                    pageAnalyzed: structuredRates.pageType
                }
            };
            
            // Log JSON result
            logger.success('✅ Rate extraction completed!');
            logger.info('📊 JSON RATE EXTRACTION RESULT:');
            console.log(JSON.stringify(jsonResult, null, 2));
            
            return jsonResult;
            
        } catch (error) {
            logger.failure(`Rate extraction failed: ${error.message}`);
            await this.takeScreenshot('error_rate_extraction_claude.png');
            
            const errorResult = {
                success: false,
                error: error.message,
                extractionTimestamp: new Date().toISOString(),
                source: "Maersk.com"
            };
            
            console.log(JSON.stringify(errorResult, null, 2));
            throw error;
        }
    }

    // Enhanced action method with caching support as per documentation
    async performAction(description, options = {}) {
        try {
            if (options.method && options.arguments && options.selector) {
                // Use cached action format as shown in documentation
                await this.page.act({
                    description: description,
                    method: options.method,
                    arguments: options.arguments,
                    selector: options.selector
                });
            } else {
                // Use natural language format
                await this.page.act(description);
            }
            logger.success(`Action completed: ${description}`);
        } catch (error) {
            logger.warning(`Action failed: ${description} - ${error.message}`);
            throw error;
        }
    }

    // Replay functionality for debugging and optimization
    async saveActionHistory(filename = 'maersk_automation_replay.js') {
        if (this.agent && this.agent.actions) {
            const replayCode = this._generateReplayCode(this.agent.actions);
            const fs = await import('fs/promises');
            await fs.writeFile(filename, replayCode);
            logger.info(`Action history saved to ${filename}`);
        }
    }

    _generateReplayCode(actions) {
        const actionLines = actions.map(action => {
            switch (action.type) {
                case 'act':
                    return `await page.act(${JSON.stringify(action.parameters)})`;
                case 'extract':
                    return `await page.extract("${action.parameters}")`;
                case 'goto':
                    return `await page.goto("${action.parameters}")`;
                default:
                    return `// ${action.type}: ${action.parameters}`;
            }
        }).join('\n');

        return `import { Stagehand } from '@browserbasehq/stagehand';

export async function replayMaerskAutomation() {
    const stagehand = new Stagehand({ modelName: "gpt-4o-mini" });
    await stagehand.init();
    const page = stagehand.page;
    
    try {
${actionLines}
    } finally {
        await stagehand.close();
    }
}`;
    }

    _isCredentialOrSecurityError(error) {
        const errorMessage = error.message.toLowerCase();
        return errorMessage.includes('error detected') || 
               errorMessage.includes('2fa') || 
               errorMessage.includes('authentication') ||
               errorMessage.includes('credential') ||
               errorMessage.includes('login') ||
               errorMessage.includes('captcha');
    }

    // Rate limiting helper for Claude calls
    async _claudeCallWithRateLimit(taskDescription, fallbackMessage = 'Claude call skipped due to rate limiting') {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastClaudeCall;
        
        if (timeSinceLastCall < this.claudeRateLimit) {
            const waitTime = this.claudeRateLimit - timeSinceLastCall;
            logger.warning(`Rate limiting Claude call, would need to wait ${Math.round(waitTime/1000)}s`);
            return { message: fallbackMessage, rateLimited: true };
        }
        
        try {
            this.lastClaudeCall = now;
            const result = await this.agent.execute(taskDescription);
            return { message: result.message, rateLimited: false };
        } catch (error) {
            if (error.message.includes('429') || error.message.includes('rate_limit')) {
                logger.warning('Claude rate limit hit, backing off');
                this.lastClaudeCall = now + this.claudeRateLimit; // Add extra cooldown
                return { message: fallbackMessage, rateLimited: true };
            }
            throw error;
        }
    }
} 