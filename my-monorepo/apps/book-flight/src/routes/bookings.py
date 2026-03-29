from flask import Blueprint, request, jsonify
from ..services.booking_service import BookingService
from ..utils.api_errors import ExternalServiceError, BookingError

bookings_bp = Blueprint('bookings', __name__)


@bookings_bp.route('/api/bookflight', methods=['POST'])
def book_flight():
    """
    Book a flight for multiple users

    Body:
        - trip_id: str
        - user_id: str (the main booking user)
        - user_ids: List[str] (array of ticket holders' user_ids)
        - flight_id: str

    Returns:
        Success or error message
    """
    try:
        data = request.get_json()
        service = BookingService()
        result = service.book_flight(
            trip_id=data['trip_id'],
            user_id=data['user_id'],
            user_ids=data['user_ids'],
            flight_id=data['flight_id']
        )
        return jsonify(result), 200
    except KeyError as e:
        return jsonify({'success': False, 'error': f'Missing required field: {str(e)}'}), 400
    except BookingError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except ExternalServiceError as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
