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
    """Main function to test Maersk automation"""
    try:
        # Configure logging
        logger.add("logs/automation.log", rotation="10 MB")
        
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
        
        # Initialize carrier
        logger.info("Initializing Maersk carrier...")
        carrier = MaerskCarrier()
        
        # Start automation
        logger.info("Starting browser automation...")
        await carrier.init_browser(headless=False)
        
        # Login
        logger.info("Attempting login...")
        await carrier.login()
        
        logger.info("Login completed successfully!")
        
        # Temporarily comment out booking steps to test login
        # await carrier.navigate_to_booking()
        # await carrier.fill_booking_form(booking)
        
        # Keep browser open for inspection
        logger.info("Keeping browser open for inspection. Press Ctrl+C to close.")
        await asyncio.sleep(30)  # Keep browser open for 30 seconds
        
        # Close browser
        await carrier.close()
        
        logger.info("Automation completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during automation: {str(e)}")
        raise

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main()) 