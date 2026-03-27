from flask import Blueprint, request, jsonify
from ..services.flight_search_service import FlightSearchService
from ..utils.validators import validate_flight_search_params
from ..utils.api_errors import ExternalAPIError

flights_bp = Blueprint('flights', __name__)


@flights_bp.route('/api/flights/search', methods=['POST'])
def search_flights():
    """
    POST /api/flights/search
    Body: { origin, destination, datetime_departure }
    Returns: List of flight details
    """
    try:
        data = request.get_json()
        validate_flight_search_params(data)

        service = FlightSearchService()
        results = service.search_flights(
            origin=data['origin'],
            destination=data['destination'],
            datetime_departure=data['datetime_departure']
        )

        return jsonify({
            'success': True,
            'data': [flight.to_dict() for flight in results],
            'count': len(results)
        }), 200

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except ExternalAPIError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
