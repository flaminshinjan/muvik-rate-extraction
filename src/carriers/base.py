from abc import ABC, abstractmethod
from playwright.async_api import Page, Browser, async_playwright
from loguru import logger
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class BaseCarrier(ABC):
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        
    async def init_browser(self, headless: bool = False):
        """Initialize the browser instance"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=['--start-maximized']
        )
        self.page = await self.browser.new_page(
            viewport={'width': 1920, 'height': 1080}
        )
        
    async def close(self):
        """Close browser and cleanup"""
        if self.browser:
            await self.browser.close()
            
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