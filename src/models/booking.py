from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class Location(BaseModel):
    city: str
    country: str
    is_port: bool = False
    
class InlandTransport(BaseModel):
    type: str = Field(..., description="CY (Customer Yard) or SD (Store Door)")
    is_pickup: bool
    
class Container(BaseModel):
    type: str
    size: str
    quantity: int = 1
    weight_kg: float
    
class BookingDetails(BaseModel):
    origin: Location
    destination: Location
    origin_transport: InlandTransport
    destination_transport: InlandTransport
    commodity: str
    requires_temperature_control: bool = False
    is_dangerous_cargo: bool = False
    containers: List[Container]
    ready_date: datetime
    is_price_owner: bool = True 