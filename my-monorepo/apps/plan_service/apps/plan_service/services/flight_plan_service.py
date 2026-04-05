from typing import Dict
from ..clients.flight_management_client import FlightManagementClient
from ..config import Config


class FlightPlanService:
    """Business logic for flight planning operations"""

    def __init__(self, config: Config = None):
        if config is None:
            config = Config()
        self.flight_mgmt_client = FlightManagementClient(config)

    def save_flight(self, data: Dict) -> int:
        """
        Save a flight via flight-management service

        Args:
            data: Flight data with all required fields

        Returns:
            flight_id (int)

        Raises:
            ExternalServiceError: If downstream service fails
        """
        print(f"📥 Received data in FlightPlanService: {data}")
        print(f"🔍 Origin: {data.get('origin')}, Destination: {data.get('destination')}")
        # Future: Add validation logic here if needed
        # For now, delegate directly to flight-management
        return self.flight_mgmt_client.save_flight(data)
