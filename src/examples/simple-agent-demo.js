import 'dotenv/config';
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

/**
 * Computer Use Agent demonstration using Stagehand 2.0 documented methods
 * Shows the latest Computer Use Models and Sequential Tool Calling features
 */
async function computerUseDemo() {
    console.log('🤖 Stagehand 2.0 Computer Use Agent Demo');
    console.log('==========================================');

    // Initialize Stagehand
    const stagehand = new Stagehand({
        modelName: process.env.MODEL_NAME || "gpt-4o-mini",
        headless: false
    });

    await stagehand.init();
    const page = stagehand.page;

    try {
        console.log('🚀 Creating Claude Computer Use agent as per documentation...');
        
        // Create a Claude Computer Use agent with proper model fallback
        let agent;
        let isComputerUse = false;
        
        try {
            agent = stagehand.agent({
                provider: "anthropic",
                model: process.env.COMPUTER_USE_MODEL || "claude-3-7-sonnet-20250219"
            });
            isComputerUse = true;
            console.log('✅ Claude Computer Use agent created successfully');
        } catch (error) {
            console.log('⚠️ Claude Computer Use model not available, using standard agent');
            agent = stagehand.agent();
            isComputerUse = false;
        }

        console.log(`Agent type: ${isComputerUse ? 'Claude Computer Use' : 'Standard'}`);

        // Example 1: Claude Computer Use Agent Navigation & Extraction (from docs)
        console.log('\n1. Claude Computer Use Agent - Repository Analysis');
        await page.goto("https://github.com/browserbase/stagehand");

        const result = await agent.execute("Extract the top contributor's username");
        console.log('Computer Use Agent result:', result.message);

        // Example 2: Enhanced act() with caching support (from docs)
        console.log('\n2. Enhanced act() with caching support');
        
        // Use the cached action format as shown in documentation
        await page.act({
            description: "The search field where users can search the repository",
            method: "fill",
            arguments: ["stagehand"],
            selector: "input[name='q']"
        });
        
        console.log('✅ Cached action completed successfully');

        // Example 3: Natural language actions (from docs examples)
        console.log('\n3. Natural language actions');
        await page.act("scroll to the bottom of the page");
        await page.act("click on the readme file");
        
        // Example 4: Sequential Tool Calling (Open Operator pattern)
        console.log('\n4. Sequential Tool Calling (Open Operator)');
        
        // Open Operator will use the default LLM from Stagehand config
        const operator = stagehand.agent();
        const { message, actions } = await operator.execute(
            "Navigate to the Issues tab and tell me about the first open issue"
        );
        
        console.log('Sequential Tool Calling result:', message);
        console.log('Actions taken:', actions?.length || 0);

        // Example 5: Structured data extraction with proper schemas
        console.log('\n5. Structured data extraction');
        
        const repoData = await page.extract({
            instruction: "Extract repository information from this GitHub page",
            schema: z.object({
                name: z.string(),
                description: z.string().nullable(),
                starCount: z.string().nullable(),
                language: z.string().nullable(),
                lastUpdated: z.string().nullable()
            })
        });
        
        console.log('Extracted data:', repoData);

        // Example 6: Multi-step workflow with Computer Use
        console.log('\n6. Multi-step Computer Use workflow');
        
        const workflowResult = await agent.execute(
            'Go to the documentation link, find information about installation, and summarize the key installation steps'
        );
        
        console.log('Workflow result:', workflowResult.message);

        // Example 7: Form interaction demonstration
        console.log('\n7. Form interaction with Computer Use');
        try {
            await page.goto('https://httpbin.org/forms/post');
            
            // Use Computer Use agent for complex form filling
            const formResult = await agent.execute(
                'Fill out this form with sample data: name "John Doe", email "john@example.com", telephone "555-0123", and any other required fields'
            );
            
            console.log('Form interaction result:', formResult.message);
        } catch (error) {
            console.log('Form interaction skipped:', error.message);
        }

        // Example 8: Action replay demonstration (from docs)
        console.log('\n8. Action history and replay capabilities');
        
        if (actions && actions.length > 0) {
            console.log('Actions that can be replayed:');
            actions.slice(0, 3).forEach((action, index) => {
                console.log(`  ${index + 1}. ${action.type}: ${action.parameters || 'N/A'}`);
            });
        }

        console.log('\n✅ Computer Use Agent demo completed successfully!');
        console.log('\n🎯 Key Stagehand 2.0 features demonstrated:');
        console.log('- Computer Use Models with OpenAI integration');
        console.log('- Sequential Tool Calling (Open Operator)');
        console.log('- Enhanced act() with caching support');
        console.log('- Natural language action commands');
        console.log('- Structured data extraction with Zod schemas');
        console.log('- Multi-step autonomous workflows');
        console.log('- Action replay and debugging capabilities');
        
        console.log('\n📚 Documentation patterns used:');
        console.log('- stagehand.agent({ provider: "openai", model: "..." })');
        console.log('- agent.execute("natural language task")');
        console.log('- page.act({ description, method, arguments, selector })');
        console.log('- page.extract({ instruction, schema })');
        console.log('- Sequential tool calling with automatic reasoning');

    } catch (error) {
        console.error('❌ Demo error:', error.message);
    } finally {
        await stagehand.close();
    }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
    computerUseDemo().catch(console.error);
} 