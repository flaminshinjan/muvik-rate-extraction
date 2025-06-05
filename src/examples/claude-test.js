import 'dotenv/config';
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

/**
 * Simple test for Claude Computer Use functionality
 * Verifies that Claude API keys and models are working correctly
 */
async function testClaude() {
    console.log('🧪 Testing Claude Computer Use Functionality');
    console.log('============================================');

    // Check environment variables
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY not found in .env file');
        console.log('Please add your Anthropic API key to .env:');
        console.log('ANTHROPIC_API_KEY=your_anthropic_api_key_here');
        process.exit(1);
    }

    // Initialize Stagehand
    const stagehand = new Stagehand({
        modelName: process.env.MODEL_NAME || "gpt-4o-mini",
        headless: false
    });

    await stagehand.init();
    const page = stagehand.page;

    try {
        console.log('🚀 Creating Claude Computer Use agent...');
        
        // Create Claude Computer Use agent
        const agent = stagehand.agent({
            provider: "anthropic",
            model: process.env.COMPUTER_USE_MODEL || "claude-3-7-sonnet-20250219"
        });

        console.log('✅ Claude Computer Use agent created successfully');

        // Test 1: Simple navigation and analysis
        console.log('\n1. Testing Claude navigation and analysis...');
        await page.goto("https://example.com");
        
        const result = await agent.execute("Analyze this webpage and tell me what it's about");
        console.log('Claude analysis:', result.message);

        // Test 2: Structured data extraction
        console.log('\n2. Testing structured data extraction...');
        const pageData = await page.extract({
            instruction: "Extract the main heading and any visible text from this page",
            schema: z.object({
                heading: z.string(),
                content: z.string(),
                hasLinks: z.boolean()
            })
        });
        
        console.log('Extracted data:', pageData);

        // Test 3: Sequential actions
        console.log('\n3. Testing sequential actions...');
        await page.act('scroll to the bottom of the page');
        await page.act('scroll back to the top');
        
        console.log('✅ Sequential actions completed');

        console.log('\n🎉 Claude Computer Use test completed successfully!');
        console.log('\n✅ All tests passed:');
        console.log('  - Claude agent creation');
        console.log('  - Natural language analysis');
        console.log('  - Structured data extraction');
        console.log('  - Sequential action execution');

    } catch (error) {
        console.error('❌ Claude test failed:', error.message);
        
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            console.log('\n🔑 API Key Issue:');
            console.log('- Check that your ANTHROPIC_API_KEY is correct');
            console.log('- Verify your Claude API access and credits');
        } else if (error.message.includes('model')) {
            console.log('\n🤖 Model Issue:');
            console.log('- Check that the Claude model is available');
            console.log('- Try claude-3-7-sonnet-20250219 or claude-3-7-sonnet-20250219');
        } else {
            console.log('\n🐛 Other Issue:');
            console.log('- Check network connectivity');
            console.log('- Review console logs for more details');
        }
    } finally {
        await stagehand.close();
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testClaude().catch(console.error);
} 