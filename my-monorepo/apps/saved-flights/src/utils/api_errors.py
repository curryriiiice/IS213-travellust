class APIError(Exception):
    """Base API error"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class InvalidInputError(APIError):
    """Invalid input error"""
    def __init__(self, message: str):
        super().__init__(message, 400)


class NotFoundError(APIError):
    """Resource not found error"""
    def __init__(self, message: str):
        super().__init__(message, 404)
