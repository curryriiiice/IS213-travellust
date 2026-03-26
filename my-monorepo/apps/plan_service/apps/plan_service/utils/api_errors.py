class ExternalServiceError(Exception):
    """Raised when external service call fails"""

    def __init__(self, message: str, status_code: int = 502):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)
