"""Test hello function for book-hotels microservice."""
from book_hotels.hello import hello


def test_hello():
    """Test that hello returns the expected greeting."""
    assert hello() == "Hello book-hotels"
