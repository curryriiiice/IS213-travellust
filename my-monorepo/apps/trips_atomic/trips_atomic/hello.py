"""Sample Hello World application."""
from flask import Flask

app = Flask(__name__)


@app.route("/")
def hello():
    """Return a friendly greeting."""
    return "Hello trips_atomic"


if __name__ == "__main__":
    app.run(debug=True)
