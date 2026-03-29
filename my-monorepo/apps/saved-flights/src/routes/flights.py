from flask import Blueprint, request, jsonify
from ..services.flight_service import FlightService
from ..utils.validators import validate_flight_data, validate_flight_id
from ..utils.api_errors import APIError
from ..logging_config import get_logger
from ..utils.redis_publisher import publish_event

flights_bp = Blueprint('flights', __name__)
logger = get_logger(__name__)


@flights_bp.route('/api/flights', methods=['POST'])
def create_flight():
    """
    POST /api/flights
    Body: { flight_number, airline, datetime_departure, datetime_arrival,
            external_link, trip_id, user_id, cost }
    Returns: { success: true, data: flight_id }
    """
    try:
        data = request.get_json()
        logger.info(f"Creating flight: {data['flight_number']} for trip {data['trip_id']}")
        validate_flight_data(data)

        service = FlightService()
        flight_id = service.create_flight(data)

        logger.info(f"Flight created successfully with ID: {flight_id}")

        publish_event(
            trip_id=data.get('trip_id'),
            event_type='FLIGHT_ADDED',
            data={**data, 'flight_id': flight_id},
            user_id=data.get('user_id')

        )
        return jsonify({'success': True, 'data': {'flight_id': flight_id}}), 201
    except ValueError as e:
        logger.warning(f"Validation error creating flight: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected error creating flight: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/<string:flight_id>', methods=['GET'])
def get_flight(flight_id):
    """
    GET /api/flights/<flight_id>
    Returns: Flight details or 404
    """
    try:
        logger.debug(f"Fetching flight with ID: {flight_id}")
        validate_flight_id(flight_id)

        service = FlightService()
        flight = service.get_flight(flight_id)

        logger.info(f"Successfully retrieved flight {flight_id}")
        return jsonify({'success': True, 'data': flight}), 200
    except ValueError as e:
        logger.warning(f"Validation error fetching flight {flight_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            logger.info(f"Flight {flight_id} not found")
            return jsonify({'success': False, 'error': error_msg}), 404
        logger.error(f"Unexpected error fetching flight {flight_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights', methods=['GET'])
def get_flights():
    """
    GET /api/flights?trip_id=<id>
    Returns: List of flights for a trip or all flights
    """
    try:
        trip_id = request.args.get('trip_id', type=str)

        service = FlightService()

        if trip_id:
            flights = service.get_flights_by_trip(trip_id)
        else:
            flights = service.get_all_flights()

        return jsonify({
            'success': True,
            'data': flights,
            'count': len(flights)
        }), 200
    except Exception as e:
        logger.error(f"Unexpected error getting flights: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/<string:flight_id>', methods=['DELETE'])
def delete_flight(flight_id):
    """
    DELETE /api/flights/<flight_id>
    Returns: { success: true, message }
    """
    try:
        validate_flight_id(flight_id)

        service = FlightService()
        service.delete_flight(flight_id)

        return jsonify({'success': True, 'message': 'Flight deleted successfully'}), 200
    except ValueError as e:
        logger.warning(f"Validation error deleting flight {flight_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            logger.info(f"Flight {flight_id} not found for deletion")
            return jsonify({'success': False, 'error': error_msg}), 404
        logger.error(f"Unexpected error deleting flight {flight_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/delete', methods=['POST'])
def soft_delete_flight():
    """
    POST /api/flights/delete
    Body: { flight_id }
    Returns: { flight_id }
    """
    try:
        data = request.get_json()
        logger.info(f"Soft delete request for flight: {data.get('flight_id')}")

        flight_id = data.get('flight_id')
        if not flight_id:
            logger.warning("Missing flight_id in delete request")
            return jsonify({'success': False, 'error': 'flight_id is required'}), 400

        service = FlightService()
        result_id = service.soft_delete_flight(flight_id)

        logger.info(f"Flight {result_id} soft deleted successfully")
        return jsonify({'flight_id': result_id}), 200
    except Exception as e:
        error_msg = str(e)
        logger.warning(f"Error soft deleting flight: {error_msg}")
        # Return specific error messages as requested
        if "does not exist" in error_msg.lower():
            return jsonify({'success': False, 'error': 'flight_id does not exist'}), 404
        if "already been deleted" in error_msg.lower():
            return jsonify({'success': False, 'error': 'flight has already been deleted'}), 400
        logger.error(f"Unexpected error soft deleting flight: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@flights_bp.route('/api/flights/update', methods=['POST'])
def update_flight():
    """
    POST /api/flights/update
    Body: { flight_details: {...}, trip_id: ..., cost: ..., flight_id: ... }
    Returns: { success: true, data: flight_details }
    """
    try:
        data = request.get_json()
        logger.info(f"Update request for flight: {data.get('flight_id')}")

        flight_id = data.get('flight_id')
        if not flight_id:
            logger.warning("Missing flight_id in update request")
            return jsonify({'success': False, 'error': 'flight_id is required'}), 400

        # Flatten the nested structure
        flight_details = data.get('flight_details', {})
        update_data = {}

        # Add flight_details fields
        if 'flight_number' in flight_details:
            update_data['flight_number'] = flight_details['flight_number']
        if 'airline' in flight_details:
            update_data['airline'] = flight_details['airline']
        if 'datetime_departure' in flight_details:
            update_data['datetime_departure'] = flight_details['datetime_departure']
        if 'datetime_arrival' in flight_details:
            update_data['datetime_arrival'] = flight_details['datetime_arrival']
        if 'external_link' in flight_details:
            update_data['external_link'] = flight_details['external_link']

        # Add trip_id and cost if provided
        if 'trip_id' in data:
            update_data['trip_id'] = data['trip_id']
        if 'cost' in data:
            update_data['cost'] = data['cost']

        service = FlightService()
        flight = service.update_flight_with_validation(flight_id, update_data)

        logger.info(f"Flight {flight_id} updated successfully")
        return jsonify({'success': True, 'data': flight}), 200
    except Exception as e:
        error_msg = str(e)
        logger.warning(f"Error updating flight: {error_msg}")
        # Return specific error messages as requested
        if "does not exist" in error_msg.lower():
            return jsonify({'success': False, 'error': 'flight_id does not exist'}), 404
        if "already been deleted" in error_msg.lower():
            return jsonify({'success': False, 'error': 'flight has already been deleted'}), 400
        if "at least one field must updated" in error_msg.lower():
            return jsonify({'success': False, 'error': 'at least one field must updated'}), 400
        logger.error(f"Unexpected error updating flight: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
