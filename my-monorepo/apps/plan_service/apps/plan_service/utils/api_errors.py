class ExternalServiceError(Exception):
    """Raised when external service call fails"""

    def __init__(self, message: str, status_code: int = 502):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(Exception):
    """Raised when request validation fails"""

    def __init__(self, message: str):
        self.message = message
        self.status_code = 400
        super().__init__(self.message)


class NotFoundError(Exception):
    """Raised when requested resource is not found"""

    def __init__(self, message: str):
        self.message = message
        self.status_code = 404
        super().__init__(self.message)


class ServiceUnavailableError(Exception):
    """Raised when a required service is unavailable"""

    def __init__(self, message: str):
        self.message = message
        self.status_code = 503
        super().__init__(self.message)


class InternalServerError(Exception):
    """Raised when an internal server error occurs"""

    def __init__(self, message: str):
        self.message = message
        self.status_code = 500
        super().__init__(self.message)
