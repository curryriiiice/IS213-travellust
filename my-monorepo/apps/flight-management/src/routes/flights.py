from flask import Blueprint, request, jsonify
from ..services.flight_search_service import FlightSearchService
from ..services.flight_save_service import FlightSaveService
from ..services.flight_booking_service import FlightBookingService
from ..services.flight_get_service import FlightGetService
from ..services.flight_delete_service import FlightDeleteService
from ..services.flight_update_service import FlightUpdateService
from ..utils.api_errors import ExternalServiceError

flights_bp = Blueprint('flights', __name__)


@flights_bp.route('/api/flights/search', methods=['POST'])
def search_flights():
    """
    Use case (i): Search flights
    Body: { origin, destination, datetime_departure }
    Returns: The full response from flight-search-wrapper
    """
    try:
        data = request.get_json()
        service = FlightSearchService()
        results = service.search_flights(
            origin=data['origin'],
            destination=data['destination'],
            datetime_departure=data['datetime_departure']
        )
        return jsonify(results), 200
    except KeyError as e:
        return jsonify({'success': False, 'error': f'Missing required field: {str(e)}'}), 400
    except ExternalServiceError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/save', methods=['POST'])
def save_flight():
    """
    Use case (ii): Save flight
    Body: { flight_details..., trip_id, cost }
    Returns: Full response from saved-flights
    """
    try:
        data = request.get_json()
        service = FlightSaveService()
        result = service.save_flight(data)
        return jsonify(result), 201
    except ExternalServiceError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/book', methods=['POST'])
def book_flight():
    """
    Use case (iii): Book flight
    Body: { flight_id }
    Returns: { success: true, data: flight_id }
    """
    try:
        data = request.get_json()
        service = FlightBookingService()
        flight_id = service.book_flight(data['flight_id'])
        return jsonify({'success': True, 'data': {'flight_id': flight_id}}), 200
    except KeyError as e:
        return jsonify({'success': False, 'error': f'Missing required field: {str(e)}'}), 400
    except ExternalServiceError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/<string:flight_id>', methods=['GET'])
def get_flight(flight_id):
    """
    Get saved flight details by ID
    Returns: { success: true, data: flight_details }
    """
    try:
        service = FlightGetService()
        flight_data = service.get_flight(flight_id)
        return jsonify({'success': True, 'data': flight_data}), 200
    except ExternalServiceError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/delete', methods=['POST'])
def delete_flight():
    """
    Delete (soft delete) a flight
    Body: { flight_id }
    Returns: { flight_id }
    """
    try:
        data = request.get_json()
        service = FlightDeleteService()
        result = service.delete_flight(data)
        return jsonify(result), 200
    except KeyError as e:
        return jsonify({'success': False, 'error': f'Missing required field: {str(e)}'}), 400
    except ExternalServiceError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/update', methods=['POST'])
def update_flight():
    """
    Update a flight
    Body: { flight_details: {...}, trip_id: ..., cost: ..., flight_id: ... }
    Returns: { success: true, data: flight_details }
    """
    try:
        data = request.get_json()
        service = FlightUpdateService()
        result = service.update_flight(data)
        return jsonify(result), 200
    except KeyError as e:
        return jsonify({'success': False, 'error': f'Missing required field: {str(e)}'}), 400
    except ExternalServiceError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
