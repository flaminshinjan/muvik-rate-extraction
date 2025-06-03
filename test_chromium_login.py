#!/usr/bin/env python3
"""
Test script for enhanced Chromium login functionality
This script tests the fixes for 403/401 errors and authentication issues
"""

import asyncio
import os
import sys
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.carriers.maersk import MaerskCarrier

async def test_chromium_login():
    """Test the enhanced Chromium login functionality"""
    try:
        # Configure logging
        logger.add("logs/chromium_test.log", rotation="10 MB")
        logger.info("="*60)
        logger.info("🔧 TESTING ENHANCED CHROMIUM LOGIN")
        logger.info("="*60)
        
        # Initialize carrier
        logger.info("Initializing Maersk carrier with enhanced Chromium settings...")
        carrier = MaerskCarrier()
        
        # Start browser with enhanced compatibility
        logger.info("Starting browser with enhanced compatibility settings...")
        await carrier.init_browser(headless=False)
        
        # Test authentication error handling
        logger.info("Testing authentication and page navigation...")
        
        # Navigate to the login page
        logger.info("Navigating to Maersk login page...")
        await carrier.page.goto("https://www.maersk.com/book/")
        
        # Test enhanced page ready detection
        page_ready = await carrier.wait_for_page_ready()
        logger.info(f"Page ready status: {page_ready}")
        
        # Test authentication error detection
        auth_errors = await carrier.handle_authentication_errors()
        logger.info(f"Authentication errors detected and handled: {auth_errors}")
        
        # Test cookie handling
        logger.info("Testing enhanced cookie acceptance...")
        await carrier.accept_cookies()
        
        # Take screenshots for debugging
        await carrier.page.screenshot(path="test_initial_state.png")
        
        # Get current page state
        current_url = carrier.page.url
        page_title = await carrier.page.title()
        
        logger.info(f"Current URL: {current_url}")
        logger.info(f"Page title: {page_title}")
        
        # Test if we can access page content without 403/401 errors
        try:
            page_content = await carrier.page.content()
            if "403" not in page_content and "401" not in page_content:
                logger.info("✅ No 403/401 errors detected in page content")
            else:
                logger.warning("⚠️ Authentication errors still present in page content")
        except Exception as e:
            logger.error(f"Error accessing page content: {str(e)}")
        
        # Test enhanced manual login
        logger.info("Starting enhanced manual login test...")
        login_success = await carrier.manual_login()
        
        if login_success:
            logger.info("✅ Enhanced login test completed successfully!")
            
            # Additional verification tests
            logger.info("Running additional verification tests...")
            
            # Test navigation after login
            try:
                await carrier.page.goto("https://www.maersk.com/book/")
                nav_errors = await carrier.handle_authentication_errors()
                if not nav_errors:
                    logger.info("✅ Navigation after login successful - no auth errors")
                else:
                    logger.warning("⚠️ Authentication errors detected after navigation")
            except Exception as e:
                logger.error(f"Error during post-login navigation test: {str(e)}")
            
            # Test page element access
            try:
                elements_found = []
                test_selectors = [
                    'input[placeholder="Enter city or port"]',
                    'text="Your booking details"',
                    'text="Location details"'
                ]
                
                for selector in test_selectors:
                    try:
                        await carrier.page.wait_for_selector(selector, timeout=2000)
                        elements_found.append(selector)
                    except:
                        continue
                
                logger.info(f"✅ Found {len(elements_found)} booking page elements")
                
            except Exception as e:
                logger.error(f"Error testing page elements: {str(e)}")
        else:
            logger.error("❌ Enhanced login test failed")
        
        # Keep browser open for manual inspection
        logger.info("="*60)
        logger.info("🔍 MANUAL INSPECTION")
        logger.info("="*60)
        logger.info("Browser will remain open for 30 seconds for manual inspection.")
        logger.info("Check the browser window to verify:")
        logger.info("1. No 403/401 errors in network tab")
        logger.info("2. Cookies are properly accepted")
        logger.info("3. Authentication flows work correctly")
        logger.info("4. Page elements load properly")
        logger.info("="*60)
        
        await asyncio.sleep(30)  # Keep browser open for inspection
        
        # Final cleanup
        await carrier.close()
        
        logger.info("✅ Chromium login test completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error during Chromium login test: {str(e)}")
        raise

if __name__ == "__main__":
    load_dotenv()
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    asyncio.run(test_chromium_login()) 