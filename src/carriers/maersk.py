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
        
    async def login(self):
        """Login to Maersk portal"""
        try:
            await self.page.goto(f"{self.base_url}/book/")
            
            # Wait for and click login button (try different selectors)
            try:
                await self.wait_and_click('button[data-testid="login-button"]', timeout=10000)
            except:
                try:
                    await self.wait_and_click('button:has-text("Log in")', timeout=10000)
                except:
                    await self.wait_and_click('a[href*="login"]', timeout=10000)
            
            # Wait for login form
            await self.page.wait_for_selector('form', timeout=10000)
            
            # Fill login form
            await self.wait_and_fill('input[name="username"]', self.username, timeout=10000)
            await self.wait_and_fill('input[name="password"]', self.password, timeout=10000)
            
            # Click login submit button
            await self.wait_and_click('button[type="submit"]', timeout=10000)
            
            # Wait for successful login (try different indicators)
            try:
                await self.page.wait_for_selector('.user-menu', timeout=20000)
            except:
                try:
                    await self.page.wait_for_selector('[data-testid="user-menu"]', timeout=20000)
                except:
                    await self.page.wait_for_selector('button:has-text("My Account")', timeout=20000)
                    
            logger.info("Successfully logged into Maersk portal")
            
        except Exception as e:
            logger.error(f"Failed to login to Maersk portal: {str(e)}")
            raise
            
    async def navigate_to_booking(self):
        """Navigate to booking page"""
        try:
            await self.page.goto(f"{self.base_url}/book/")
            await self.page.wait_for_selector('input[placeholder="Enter city or port"]', timeout=10000)
            logger.info("Successfully navigated to booking page")
        except Exception as e:
            logger.error(f"Failed to navigate to booking page: {str(e)}")
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
            raise 