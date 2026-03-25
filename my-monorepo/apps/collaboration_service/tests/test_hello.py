"""Hello unit test module."""

from apps/collaboration_service.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello apps/collaboration_service"
