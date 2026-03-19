"""Hello unit test module."""

from trips_atomic.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello trips_atomic"
