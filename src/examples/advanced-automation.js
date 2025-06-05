import 'dotenv/config';
import { MaerskCarrier } from '../carriers/maersk.js';
import { Location, Container, InlandTransport, BookingDetails } from '../models/booking.js';
import logger from '../utils/logger.js';
import { z } from 'zod';

/**
 * Advanced Stagehand AI Automation Example
 * 
 * This example demonstrates:
 * - Complex booking scenarios
 * - AI-powered error recovery
 * - Multiple container types
 * - Advanced form handling
 * - Rate comparison workflows
 */

async function advancedAutomationExample() {
    logger.section('Advanced Stagehand AI Automation Example');
    
    const carrier = new MaerskCarrier();
    
    try {
        // Initialize with enhanced configuration
        await carrier.initBrowser(false);
        
        // Complex booking scenario: Multiple containers, special requirements
        const complexBooking = new BookingDetails({
            origin: new Location({
                city: "Los Angeles",
                country: "USA",
                isPort: true
            }),
            destination: new Location({
                city: "Rotterdam",
                country: "Netherlands", 
                isPort: true
            }),
            originTransport: new InlandTransport({
                type: "SD", // Store Door
                isPickup: true
            }),
            destinationTransport: new InlandTransport({
                type: "CY", // Container Yard
                isPickup: false
            }),
            containers: [
                new Container({
                    type: "DRY",
                    size: "40",
                    quantity: 2,
                    weightKg: 25000
                }),
                new Container({
                    type: "REEFER",
                    size: "20",
                    quantity: 1,
                    weightKg: 18000
                })
            ],
            commodity: "Pharmaceutical Products",
            readyDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            requiresTemperatureControl: true,
            isDangerousCargo: false,
            isPriceOwner: true
        });

        // AI-Powered Hybrid Login
        logger.step('Performing AI-powered authentication...');
        await carrier.hybridLogin();
        
        // Advanced Page Analysis
        logger.step('AI analyzing page structure...');
        const pageAnalysis = await carrier.page.extract({
            instruction: "Analyze this booking page and provide detailed information about available features",
            schema: z.object({
                hasAdvancedOptions: z.boolean(),
                supportedContainerTypes: z.array(z.string()),
                hasTemperatureControls: z.boolean(),
                hasDangerousCargoOptions: z.boolean(),
                maxContainersAllowed: z.number(),
                availableServices: z.array(z.string())
            })
        });
        
        logger.info(`Page supports: ${pageAnalysis.supportedContainerTypes?.join(', ')}`);
        logger.info(`Temperature controls: ${pageAnalysis.hasTemperatureControls ? 'Available' : 'Not available'}`);
        logger.info(`Max containers: ${pageAnalysis.maxContainersAllowed || 'Unknown'}`);

        // AI-Powered Complex Form Filling
        logger.step('Filling complex booking form with AI...');
        
        // Handle multiple containers intelligently
        for (let i = 0; i < complexBooking.containers.length; i++) {
            const container = complexBooking.containers[i];
            
            if (i > 0) {
                // AI adds additional container fields
                await carrier.page.act('add another container to the booking');
            }
            
            await carrier.page.act(`set container ${i + 1} type to ${container.type}`);
            await carrier.page.act(`set container ${i + 1} size to ${container.size} feet`);
            await carrier.page.act(`set container ${i + 1} quantity to ${container.quantity}`);
            await carrier.page.act(`set container ${i + 1} weight to ${container.weightKg} kilograms`);
            
            logger.success(`Container ${i + 1} configured: ${container.quantity}x ${container.size}ft ${container.type}`);
        }
        
        // Fill remaining form fields
        await carrier.fillBookingForm(complexBooking);
        
        // Advanced AI-Powered Rate Analysis
        logger.step('AI analyzing available rates and options...');
        
        const rateAnalysis = await carrier.page.extract({
            instruction: "Extract all available shipping rates, transit times, and service options",
            schema: z.object({
                availableRates: z.array(z.object({
                    serviceName: z.string(),
                    price: z.string(),
                    currency: z.string(),
                    transitTime: z.string(),
                    departureDate: z.string(),
                    features: z.array(z.string())
                })),
                bestValue: z.string(),
                fastestOption: z.string(),
                totalOptions: z.number()
            })
        });
        
        if (rateAnalysis.availableRates?.length > 0) {
            logger.success(`Found ${rateAnalysis.totalOptions} shipping options`);
            logger.info(`Best value: ${rateAnalysis.bestValue}`);
            logger.info(`Fastest option: ${rateAnalysis.fastestOption}`);
            
            // Log all rate options
            rateAnalysis.availableRates.forEach((rate, index) => {
                logger.info(`Option ${index + 1}: ${rate.serviceName} - ${rate.price} ${rate.currency} (${rate.transitTime})`);
            });
        }

        // AI-Powered Error Detection and Recovery
        logger.step('Checking for any issues or warnings...');
        
        const issueCheck = await carrier.page.extract({
            instruction: "Check for any error messages, warnings, or issues on the page",
            schema: z.object({
                hasErrors: z.boolean(),
                hasWarnings: z.boolean(),
                errors: z.array(z.string()),
                warnings: z.array(z.string()),
                canProceed: z.boolean(),
                suggestedActions: z.array(z.string())
            })
        });
        
        if (issueCheck.hasErrors) {
            logger.warning('Issues detected:');
            issueCheck.errors?.forEach(error => logger.failure(`❌ ${error}`));
            
            // AI-powered error resolution
            for (const action of issueCheck.suggestedActions || []) {
                logger.step(`AI attempting to resolve: ${action}`);
                await carrier.page.act(action);
            }
        }

        // Advanced Workflow: Compare Multiple Routes
        logger.step('AI comparing different route options...');
        
        const routeComparison = await carrier.page.extract({
            instruction: "Compare different routing options and provide recommendations",
            schema: z.object({
                availableRoutes: z.array(z.object({
                    routeName: z.string(),
                    ports: z.array(z.string()),
                    totalDistance: z.string(),
                    estimatedTime: z.string(),
                    reliability: z.string()
                })),
                recommendedRoute: z.string(),
                alternativeOptions: z.array(z.string())
            })
        });
        
        if (routeComparison.recommendedRoute) {
            logger.success(`AI recommends: ${routeComparison.recommendedRoute}`);
            logger.info(`Alternatives: ${routeComparison.alternativeOptions?.join(', ')}`);
        }

        // Final AI Summary
        logger.section('AI Automation Summary');
        
        const finalSummary = await carrier.page.extract({
            instruction: "Provide a comprehensive summary of the booking process and next steps",
            schema: z.object({
                bookingStatus: z.string(),
                completedSteps: z.array(z.string()),
                nextSteps: z.array(z.string()),
                estimatedTotal: z.string(),
                bookingReference: z.string(),
                readyToSubmit: z.boolean()
            })
        });
        
        logger.info('📊 BOOKING SUMMARY');
        logger.info(`Status: ${finalSummary.bookingStatus}`);
        logger.info(`Completed: ${finalSummary.completedSteps?.join(', ')}`);
        logger.info(`Next steps: ${finalSummary.nextSteps?.join(', ')}`);
        logger.info(`Ready to submit: ${finalSummary.readyToSubmit ? 'Yes' : 'No'}`);
        
        if (finalSummary.estimatedTotal) {
            logger.success(`Estimated total: ${finalSummary.estimatedTotal}`);
        }

        // Keep browser open for manual review
        logger.info('🔍 Browser staying open for 2 minutes for manual review...');
        await new Promise(resolve => setTimeout(resolve, 120000));

    } catch (error) {
        logger.failure(`Advanced automation error: ${error.message}`);
        await carrier.takeScreenshot('error_advanced_automation.png');
        throw error;
    } finally {
        await carrier.close();
    }
}

// Export for use in other scripts
export { advancedAutomationExample };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    advancedAutomationExample().catch(error => {
        logger.failure(`Fatal error: ${error.message}`);
        process.exit(1);
    });
} 