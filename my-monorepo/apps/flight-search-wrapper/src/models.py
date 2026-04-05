from dataclasses import dataclass
from typing import Optional


@dataclass
class Flight:
    flight_number: str
    airline: str
    datetime_departure: str
    datetime_arrival: str
    price_usd: float
    price_sgd: float
    currency: str
    external_link: str = ""
    aircraft_type: Optional[str] = None
    legroom: Optional[str] = None
    co2_kg: Optional[float] = None
    origin: Optional[str] = None
    destination: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response"""
        return {
            'flight_number': self.flight_number,
            'airline': self.airline,
            'datetime_departure': self.datetime_departure,
            'datetime_arrival': self.datetime_arrival,
            'price_usd': self.price_usd,
            'price_sgd': self.price_sgd,
            'currency': self.currency,
            'external_link': self.external_link,
            'aircraft_type': self.aircraft_type,
            'legroom': self.legroom,
            'co2_kg': self.co2_kg,
            'origin': self.origin,
            'destination': self.destination
        }
