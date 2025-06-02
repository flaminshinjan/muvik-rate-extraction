import asyncio
import os
import sys
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.carriers.maersk import MaerskCarrier
from src.models.booking import BookingDetails, Location, InlandTransport, Container

async def main():
    # Sample booking details
    booking = BookingDetails(
        origin=Location(
            city="Mumbai",
            country="India",
            is_port=True
        ),
        destination=Location(
            city="Rotterdam",
            country="Netherlands",
            is_port=True
        ),
        origin_transport=InlandTransport(
            type="CY",
            is_pickup=False
        ),
        destination_transport=InlandTransport(
            type="CY",
            is_pickup=False
        ),
        commodity="Electronics",
        requires_temperature_control=False,
        is_dangerous_cargo=False,
        containers=[
            Container(
                type="Standard",
                size="40",
                quantity=1,
                weight_kg=1000
            )
        ],
        ready_date=datetime.now(),
        is_price_owner=True
    )
    
    try:
        carrier = MaerskCarrier()
        await carrier.init_browser(headless=False)
        
        # Login to portal
        await carrier.login()
        
        # Navigate to booking page
        await carrier.navigate_to_booking()
        
        # Fill booking form
        await carrier.fill_booking_form(booking)
        
        # Wait for user to verify
        input("Press Enter to close the browser...")
        
    except Exception as e:
        logger.error(f"Error during automation: {str(e)}")
        raise
    finally:
        await carrier.close()

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main()) 