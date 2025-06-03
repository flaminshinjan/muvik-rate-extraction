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
        """Accept cookies on the page with enhanced handling"""
        try:
            logger.info("Looking for cookie acceptance button...")
            
            # Wait for cookie dialog with multiple possible selectors
            cookie_selectors = [
                'text="Cookie management for the best digital experience"',
                'text="Allow all"',
                'button:has-text("Allow all")',
                'button:has-text("Accept all")',
                'button:has-text("Accept All")',
                '#onetrust-accept-btn-handler',
                '.accept-cookies',
                '[data-testid*="cookie"]',
                '[data-testid*="accept"]'
            ]
            
            cookie_dialog_found = False
            for selector in cookie_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=3000)
                    cookie_dialog_found = True
                    logger.info(f"Found cookie dialog with selector: {selector}")
                    break
                except:
                    continue
            
            if cookie_dialog_found:
                # Try to click "Allow all" button with multiple selectors
                allow_selectors = [
                    'button:has-text("Allow all")',
                    'button:has-text("Accept all")', 
                    'button:has-text("Accept All")',
                    '#onetrust-accept-btn-handler',
                    '.accept-all-cookies',
                    '[data-testid*="accept-all"]'
                ]
                
                for selector in allow_selectors:
                    try:
                        allow_button = await self.page.wait_for_selector(selector, timeout=2000)
                        if allow_button:
                            await allow_button.click()
                            logger.info(f"Successfully accepted cookies using: {selector}")
                            await self.page.wait_for_timeout(2000)  # Wait for dialog to disappear
                            return
                    except:
                        continue
                        
                logger.warning("Could not find or click Accept All button")
            else:
                logger.info("No cookie dialog found - cookies may already be accepted")
            
        except Exception as e:
            logger.warning(f"Error accepting cookies: {str(e)}")
        
    async def handle_authentication_errors(self):
        """Handle common authentication errors and retries"""
        try:
            # Check for common error indicators
            error_patterns = [
                'text="403"',
                'text="Forbidden"', 
                'text="401"',
                'text="Unauthorized"',
                'text="Access denied"',
                'text="Session expired"',
                'text="Please try again"'
            ]
            
            for pattern in error_patterns:
                try:
                    await self.page.wait_for_selector(pattern, timeout=1000)
                    logger.warning(f"Authentication error detected: {pattern}")
                    
                    # Take screenshot for debugging
                    await self.page.screenshot(path="debug_auth_error.png")
                    
                    # Try to refresh the page
                    logger.info("Attempting to refresh page and retry...")
                    await self.page.reload()
                    await self.page.wait_for_load_state("domcontentloaded")
                    await self.page.wait_for_timeout(3000)
                    
                    # Re-accept cookies after refresh
                    await self.accept_cookies()
                    
                    return True  # Error found and handled
                except:
                    continue
                    
            return False  # No errors found
            
        except Exception as e:
            logger.error(f"Error handling authentication errors: {str(e)}")
            return False
    
    async def wait_for_page_ready(self, timeout: int = 30000):
        """Enhanced page ready detection"""
        try:
            # Wait for basic load
            await self.page.wait_for_load_state("domcontentloaded", timeout=timeout)
            
            # Wait for network to settle
            await self.page.wait_for_load_state("networkidle", timeout=timeout)
            
            # Additional wait for dynamic content
            await self.page.wait_for_timeout(2000)
            
            # Check if page has loaded properly
            ready_indicators = [
                'body',
                'header',
                'main',
                '.content',
                '#app',
                '[data-testid]'
            ]
            
            for indicator in ready_indicators:
                try:
                    await self.page.wait_for_selector(indicator, timeout=2000)
                    logger.info(f"Page ready indicator found: {indicator}")
                    return True
                except:
                    continue
                    
            logger.warning("No ready indicators found, but proceeding")
            return True
            
        except Exception as e:
            logger.warning(f"Page ready timeout: {str(e)}")
            return False
        
    async def _ensure_browser_ready(self):
        """Ensure browser and page are still available"""
        if not self.browser or not self.page or not self.context:
            raise Exception("Browser not initialized or has been closed")
        
        try:
            # Check if page is still accessible
            await self.page.evaluate("() => document.readyState")
        except Exception as e:
            raise Exception(f"Browser page is no longer accessible: {str(e)}")
    
    async def login(self):
        """Enhanced automated login to Maersk portal with error handling"""
        try:
            # Ensure browser is ready
            await self._ensure_browser_ready()
            
            logger.info("Navigating to Maersk booking page...")
            await self.page.goto(f"{self.base_url}/book/")
            
            # Enhanced page ready detection
            await self.wait_for_page_ready()
            
            # Handle any immediate authentication errors
            auth_error_detected = await self.handle_authentication_errors()
            if auth_error_detected:
                logger.info("Handled initial authentication error, proceeding...")
            
            # Accept cookies first with enhanced handling
            await self.accept_cookies()
            
            # Take screenshot after cookie acceptance to see current state
            await self.page.screenshot(path="debug_after_cookies.png")
            
            # Check if we need to login (might already be logged in)
            current_url = self.page.url
            logger.info(f"Current URL after navigation: {current_url}")
            
            if "accounts.maersk.com" not in current_url:
                # Check if we're already on the main domain and logged in
                if "maersk.com" in current_url:
                    logger.info("Already on maersk.com domain - checking if logged in...")
                    
                    # Look for login indicators vs logged-in indicators
                    login_indicators = [
                        'text="Log in"',
                        'text="Sign in"',
                        'input[placeholder="Username"]',
                        'input[placeholder="Password"]'
                    ]
                    
                    already_logged_in = True
                    for indicator in login_indicators:
                        try:
                            await self.page.wait_for_selector(indicator, timeout=2000)
                            already_logged_in = False
                            break
                        except:
                            continue
                    
                    if already_logged_in:
                        logger.info("✅ Already logged in - proceeding to booking functionality")
                        return
                    else:
                        logger.info("Login required - looking for login form...")
                else:
                    logger.info("Not on expected domain - proceeding with login...")
            
            # Look for username and password fields with enhanced selectors
            logger.info("Looking for login form...")
            
            username_selectors = [
                'input[placeholder="Username"]',
                'input[name="username"]',
                'input[type="text"]',
                'input[name="email"]',
                '#username',
                '#email'
            ]
            
            password_selectors = [
                'input[placeholder="Password"]',
                'input[name="password"]',
                'input[type="password"]',
                '#password'
            ]
            
            # Find and fill username
            username_filled = False
            for selector in username_selectors:
                try:
                    username_input = await self.page.wait_for_selector(selector, timeout=5000)
                    if username_input:
                        await username_input.fill("")  # Clear field
                        await username_input.fill(self.username)
                        logger.info(f"Username filled using selector: {selector}")
                        username_filled = True
                        break
                except Exception as e:
                    logger.debug(f"Username selector {selector} failed: {str(e)}")
                    continue
            
            if not username_filled:
                await self.page.screenshot(path="debug_no_username_field.png")
                raise Exception("Username field not found with any selector")
                
            # Find and fill password
            password_filled = False
            for selector in password_selectors:
                try:
                    password_input = await self.page.wait_for_selector(selector, timeout=3000)
                    if password_input:
                        await password_input.fill("")  # Clear field
                        await password_input.fill(self.password)
                        logger.info(f"Password filled using selector: {selector}")
                        password_filled = True
                        break
                except Exception as e:
                    logger.debug(f"Password selector {selector} failed: {str(e)}")
                    continue
            
            if not password_filled:
                await self.page.screenshot(path="debug_no_password_field.png")
                raise Exception("Password field not found with any selector")
            
            # Take screenshot after filling credentials
            await self.page.screenshot(path="debug_credentials_filled.png")
            
            # Click login button with enhanced selectors
            logger.info("Looking for login button...")
            login_selectors = [
                'button:has-text("Log in")',
                'button:has-text("Sign in")',
                'button:has-text("Login")',
                'button[type="submit"]',
                'input[type="submit"]',
                'input[value*="Log"]',
                'input[value*="Sign"]',
                '[data-testid*="login"]',
                '[data-testid*="submit"]',
                '.login-button',
                '#login-button',
                '#submit-button'
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
                await self.page.screenshot(path="debug_no_login_button.png")
                raise Exception("Could not find login button with any selector")
            
            # Wait for login processing
            await self.page.wait_for_timeout(3000)
            
            # Check for immediate error messages with detailed analysis
            error_indicators = [
                'text="Invalid"',
                'text="Error"',
                'text="incorrect"',
                'text="failed"',
                'text="wrong"',
                '.error',
                '[role="alert"]',
                'text="Try again"',
                '.alert-danger',
                '.error-message'
            ]
            
            error_found = False
            error_details = ""
            for indicator in error_indicators:
                try:
                    error_element = await self.page.wait_for_selector(indicator, timeout=2000)
                    if error_element:
                        # Try to get the error text for better debugging
                        try:
                            error_text = await error_element.text_content()
                            error_details = f"Error: {error_text}" if error_text else f"Error indicator: {indicator}"
                        except:
                            error_details = f"Error indicator: {indicator}"
                        
                        logger.error(f"Found error indicator: {indicator} - {error_details}")
                        error_found = True
                        break
                except:
                    continue
            
            if error_found:
                await self.page.screenshot(path="debug_login_error.png")
                
                # Also capture page content for analysis
                try:
                    page_content = await self.page.content()
                    with open("debug_login_error_content.html", "w", encoding="utf-8") as f:
                        f.write(page_content)
                    logger.info("Login error page content saved for analysis")
                except:
                    pass
                
                raise Exception(f"Login error detected - {error_details}. Please check credentials, handle 2FA manually, or verify the login page structure.")
            
            # Check for additional authentication steps (2FA, verification, etc.)
            additional_steps = [
                'text="verification"',
                'text="code"',
                'text="Verify"',
                'text="Two-factor"',
                'text="SMS"',
                'text="authenticator"',
                'input[type="tel"]',
                'input[placeholder*="code"]',
                'input[placeholder*="Code"]'
            ]
            
            additional_step_found = False
            for step in additional_steps:
                try:
                    await self.page.wait_for_selector(step, timeout=2000)
                    logger.warning(f"Additional authentication step detected: {step}")
                    additional_step_found = True
                    break
                except:
                    continue
            
            if additional_step_found:
                await self.page.screenshot(path="debug_additional_auth.png")
                raise Exception("Additional authentication required (2FA/verification) - please handle manually or disable 2FA for automation")
            
            # Wait for OAuth redirect with enhanced monitoring
            logger.info("Waiting for authentication redirect...")
            
            redirect_successful = False
            redirect_attempts = 0
            max_redirect_attempts = 6  # 30 seconds total
            
            while not redirect_successful and redirect_attempts < max_redirect_attempts:
                redirect_attempts += 1
                
                try:
                    # Wait for redirect to maersk.com domain (not accounts.maersk.com)
                    await self.page.wait_for_url("**/maersk.com/**", timeout=5000)
                    redirect_successful = True
                    logger.info("✅ Successfully redirected to maersk.com domain")
                    break
                except:
                    current_url_check = self.page.url
                    logger.info(f"Redirect attempt {redirect_attempts}/{max_redirect_attempts}, current URL: {current_url_check}")
                    
                    # Check if we're already on the right domain
                    if "maersk.com" in current_url_check and "accounts.maersk.com" not in current_url_check:
                        redirect_successful = True
                        logger.info("✅ Already on maersk.com domain")
                        break
                    
                    # Check for authentication errors during redirect
                    auth_error = await self.handle_authentication_errors()
                    if auth_error:
                        logger.warning("Authentication error during redirect - handled")
                        break
                    
                    if redirect_attempts < max_redirect_attempts:
                        await self.page.wait_for_timeout(5000)  # Wait 5 seconds between attempts
            
            if not redirect_successful:
                logger.warning("Redirect timeout - checking current state...")
                await self.page.screenshot(path="debug_redirect_timeout.png")
                
                # Check page content for any clues about login success
                try:
                    page_content = await self.page.content()
                    if self.username.lower() in page_content.lower():
                        logger.info("Username found in page content - login seems successful")
                        redirect_successful = True
                    else:
                        logger.warning("Username not found in page content - login might have failed")
                except:
                    pass
            
            # Enhanced post-login verification
            await self.wait_for_page_ready()
            
            # Take screenshot after authentication
            await self.page.screenshot(path="debug_after_oauth_redirect.png")
            
            # Navigate to booking page if needed
            final_url = self.page.url
            logger.info(f"Final URL after login: {final_url}")
            
            if "book" not in final_url.lower():
                logger.info("Navigating to booking page...")
                await self.page.goto(f"{self.base_url}/book/")
                await self.wait_for_page_ready()
                
                # Check for navigation errors
                nav_auth_error = await self.handle_authentication_errors()
                if nav_auth_error:
                    logger.warning("Authentication error after navigation to booking page")
            
            # Final verification
            final_verification_url = self.page.url
            logger.info(f"Final verification URL: {final_verification_url}")
            
            if "maersk.com" in final_verification_url and "accounts.maersk.com" not in final_verification_url:
                logger.info("✅ Successfully logged into Maersk portal")
                
                # Handle any modal popups that might appear after login
                await self.handle_modal_popup()
                
            else:
                raise Exception(f"Login verification failed - unexpected final URL: {final_verification_url}")
            
        except Exception as e:
            logger.error(f"Failed to login to Maersk portal: {str(e)}")
            # Take error screenshot
            try:
                await self.page.screenshot(path="error_login.png")
            except:
                pass  # Ignore screenshot errors
            raise
            
    async def handle_modal_popup(self):
        """Handle the 'Explore our new menu!' modal popup"""
        try:
            logger.info("Checking for modal popup...")
            
            # Look for the modal and "Got it" button
            modal_selectors = [
                'text="Explore our new menu!"',
                'text="Got it"',
                'button:has-text("Got it")',
                '[aria-label*="close"]',
                '.modal'
            ]
            
            # Wait a bit for modal to appear
            await self.page.wait_for_timeout(2000)
            
            # Take screenshot to see current state
            await self.page.screenshot(path="debug_before_modal.png")
            
            # Try to find and click "Got it" button
            got_it_selectors = [
                'button:has-text("Got it")',
                'text="Got it"',
                '[role="button"]:has-text("Got it")',
                'button[class*="button"]:has-text("Got it")'
            ]
            
            modal_closed = False
            for selector in got_it_selectors:
                try:
                    got_it_button = await self.page.wait_for_selector(selector, timeout=3000)
                    if got_it_button:
                        logger.info(f"Found 'Got it' button with selector: {selector}")
                        await got_it_button.click()
                        logger.info("Successfully clicked 'Got it' button")
                        modal_closed = True
                        break
                except Exception as e:
                    logger.debug(f"Got it selector {selector} not found: {str(e)}")
                    continue
            
            if not modal_closed:
                logger.warning("Could not find 'Got it' button, modal might not be present")
            
            # Wait for modal to disappear
            await self.page.wait_for_timeout(2000)
            await self.page.screenshot(path="debug_after_modal.png")
            
        except Exception as e:
            logger.warning(f"Error handling modal popup: {str(e)}")
            await self.page.screenshot(path="error_modal.png")
            
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
            logger.info("Starting to fill booking form...")
            
            # Wait for the form to be ready - try multiple selectors
            form_indicators = [
                'text="Your booking details"',
                'text="Location details"',
                'text="From (City, Country/Region)"',
                'text="To (City, Country/Region)"',
                'input[placeholder="Enter city or port"]',
                'text="What do you want to ship?"'
            ]
            
            form_found = False
            for indicator in form_indicators:
                try:
                    await self.page.wait_for_selector(indicator, timeout=3000)
                    logger.info(f"Found form using indicator: {indicator}")
                    form_found = True
                    break
                except:
                    continue
                    
            if not form_found:
                logger.warning("Could not find expected form elements, taking screenshot...")
                await self.page.screenshot(path="debug_no_form.png")
                # Continue anyway, maybe the form is there but with different selectors
            
            await self.page.wait_for_timeout(2000)
            
            # 1. Fill From location (Origin) - try multiple selectors based on the actual form
            logger.info("Filling origin location...")
            from_filled = False
            from_selectors = [
                'input[placeholder="Enter city or port"]',
                'text="From (City, Country/Region)" >> .. >> input',
                'label:has-text("From") >> .. >> input',
                'input[name*="origin"]',
                'input[placeholder*="from"]'
            ]
            
            for selector in from_selectors:
                try:
                    from_input = await self.page.wait_for_selector(selector, timeout=3000)
                    await from_input.clear()
                    await from_input.fill(f"{booking.origin.city}, {booking.origin.country}")
                    logger.info(f"Origin filled using selector: {selector}")
                    from_filled = True
                    break
                except:
                    continue
                    
            if not from_filled:
                logger.warning("Could not fill origin location")
                
            await self.page.wait_for_timeout(1000)
            # Try to select from dropdown if it appears
            try:
                await self.page.click('text="' + booking.origin.city + '"', timeout=2000)
            except:
                await self.page.keyboard.press("Tab")  # Move to next field
                
            # 2. Fill To location (Destination) - target the second input field
            logger.info("Filling destination location...")
            to_filled = False
            to_selectors = [
                'input[placeholder="Enter city or port"] >> nth=1',
                'text="To (City, Country/Region)" >> .. >> input',
                'label:has-text("To") >> .. >> input'
            ]
            
            for selector in to_selectors:
                try:
                    to_input = await self.page.wait_for_selector(selector, timeout=3000)
                    await to_input.clear()
                    await to_input.fill(f"{booking.destination.city}, {booking.destination.country}")
                    logger.info(f"Destination filled using selector: {selector}")
                    to_filled = True
                    break
                except:
                    continue
                    
            if not to_filled:
                logger.warning("Could not fill destination location")
                
            await self.page.wait_for_timeout(1000)
            # Try to select from dropdown if it appears
            try:
                await self.page.click('text="' + booking.destination.city + '"', timeout=2000)
            except:
                await self.page.keyboard.press("Tab")  # Move to next field
            
            # 3. Select inland transportation options based on the actual form structure
            logger.info("Setting inland transportation...")
            try:
                if booking.origin_transport.type == "SD":
                    # Click on SD option for origin (Store Door)
                    await self.page.click('text="I want Maersk to pick up the container at my facility" >> .. >> input[type="radio"]', timeout=3000)
                else:
                    # Click on CY option for origin (Customer Yard) - default
                    await self.page.click('text="I will arrange to deliver the container to the port/inland location" >> .. >> input[type="radio"]', timeout=3000)
            except:
                logger.warning("Could not set origin transport option")
                
            try:
                if booking.destination_transport.type == "SD":
                    # Click on SD option for destination
                    await self.page.click('text="I want Maersk to deliver the container at my facility" >> .. >> input[type="radio"]', timeout=3000)
                else:
                    # Click on CY option for destination (default)
                    await self.page.click('text="I will arrange for pick up of the container from the port/inland location" >> .. >> input[type="radio"]', timeout=3000)
            except:
                logger.warning("Could not set destination transport option")
                
            # 4. Fill commodity using the actual form structure
            logger.info("Filling commodity...")
            commodity_filled = False
            commodity_selectors = [
                'input[placeholder="Type in minimum 2 characters"]',
                'text="Commodity" >> .. >> input',
                'label:has-text("Commodity") >> .. >> input'
            ]
            
            for selector in commodity_selectors:
                try:
                    commodity_input = await self.page.wait_for_selector(selector, timeout=3000)
                    await commodity_input.clear()
                    await commodity_input.fill(booking.commodity)
                    logger.info(f"Commodity filled using selector: {selector}")
                    commodity_filled = True
                    break
                except:
                    continue
                    
            if not commodity_filled:
                logger.warning("Could not fill commodity")
                
            await self.page.wait_for_timeout(1000)
            
            # 5. Handle temperature control and dangerous cargo checkboxes
            try:
                if booking.requires_temperature_control:
                    logger.info("Selecting temperature control...")
                    await self.page.click('text="This cargo requires temperature control" >> .. >> input[type="checkbox"]', timeout=3000)
            except:
                logger.warning("Could not select temperature control")
            
            try:
                if booking.is_dangerous_cargo:
                    logger.info("Selecting dangerous cargo...")
                    await self.page.click('text="This cargo is considered dangerous" >> .. >> input[type="checkbox"]', timeout=3000)
            except:
                logger.warning("Could not select dangerous cargo")
                
            logger.info("Successfully filled basic booking form details")
            
            # Take screenshot of filled form
            await self.page.screenshot(path="debug_form_filled.png")
            
            logger.info("Booking form filling completed")
            
        except Exception as e:
            logger.error(f"Failed to fill booking form: {str(e)}")
            # Take error screenshot
            await self.page.screenshot(path="error_booking_form.png")
            raise 

    async def manual_login(self):
        """Allow manual login by pausing the automation with enhanced error handling"""
        try:
            logger.info("Navigating to Maersk booking page...")
            await self.page.goto("https://www.maersk.com/book/")
            
            # Enhanced page ready detection
            await self.wait_for_page_ready()
            
            # Handle any authentication errors that might appear immediately
            auth_error_detected = await self.handle_authentication_errors()
            if auth_error_detected:
                logger.info("Handled authentication error, proceeding...")
            
            # Accept cookies first
            await self.accept_cookies()
            
            # Take screenshot to show current state
            await self.page.screenshot(path="debug_manual_login_start.png")
            
            # Check if we're redirected to login page
            current_url = self.page.url
            logger.info(f"Current URL after navigation: {current_url}")
            
            if "accounts.maersk.com" in current_url:
                logger.info("Redirected to accounts.maersk.com login page")
                
                # Handle the login page specifically
                logger.info("="*60)
                logger.info("🔐 LOGIN PAGE DETECTED")
                logger.info("="*60)
                logger.info("You are on the Maersk login page.")
                logger.info("Please complete the following steps:")
                logger.info("1. Enter your username and password")
                logger.info("2. Handle any 2FA or additional verification")
                logger.info("3. Wait for successful authentication and redirect")
                logger.info("4. Press ENTER in this terminal when you reach the booking page...")
                logger.info("="*60)
                
                # Monitor for page changes during login
                page_changed = False
                retry_count = 0
                max_retries = 3
                
                while not page_changed and retry_count < max_retries:
                    # Wait for user input with timeout
                    input("Press ENTER when you have successfully logged in and are on the booking page...")
                    
                    # Check if page has changed
                    new_url = self.page.url
                    logger.info(f"Current URL after login attempt: {new_url}")
                    
                    if new_url != current_url and "accounts.maersk.com" not in new_url:
                        page_changed = True
                        logger.info("✅ Page change detected - login appears successful!")
                    else:
                        # Check for authentication errors
                        auth_error = await self.handle_authentication_errors()
                        if auth_error:
                            logger.warning("Authentication error detected. Please try again.")
                            retry_count += 1
                        else:
                            logger.warning("Still on login page. Please ensure login is complete.")
                            retry_count += 1
                    
                    if retry_count >= max_retries:
                        logger.error("Maximum retry attempts reached. Please check your credentials.")
                        return False
                        
            else:
                logger.info("="*60)
                logger.info("🛑 MANUAL LOGIN REQUIRED")
                logger.info("="*60)
                logger.info("Please complete the following steps:")
                logger.info("1. Log in manually using your credentials")
                logger.info("2. Handle any 2FA or additional verification")
                logger.info("3. Wait until you reach the booking page")
                logger.info("4. Press ENTER in this terminal when ready to continue...")
                logger.info("="*60)
                
                # Wait for user input
                input("Press ENTER when you have successfully logged in and are on the booking page...")
            
            # Take screenshot after manual login
            await self.page.screenshot(path="debug_after_manual_login.png")
            
            # Enhanced verification of login success
            await self.wait_for_page_ready()
            
            # Check for any remaining authentication errors
            final_auth_check = await self.handle_authentication_errors()
            if final_auth_check:
                logger.warning("Authentication errors still present after login")
            
            # Check current state
            current_url = self.page.url
            page_title = await self.page.title()
            
            logger.info(f"Current URL: {current_url}")
            logger.info(f"Page title: {page_title}")
            
            # Navigate to booking page if not already there
            if "book" not in current_url.lower():
                logger.info("Navigating to booking page...")
                await self.page.goto("https://www.maersk.com/book/")
                await self.wait_for_page_ready()
                
                # Check for errors after navigation
                nav_error = await self.handle_authentication_errors()
                if nav_error:
                    logger.warning("Authentication error after navigation to booking page")
            
            # Handle any modal popups
            await self.handle_modal_popup()
            
            # Final verification
            final_url = self.page.url
            logger.info(f"Final URL: {final_url}")
            
            # More comprehensive success check
            if "maersk.com" in final_url and "accounts.maersk.com" not in final_url:
                # Additional check for successful page load
                success_indicators = [
                    'text="Your booking details"',
                    'text="From (City, Country/Region)"',
                    'text="To (City, Country/Region)"',
                    'input[placeholder="Enter city or port"]',
                    'text="Location details"'
                ]
                
                indicators_found = 0
                for indicator in success_indicators:
                    try:
                        await self.page.wait_for_selector(indicator, timeout=2000)
                        indicators_found += 1
                    except:
                        continue
                
                if indicators_found > 0:
                    logger.info(f"✅ Manual login completed successfully! Found {indicators_found} booking page indicators.")
                    return True
                else:
                    logger.warning("⚠️ On maersk.com domain but booking page elements not found")
                    await self.page.screenshot(path="debug_login_success_but_no_elements.png")
                    return True  # Still consider it successful if on main domain
            else:
                logger.warning("⚠️ Still not on maersk.com domain - please check")
                await self.page.screenshot(path="debug_login_failed.png")
                return False
                
        except Exception as e:
            logger.error(f"Error during manual login: {str(e)}")
            await self.page.screenshot(path="error_manual_login.png")
            raise 

    async def hybrid_login(self):
        """Hybrid login that attempts automated login first, then falls back to manual if needed"""
        try:
            logger.info("🔄 Attempting automated login first...")
            await self.login()
            logger.info("✅ Automated login successful!")
            return True
        except Exception as auto_login_error:
            logger.warning(f"Automated login failed: {str(auto_login_error)}")
            
            # Check if it's a credential or 2FA issue
            if "error detected" in str(auto_login_error).lower() or "2fa" in str(auto_login_error).lower():
                logger.info("🔄 Falling back to manual login...")
                logger.info("This might be due to:")
                logger.info("- Incorrect credentials in .env file")
                logger.info("- 2FA/MFA requirement")
                logger.info("- Security measures triggered by automation")
                logger.info("- Login page structure changes")
                
                try:
                    # Ensure browser is still ready for manual login
                    await self._ensure_browser_ready()
                    
                    # Navigate to login page for manual process
                    await self.page.goto("https://www.maersk.com/book/")
                    await self.wait_for_page_ready()
                    
                    # Use the manual login process
                    manual_success = await self.manual_login()
                    if manual_success:
                        logger.info("✅ Manual login successful!")
                        return True
                    else:
                        logger.error("❌ Manual login also failed")
                        return False
                        
                except Exception as manual_error:
                    logger.error(f"Manual login fallback also failed: {str(manual_error)}")
                    raise auto_login_error  # Raise the original error
            else:
                # Re-raise if it's not a credential/2FA issue
                raise auto_login_error 