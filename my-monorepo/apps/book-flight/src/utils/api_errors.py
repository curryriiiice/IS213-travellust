class APIError(Exception):
    """Base API error"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ExternalServiceError(APIError):
    """External service error"""
    def __init__(self, message: str):
        super().__init__(message, 502)


class BookingError(APIError):
    """Booking error"""
    def __init__(self, message: str):
        super().__init__(message, 400)
