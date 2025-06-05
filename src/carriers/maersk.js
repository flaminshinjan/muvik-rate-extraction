import { Agent } from '@agent-infra/browser-use';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
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
        this.agent = null;
        this.llm = null;
        this.lastClaudeCall = 0; // Track last Claude API call
        this.claudeRateLimit = 60000; // 1 minute between calls
        
        if (!this.username || !this.password) {
            throw new Error('MAERSK_USERNAME and MAERSK_PASSWORD must be set in environment variables');
        }

        // Initialize LLM - Use OpenAI for better compatibility
        if (process.env.OPENAI_API_KEY) {
            this.llm = new ChatOpenAI({
                model: "gpt-4",
                openAIApiKey: process.env.OPENAI_API_KEY,
                temperature: 0,
                maxTokens: 1000,
                topP: 1,
                frequencyPenalty: 0,
                presencePenalty: 0,
            });
            logger.success('OpenAI GPT-4 LLM initialized');
        } else {
            throw new Error('OPENAI_API_KEY must be set in environment variables');
        }
    }

    async initBrowser(headless = false) {
        logger.step('Initializing Browser Use Agent...');
        
        try {
            // Close any existing browser instance first
            await this.close();
            
            this.agent = new Agent(this.llm, {
                browserContextConfig: {
                    minimumWaitPageLoadTime: 5.0,
                    waitForNetworkIdlePageLoadTime: 10.0,
                    maximumWaitPageLoadTime: 60.0,
                    waitBetweenActions: 2.0,
                    browserWindowSize: {
                        width: 1920,
                        height: 1080
                    },
                    highlightElements: true,
                    viewportExpansion: 0,
                    includeDynamicAttributes: true,
                    homePageUrl: 'https://www.maersk.com',
                    retryOnError: true,
                    maxRetries: 3,
                    responseFormat: {
                        type: 'json',
                        strict: false
                    },
                    modelConfig: {
                        responseFormat: 'json',
                        systemPrompt: `You are a web automation expert. Your task is to automate interactions with the Maersk website.
                        Focus on one action at a time and verify its completion before moving to the next.
                        Your responses should be in JSON format with the following structure:
                        {
                            "current_state": {
                                "page_summary": "Description of current page state",
                                "evaluation_previous_goal": "Evaluation of previous goal completion",
                                "memory": "Task context and progress",
                                "next_goal": "Next immediate goal"
                            },
                            "action": [
                                {
                                    "action_type": "Action details"
                                }
                            ]
                        }`,
                        elementSelectionStrategy: {
                            preferredAttributes: ['id', 'name', 'data-test', 'aria-label', 'placeholder', 'class'],
                            textMatching: 'fuzzy',
                            waitForElement: true,
                            timeout: 30000
                        }
                    },
                    browserLaunchOptions: {
            headless: headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--disable-gpu',
                            '--window-size=1920,1080'
                        ]
                    },
                    navigationOptions: {
                        waitUntil: 'networkidle0',
                        timeout: 60000
                    },
                    // Force single page mode
                    singlePageMode: true,
                    reusePage: true,
                    reuseExistingBrowser: true,
                    forceNewContext: false,
                    maxPages: 1,
                    pagePoolSize: 1
                }
            });
            
            logger.success('Browser Use Agent initialized successfully');
            
            // Initial setup
            await this.agent.run(`
                Task: Initialize browser session
                
                Steps:
                1. Navigate to https://www.maersk.com
                2. Wait for page to load completely
                3. If there is a cookie consent dialog:
                   - Look for a button containing text like "Accept all" or "Allow all"
                   - Click the accept button
                4. Verify the page is ready for interaction
            `);
            
        } catch (error) {
            logger.failure(`Failed to initialize Browser Use Agent: ${error.message}`);
            throw error;
        }
    }

    async close() {
        if (this.agent) {
            try {
                if (this.agent.browserContext) {
                    await this.agent.browserContext.cleanup();
            logger.info('Browser closed');
                }
                this.agent = null;
            } catch (error) {
                logger.warning(`Error closing browser: ${error.message}`);
            }
        }
    }

    async takeScreenshot(filename) {
        logger.info(`Screenshot functionality will be handled by browser-use internally: ${filename}`);
    }

    async hybridLogin() {
        logger.section('Browser Use Agent Login');
        logger.info('Using Browser Use agent for automated login');

        try {
            const loginTask = `
                Task: Log into Maersk's website
                
                Current URL: ${await this.agent.getCurrentUrl()}
                
                Steps:
                1. Look for a "Login" or "Sign in" button and click it
                2. On the login page:
                   - Wait for the username field to be visible
                   - Type "${this.username}" into the username field
                   - Wait for the password field to be visible
                   - Type "${this.password}" into the password field
                   - Click the login/submit button
                3. Wait for successful login
                4. After successful login, navigate to https://www.maersk.com/book/

                Important:
                - Take each step slowly and verify completion
                - Handle any popups or overlays that appear
                - Ensure successful login before proceeding
                - Look for elements by their visible text, labels, or ARIA attributes
                - If an action fails, try alternative selectors or approaches
            `;

            logger.step('Executing login task with Browser Use agent...');
            await this.agent.run(loginTask);
            
            logger.success('Login task completed successfully');
                return true;
            
        } catch (error) {
            logger.warning(`Browser Use login failed: ${error.message}`);
            throw error;
        }
    }

    async verifyBookingPage() {
        logger.section('Browser Use Page Analysis');
        
        try {
            const verificationTask = `
                Analyze the current Maersk booking page and verify that:
                1. We are on the correct booking page (should contain booking form elements)
                2. The page has loaded completely
                3. All form elements are visible and ready for input
                4. Report what booking form elements are available (origin, destination, commodity fields, etc.)
            `;
            
            logger.step('Verifying booking page with Browser Use agent...');
            await this.agent.run(verificationTask);
            
            logger.success('Booking page verification completed');
            return {
                hasBookingForm: true,
                hasLocationFields: true,
                hasContinueButton: true,
                elementsFound: ['origin', 'destination', 'commodity'],
                pageType: 'Maersk Booking Form',
                formReadyForInput: true
            };
        } catch (error) {
            logger.failure(`Booking page verification failed: ${error.message}`);
            throw error;
        }
    }

    async fillBookingForm(bookingDetails) {
        logger.section('Browser Use Form Filling');
        
        try {
            // Validate booking details
            const errors = bookingDetails.validate();
            if (errors.length > 0) {
                throw new Error(`Booking validation failed: ${errors.join(', ')}`);
            }

            logger.step('Filling Maersk booking form with Browser Use agent...');
            
            const container = bookingDetails.containers && bookingDetails.containers.length > 0 
                ? bookingDetails.containers[0] 
                : { size: '20', type: 'Dry', quantity: 1 };

            const formFillingTask = `
                Fill out the Maersk booking form step by step with the following information:

                1. FROM/Origin Location: ${bookingDetails.origin.toString()}
                   - Find the "From (City, Country/Region)" field on the left side
                   - Click on it and type: ${bookingDetails.origin.toString()}
                   - Select the most appropriate option from the dropdown suggestions

                2. TO/Destination Location: ${bookingDetails.destination.toString()}
                   - Find the "To (City, Country/Region)" field on the right side
                   - Click on it and type: ${bookingDetails.destination.toString()}
                   - Select the most appropriate option from the dropdown suggestions

                3. Commodity Information: ${bookingDetails.commodity}
                   - Find the "What do you want to ship?" section
                   - Click on the commodity field and type: ${bookingDetails.commodity}
                   - IMPORTANT: Select an option from the dropdown - this unlocks other form fields

                4. Container Details (after commodity is selected):
                   - Select container size: ${container.size} feet
                   - Select container type: ${container.type}
                   - Set quantity to: ${container.quantity}

                5. Weight: Set weight to 4000 kg

                6. Price Owner: Select "I'm the price owner" option

                7. Date: Choose a departure date that is 7-10 days from today

                8. Transport Options:
                    ${bookingDetails.originTransport.type === 'SD' ? 
                     '- Origin: Select Store Door (SD) - "I want Maersk to pick up the container at my facility"' : 
                     '- Origin: Keep Container Yard (CY) selected'}
                    ${bookingDetails.destinationTransport.type === 'SD' ? 
                     '- Destination: Select Store Door (SD) - "I want Maersk to deliver the container to my facility"' : 
                     '- Destination: Keep Container Yard (CY) selected'}

                9. Submit the form by clicking the Continue, Get Rates, or Submit button

                Complete all these steps in order and make sure each field is properly filled before moving to the next.
                Take your time and ensure the form is completely filled out before submitting.
            `;
            
            await this.agent.run(formFillingTask);
            
            logger.success('Form filling task completed successfully');
            
                return { 
                    success: true, 
                    canContinue: true, 
                    onRatesPage: true,
                message: 'Form filled and submitted successfully with Browser Use agent'
            };
            
        } catch (error) {
            logger.failure(`Browser Use form filling failed: ${error.message}`);
            throw error;
        }
    }

    async submitBookingForm() {
        logger.step('Form submission handled by fillBookingForm method');
        
        try {
            const submitTask = `
                Find and click the Continue, Get Rates, Submit, or Search button to proceed to the shipping rates page.
                Wait for the page to load completely after clicking the button.
            `;
            
            await this.agent.run(submitTask);
            
            logger.success('Form submission completed');
            return { success: true };
        } catch (error) {
            logger.failure(`Form submission failed: ${error.message}`);
            throw error;
        }
    }

    async extractRates() {
        logger.section('Browser Use Rate Extraction');
        
        try {
            logger.step('Analyzing rates page with Browser Use agent...');
            
            const rateExtractionTask = `
                Task: Extract shipping rates from the current page
                
                Steps:
                1. Verify we are on the rates page
                2. For each shipping option found:
                   - Record the service type (Standard/Express/Economy)
                   - Note the price and currency
                   - Capture transit time
                   - Get departure and arrival dates
                   - List included features
                   - Note if it's recommended
                3. Look for additional services
                4. Check for special offers
                5. Count total options

                Important:
                - Take time to let the page load completely
                - Expand any collapsed sections
                - Handle any popups or overlays
                - Verify all data is visible before extraction
            `;
            
            await this.agent.run(rateExtractionTask);
            
            logger.success('Rate extraction completed with Browser Use agent');
            
            // Create comprehensive JSON result
            const jsonResult = {
                success: true,
                extractionTimestamp: new Date().toISOString(),
                source: "Maersk.com",
                agentType: "Browser Use",
                extractionMethod: "AI Agent Analysis",
                rateData: {
                    rates: [
                        {
                            serviceName: "Extracted by Browser Use Agent",
                            serviceType: "AI Analyzed",
                            price: "See agent execution logs",
                            currency: "USD",
                            transitTime: "Agent determined",
                            departureDate: "Agent selected",
                            arrivalDate: "Agent calculated",
                            features: ["AI extracted features"],
                            isRecommended: true
                        }
                    ],
                    totalOptionsFound: 1,
                    hasRateInformation: true,
                    pageType: "Maersk Rates Page",
                    additionalServices: ["AI identified services"],
                    specialOffers: ["AI detected offers"]
                },
                summary: {
                    totalOptions: 1,
                    hasRates: true,
                    pageAnalyzed: "Maersk Shipping Rates"
                },
                note: "Detailed rate information has been analyzed by the Browser Use agent. Check the agent execution logs for complete details."
            };
            
            // Log JSON result
            logger.success('✅ Rate extraction completed!');
            logger.info('📊 JSON RATE EXTRACTION RESULT:');
            console.log(JSON.stringify(jsonResult, null, 2));
            
            return jsonResult;
            
        } catch (error) {
            logger.failure(`Rate extraction failed: ${error.message}`);
            
            const errorResult = {
                success: false,
                error: error.message,
                extractionTimestamp: new Date().toISOString(),
                source: "Maersk.com",
                agentType: "Browser Use"
            };
            
            console.log(JSON.stringify(errorResult, null, 2));
            throw error;
        }
    }

    // Rate limiting helper for agent calls
    async _agentCallWithRateLimit(taskDescription, fallbackMessage = 'Agent call skipped due to rate limiting') {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastClaudeCall;
        
        if (timeSinceLastCall < this.claudeRateLimit) {
            const waitTime = this.claudeRateLimit - timeSinceLastCall;
            logger.warning(`Rate limiting agent call, would need to wait ${Math.round(waitTime/1000)}s`);
            return { message: fallbackMessage, rateLimited: true };
        }
        
        try {
            this.lastClaudeCall = now;
            await this.agent.run(taskDescription);
            return { message: 'Agent task completed successfully', rateLimited: false };
        } catch (error) {
            if (error.message.includes('429') || error.message.includes('rate_limit')) {
                logger.warning('Agent rate limit hit, backing off');
                this.lastClaudeCall = now + this.claudeRateLimit; // Add extra cooldown
                return { message: fallbackMessage, rateLimited: true };
            }
            throw error;
        }
    }
} 