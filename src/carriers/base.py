from abc import ABC, abstractmethod
from playwright.async_api import Page, Browser, BrowserContext, async_playwright
from loguru import logger
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class BaseCarrier(ABC):
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
    async def init_browser(self, headless: bool = False):
        """Initialize the browser instance with enhanced Chromium compatibility"""
        playwright = await async_playwright().start()
        
        # Enhanced browser args for better compatibility with authentication systems
        browser_args = [
            '--start-maximized',
            '--disable-blink-features=AutomationControlled',  # Hide automation detection
            '--disable-features=VizDisplayCompositor',
            '--disable-web-security',  # Disable same-origin policy
            '--disable-features=BlockThirdPartyCookies',  # Allow third-party cookies
            '--disable-site-isolation-trials',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',  # Helps with some authentication systems
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
        ]
        
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=browser_args
        )
        
        # Create browser context with enhanced settings
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            accept_downloads=True,
            has_touch=False,
            is_mobile=False,
            locale='en-US',
            timezone_id='America/New_York',
            extra_http_headers={
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                'Cache-Control': 'max-age=0'
            }
        )
        
        # Enable permission for notifications, geolocation, etc.
        await self.context.grant_permissions(['notifications', 'geolocation'])
        
        self.page = await self.context.new_page()
        
        # Inject scripts to hide automation indicators
        await self.page.add_init_script("""
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Mock chrome property
            window.chrome = {
                runtime: {},
            };
            
            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Hide automation detection
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        """)
        
    async def close(self):
        """Close browser and cleanup"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
        except Exception as e:
            logger.warning(f"Error during cleanup: {str(e)}")
        
    async def wait_and_click(self, selector: str, timeout: int = 5000):
        """Wait for element and click"""
        await self.page.wait_for_selector(selector, timeout=timeout)
        await self.page.click(selector)
        
    async def wait_and_fill(self, selector: str, value: str, timeout: int = 5000):
        """Wait for element and fill"""
        await self.page.wait_for_selector(selector, timeout=timeout)
        await self.page.fill(selector, value)
        
    async def wait_for_navigation(self, timeout: int = 30000):
        """Wait for navigation to complete"""
        await self.page.wait_for_load_state('networkidle', timeout=timeout)
        
    async def wait_for_element_state(self, selector: str, state: str = 'visible', timeout: int = 5000):
        """Wait for element to reach a specific state"""
        element = await self.page.wait_for_selector(selector, timeout=timeout)
        await element.wait_for_element_state(state, timeout=timeout)
        return element
    
    @abstractmethod
    async def login(self):
        """Login to carrier portal"""
        pass
        
    @abstractmethod
    async def navigate_to_booking(self):
        """Navigate to booking page"""
        pass
        
    @abstractmethod
    async def fill_booking_form(self, booking_details):
        """Fill the booking form"""
        pass