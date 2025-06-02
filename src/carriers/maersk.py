import os
from loguru import logger
from datetime import datetime
from ..models.booking import BookingDetails
from .base import BaseCarrier

class MaerskCarrier(BaseCarrier):
    def __init__(self):
        super().__init__()
        self.base_url = os.getenv("MAERSK_BASE_URL", "https://www.maersk.com")
        self.username = os.getenv("MAERSK_USERNAME", "whitehouse1")
        self.password = os.getenv("MAERSK_PASSWORD", "wHite@123")
        
    async def accept_cookies(self):
        """Accept cookies on the page"""
        try:
            logger.info("Looking for cookie acceptance button...")
            
            # Wait for cookie dialog
            await self.page.wait_for_selector('text="Cookie management for the best digital experience"', timeout=10000)
            
            # Click "Allow all" button
            allow_button = await self.page.wait_for_selector('button:has-text("Allow all")', timeout=5000)
            if allow_button:
                await allow_button.click()
                logger.info("Successfully accepted cookies")
                await self.page.wait_for_timeout(2000)  # Wait for dialog to disappear
            else:
                logger.warning("Could not find Allow all button")
            
        except Exception as e:
            logger.warning(f"Error accepting cookies: {str(e)}")
        
    async def login(self):
        """Login to Maersk portal"""
        try:
            logger.info("Navigating to Maersk booking page...")
            await self.page.goto(f"{self.base_url}/book/")
            await self.wait_for_navigation()
            
            # Accept cookies first
            await self.accept_cookies()
            
            # Wait for page to be ready (reduced wait time)
            await self.page.wait_for_load_state("domcontentloaded")
            await self.page.wait_for_timeout(3000)  # Simple timeout instead of networkidle
            
            # Take screenshot after cookie acceptance to see current state
            await self.page.screenshot(path="debug_after_cookies.png")
            
            # Look for username and password fields directly (we're already on login page)
            logger.info("Filling login form...")
            
            # Fill username
            username_input = await self.page.wait_for_selector('input[placeholder="Username"]', timeout=10000)
            if username_input:
                await username_input.fill(self.username)
                logger.info("Username filled successfully")
            else:
                raise Exception("Username field not found")
                
            # Fill password
            password_input = await self.page.wait_for_selector('input[placeholder="Password"]', timeout=5000)
            if password_input:
                await password_input.fill(self.password)
                logger.info("Password filled successfully")
            else:
                raise Exception("Password field not found")
            
            # Take screenshot after filling credentials
            await self.page.screenshot(path="debug_credentials_filled.png")
            
            # Click login button - try multiple selectors
            logger.info("Looking for login button...")
            login_selectors = [
                'button:has-text("Log in")',
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Login")',
                '[data-testid*="login"]',
                '.login-button',
                '#login-button'
            ]
            
            login_clicked = False
            for selector in login_selectors:
                try:
                    login_button = await self.page.wait_for_selector(selector, timeout=2000)
                    if login_button:
                        logger.info(f"Found login button with selector: {selector}")
                        await login_button.click()
                        login_clicked = True
                        break
                except Exception as e:
                    logger.debug(f"Login selector {selector} not found: {str(e)}")
                    continue
            
            if not login_clicked:
                # Take screenshot to see what's available
                await self.page.screenshot(path="debug_no_login_button.png")
                raise Exception("Could not find login button with any selector")
            
            # Wait for successful login
            logger.info("Waiting for successful login...")
            await self.page.wait_for_timeout(5000)  # Simple timeout instead of navigation wait
            
            # Take screenshot after login attempt
            await self.page.screenshot(path="debug_after_login.png")
            
            # Check if we're logged in
            page_content = await self.page.content()
            if self.username.lower() in page_content.lower():
                logger.info("Successfully logged into Maersk portal")
            else:
                logger.warning("Login status unclear - continuing with automation")
            
        except Exception as e:
            logger.error(f"Failed to login to Maersk portal: {str(e)}")
            # Take error screenshot
            try:
                await self.page.screenshot(path="error_login.png")
            except:
                pass  # Ignore screenshot errors
            raise
            
    async def navigate_to_booking(self):
        """Navigate to booking page"""
        try:
            # Check if we're already on a booking page by looking for booking form elements
            booking_elements = [
                'input[placeholder="Enter city or port"]',
                'input[placeholder*="origin"]',
                'input[placeholder*="destination"]',
                'text="Origin"',
                'text="Destination"'
            ]
            
            # First check if we're already on the booking page
            for element in booking_elements:
                try:
                    await self.page.wait_for_selector(element, timeout=2000)
                    logger.info("Already on booking page")
                    return
                except:
                    continue
            
            # If not on booking page, try to navigate
            logger.info("Navigating to booking page...")
            await self.page.goto(f"{self.base_url}/book/")
            await self.wait_for_navigation()
            
            # Wait for booking form elements
            for element in booking_elements:
                try:
                    await self.page.wait_for_selector(element, timeout=5000)
                    logger.info("Successfully navigated to booking page")
                    return
                except:
                    continue
                    
            # Take screenshot if booking page not found
            await self.page.screenshot(path="debug_booking_page.png")
            logger.warning("Could not find booking form elements")
            
        except Exception as e:
            logger.error(f"Failed to navigate to booking page: {str(e)}")
            await self.page.screenshot(path="error_booking_nav.png")
            raise
            
    async def fill_booking_form(self, booking: BookingDetails):
        """Fill the booking form with provided details"""
        try:
            # Fill origin
            await self.wait_and_fill('input[placeholder="Enter city or port"]', booking.origin.city, timeout=10000)
            await self.page.keyboard.press("Enter")
            await self.page.wait_for_timeout(2000)  # Wait for dropdown to appear
            
            # Fill destination
            await self.page.locator('input[placeholder="Enter city or port"]').nth(1).fill(booking.destination.city)
            await self.page.keyboard.press("Enter")
            await self.page.wait_for_timeout(2000)  # Wait for dropdown to appear
            
            # Select inland transportation options
            if booking.origin_transport.type == "SD":
                await self.wait_and_click('text="I want Maersk to pick up the container at my facility"', timeout=10000)
            
            if booking.destination_transport.type == "SD":
                await self.wait_and_click('text="I want Maersk to deliver the container at my facility"', timeout=10000)
                
            # Fill commodity
            await self.wait_and_fill('input[placeholder="Type in minimum 2 characters"]', booking.commodity, timeout=10000)
            await self.page.keyboard.press("Enter")
            await self.page.wait_for_timeout(2000)  # Wait for dropdown to appear
            
            # Handle temperature control and dangerous cargo
            if booking.requires_temperature_control:
                await self.wait_and_click('text="This cargo requires temperature control"', timeout=10000)
            
            if booking.is_dangerous_cargo:
                await self.wait_and_click('text="This cargo is considered dangerous"', timeout=10000)
                
            # Select container type
            for container in booking.containers:
                await self.wait_and_click('text="Select container type and size"', timeout=10000)
                await self.page.wait_for_timeout(2000)  # Wait for dropdown to appear
                await self.wait_and_click(f'text="{container.type} {container.size}"', timeout=10000)
                
                # Set quantity
                if container.quantity > 1:
                    for _ in range(container.quantity - 1):
                        await self.wait_and_click('button[aria-label="Increase quantity"]', timeout=10000)
                
                # Set weight
                await self.wait_and_fill('input[placeholder="Enter cargo weight"]', str(container.weight_kg), timeout=10000)
                
            # Set ready date
            date_str = booking.ready_date.strftime("%d %b %Y")
            await self.wait_and_fill('input[placeholder="Select date"]', date_str, timeout=10000)
            
            # Set price owner
            if booking.is_price_owner:
                await self.wait_and_click('text="I am the price owner"', timeout=10000)
            
            logger.info("Successfully filled booking form")
            
        except Exception as e:
            logger.error(f"Failed to fill booking form: {str(e)}")
            # Take error screenshot
            await self.page.screenshot(path="error_booking.png")
            raise 