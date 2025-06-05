import { Agent } from '@agent-infra/browser-use';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

async function testBrowserUse() {
    logger.section('Browser Use Integration Test');
    
    try {
        // Initialize LLM - prefer OpenAI for better compatibility
        let llm;
        if (process.env.OPENAI_API_KEY) {
            llm = new ChatOpenAI({
                model: process.env.MODEL_NAME || "gpt-4o-mini",
                openAIApiKey: process.env.OPENAI_API_KEY,
                temperature: 0,
            });
            logger.success('Using OpenAI LLM');
        } else if (process.env.ANTHROPIC_API_KEY) {
            llm = new ChatAnthropic({
                model: "claude-3-7-sonnet-20250219",
                anthropicApiKey: process.env.ANTHROPIC_API_KEY,
                temperature: 0,
            });
            logger.success('Using Claude LLM');
        } else {
            throw new Error('Either OPENAI_API_KEY or ANTHROPIC_API_KEY must be set');
        }

        // Initialize Browser Use Agent with simpler config
        logger.step('Initializing Browser Use Agent...');
        const agent = new Agent(llm, {
            browserContextConfig: {
                minimumWaitPageLoadTime: 2.0,
                waitForNetworkIdlePageLoadTime: 3.0,
                maximumWaitPageLoadTime: 15.0,
                waitBetweenActions: 2.0,
                browserWindowSize: {
                    width: 1280,
                    height: 800
                },
                highlightElements: false,
                viewportExpansion: 200,
                includeDynamicAttributes: false,
                homePageUrl: 'https://www.google.com'
            }
        });
        
        logger.success('Browser Use Agent initialized successfully');

        // Test with a much simpler task
        logger.step('Testing simple navigation...');
        const testTask = `Navigate to https://www.google.com and tell me the page title`;

        await agent.run(testTask);
        
        logger.success('✅ Browser Use test completed successfully!');
        logger.info('🎉 Migration from Stagehand to Browser Use was successful');
        
        // Cleanup
        if (agent && agent.browserContext) {
            await agent.browserContext.cleanup();
            logger.info('Browser closed');
        }
        
    } catch (error) {
        logger.failure(`Browser Use test failed: ${error.message}`);
        console.error('Full error:', error);
        
        // Try to cleanup anyway
        try {
            if (agent && agent.browserContext) {
                await agent.browserContext.cleanup();
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }
        
        process.exit(1);
    }
}

// Run the test
testBrowserUse().catch(console.error); 