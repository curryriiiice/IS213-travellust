"""Hello unit test module."""

from apps/plan_service.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello apps/plan_service"
