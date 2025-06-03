import asyncio
import os
import sys
from datetime import datetime, timedelta
from loguru import logger
from dotenv import load_dotenv

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.carriers.maersk import MaerskCarrier
from src.models.booking import (
    BookingDetails, Location, Container, 
    InlandTransport
)

async def main():
    """Main function for automated Maersk rate extraction with enhanced Chromium compatibility"""
    try:
        # Configure logging
        logger.add("logs/automation.log", rotation="10 MB")
        logger.info("="*60)
        logger.info("🚀 STARTING AUTOMATED MAERSK RATE EXTRACTION")
        logger.info("="*60)
        logger.info("Using enhanced Chromium compatibility and automated login")
        
        # Create sample booking details
        booking = BookingDetails(
            origin=Location(
                city="New York",
                country="USA",
                is_port=True
            ),
            destination=Location(
                city="Hamburg", 
                country="Germany",
                is_port=True
            ),
            origin_transport=InlandTransport(
                type="SD",  # Store Door
                is_pickup=True
            ),
            destination_transport=InlandTransport(
                type="SD",  # Store Door
                is_pickup=False
            ),
            containers=[
                Container(
                    type="DRY",
                    size="20",
                    quantity=1,
                    weight_kg=15000
                )
            ],
            commodity="Electronics",
            ready_date=datetime.now() + timedelta(days=7),
            requires_temperature_control=False,
            is_dangerous_cargo=False,
            is_price_owner=True
        )
        
        # Initialize carrier with enhanced capabilities
        logger.info("Initializing Maersk carrier with enhanced Chromium settings...")
        carrier = MaerskCarrier()
        
        # Start browser automation with enhanced compatibility
        logger.info("Starting browser with enhanced compatibility settings...")
        await carrier.init_browser(headless=False)
        
        # Enhanced Hybrid Login with Automated + Manual Fallback
        logger.info("="*60)
        logger.info("🔐 STARTING ENHANCED HYBRID LOGIN")
        logger.info("="*60)
        logger.info("Attempting automated login first, with manual fallback if needed")
        
        login_attempts = 0
        max_login_attempts = 2  # Reduced since hybrid_login handles its own retries
        login_success = False
        
        while login_attempts < max_login_attempts and not login_success:
            try:
                login_attempts += 1
                logger.info(f"Hybrid login attempt {login_attempts}/{max_login_attempts}")
                
                # Use hybrid login (automated first, manual fallback)
                login_success = await carrier.hybrid_login()
                
                if login_success:
                    logger.info("✅ Hybrid login completed successfully!")
                else:
                    logger.warning("❌ Hybrid login returned false")
                
            except Exception as login_error:
                logger.warning(f"Hybrid login attempt {login_attempts} failed: {str(login_error)}")
                
                if login_attempts < max_login_attempts:
                    logger.info(f"Retrying hybrid login (attempt {login_attempts + 1}/{max_login_attempts})...")
                    await asyncio.sleep(3)  # Brief wait before retry
                else:
                    logger.error("Maximum hybrid login attempts reached.")
                    raise login_error
        
        if not login_success:
            logger.error("❌ Automated login failed after all attempts")
            return
        
        # Enhanced verification after login
        logger.info("Performing enhanced post-login verification...")
        
        # Check for any remaining authentication errors
        final_auth_check = await carrier.handle_authentication_errors()
        if final_auth_check:
            logger.warning("Authentication errors detected after login, but proceeding...")
        
        # Wait for page to be fully ready
        page_ready = await carrier.wait_for_page_ready()
        logger.info(f"Page ready status: {page_ready}")
        
        # Take screenshot and debug current page state
        await carrier.page.screenshot(path="debug_current_page.png")
        current_url = carrier.page.url
        page_title = await carrier.page.title()
        
        logger.info(f"Current page title: {page_title}")
        logger.info(f"Current URL: {current_url}")
        
        # Enhanced navigation to booking page if needed
        if "book" not in current_url.lower():
            logger.info("Navigating to booking page...")
            await carrier.navigate_to_booking()
            
            # Check for navigation errors
            nav_error = await carrier.handle_authentication_errors()
            if nav_error:
                logger.warning("Authentication error after navigation, but continuing...")
        
        # Enhanced page content verification
        logger.info("="*60)
        logger.info("🔍 VERIFYING PAGE CONTENT AND ELEMENTS")
        logger.info("="*60)
        
        # Look for available elements on the page with enhanced detection
        elements_to_check = [
            'text="Your booking details"',
            'text="Location details"',
            'text="From (City, Country/Region)"',
            'text="To (City, Country/Region)"',
            'input[placeholder="Enter city or port"]',
            'text="Book"',
            'text="Continue to book"',
            'text="What do you want to ship?"'
        ]
        
        found_elements = []
        for element in elements_to_check:
            try:
                await carrier.page.wait_for_selector(element, timeout=2000)
                found_elements.append(element)
                logger.info(f"✅ Found: {element}")
            except:
                logger.info(f"❌ Not found: {element}")
        
        logger.info(f"Found {len(found_elements)}/{len(elements_to_check)} expected booking elements")
        
        if found_elements:
            logger.info("="*60)
            logger.info("📝 FILLING BOOKING FORM")
            logger.info("="*60)
            
            # Handle any modal popups before form filling
            await carrier.handle_modal_popup()
            
            # Fill booking form with enhanced error handling
            try:
                await carrier.fill_booking_form(booking)
                logger.info("✅ Booking form filled successfully!")
                
                # Take screenshot of completed form
                await carrier.page.screenshot(path="debug_form_completed.png")
                
                # Look for next steps (continue button, etc.)
                continue_selectors = [
                    'button:has-text("Continue")',
                    'button:has-text("Book")',
                    'button:has-text("Get rates")',
                    'button:has-text("Search")',
                    'input[type="submit"]',
                    'button[type="submit"]'
                ]
                
                continue_button_found = False
                for selector in continue_selectors:
                    try:
                        continue_btn = await carrier.page.wait_for_selector(selector, timeout=3000)
                        if continue_btn:
                            logger.info(f"Found continue button: {selector}")
                            # You can uncomment the next line to automatically click continue
                            # await continue_btn.click()
                            continue_button_found = True
                            break
                    except:
                        continue
                
                if continue_button_found:
                    logger.info("✅ Continue button available - form ready for submission")
                else:
                    logger.info("ℹ️ No continue button found - form may need manual review")
                
            except Exception as form_error:
                logger.error(f"Error filling booking form: {str(form_error)}")
                await carrier.page.screenshot(path="error_form_filling.png")
                # Continue execution even if form filling fails
                
        else:
            logger.warning("⚠️ No expected booking elements found")
            logger.info("Taking screenshot for manual inspection...")
            await carrier.page.screenshot(path="debug_no_booking_elements.png")
            
            # Try alternative approach - check page content
            try:
                page_content = await carrier.page.content()
                with open("debug_page_content.html", "w", encoding="utf-8") as f:
                    f.write(page_content)
                logger.info("📄 Page content saved to debug_page_content.html for analysis")
            except Exception as e:
                logger.error(f"Error saving page content: {str(e)}")
        
        # Final status report
        logger.info("="*60)
        logger.info("📊 AUTOMATION SUMMARY")
        logger.info("="*60)
        logger.info(f"✅ Browser initialization: Success")
        logger.info(f"✅ Enhanced login: {'Success' if login_success else 'Failed'}")
        logger.info(f"✅ Page navigation: Success")
        logger.info(f"✅ Element detection: {len(found_elements)} elements found")
        logger.info(f"✅ Form filling: {'Attempted' if found_elements else 'Skipped - no elements'}")
        
        # Keep browser open for inspection
        logger.info("="*60)
        logger.info("🔍 MANUAL INSPECTION TIME")
        logger.info("="*60)
        logger.info("Browser will remain open for 60 seconds for manual inspection.")
        logger.info("You can:")
        logger.info("1. Review the filled form")
        logger.info("2. Submit the form manually if needed")
        logger.info("3. Check for any remaining issues")
        logger.info("4. Verify the automation worked correctly")
        logger.info("Press Ctrl+C to close early if needed.")
        logger.info("="*60)
        
        await asyncio.sleep(60)  # Keep browser open for inspection
        
        # Close browser
        await carrier.close()
        
        logger.info("✅ Automated Maersk rate extraction completed successfully!")
        
    except KeyboardInterrupt:
        logger.info("🛑 Automation interrupted by user")
        try:
            if 'carrier' in locals():
                await carrier.close()
        except:
            pass
        
    except Exception as e:
        logger.error(f"❌ Error during automation: {str(e)}")
        try:
            if 'carrier' in locals():
                await carrier.page.screenshot(path="error_final.png")
                await carrier.close()
        except:
            pass
        raise

if __name__ == "__main__":
    load_dotenv()
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Verify environment variables
    username = os.getenv("MAERSK_USERNAME")
    password = os.getenv("MAERSK_PASSWORD")
    
    if not username or not password:
        logger.error("❌ Missing credentials in .env file")
        logger.error("Please ensure MAERSK_USERNAME and MAERSK_PASSWORD are set in your .env file")
        sys.exit(1)
    
    logger.info(f"Using credentials for user: {username}")
    asyncio.run(main()) 