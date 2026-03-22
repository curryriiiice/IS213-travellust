# ============================================
# # Hotel Search Wrapper Examples
# # ============================================

# def example_basic_search():
#     """Basic hotel search example."""
#     results = hotel_search_service.search_hotels(
#         query="Bali Resorts",
#         check_in_date="2026-03-20",
#         check_out_date="2026-03-21",
#     )
#     print("Basic Search Results:")
#     print(results)
#     return results


# def example_search_with_filters():
#     """Hotel search with sorting and rating filters example."""
#     results = hotel_search_service.search_hotels(
#         query="Marina Bay Sands",
#         check_in_date="2026-04-01",
#         check_out_date="2026-04-03",
#         adults=2,
#         children=1,
#         currency="SGD",
#         gl="sg",
#         hl="en",
#         sort_by=3,  # Lowest price
#         rating=8,  # 4.0+ rating
#     )
#     print("\nSearch with Filters Results:")
#     print(results)
#     return results


# def example_search_by_price():
#     """Search hotels sorted by lowest price."""
#     results = hotel_search_service.search_hotels(
#         query="Singapore Hotels",
#         check_in_date="2026-04-10",
#         check_out_date="2026-04-12",
#         sort_by=3,  # Lowest price
#     )
#     print("\nLowest Price Search Results:")
#     print(results)
#     return results


# def example_search_by_rating():
#     """Search hotels sorted by highest rating."""
#     results = hotel_search_service.search_hotels(
#         query="Singapore Hotels",
#         check_in_date="2026-04-10",
#         check_out_date="2026-04-12",
#         sort_by=8,  # Highest rating
#     )
#     print("\nHighest Rating Search Results:")
#     print(results)
#     return results


# def example_search_by_most_reviewed():
#     """Search hotels sorted by most reviewed."""
#     results = hotel_search_service.search_hotels(
#         query="Singapore Hotels",
#         check_in_date="2026-04-10",
#         check_out_date="2026-04-12",
#         sort_by=13,  # Most reviewed
#     )
#     print("\nMost Reviewed Search Results:")
#     print(results)
#     return results


# def example_search_with_rating_filter():
#     """Search hotels with 4.5+ rating filter."""
#     results = hotel_search_service.search_hotels(
#         query="Singapore Hotels",
#         check_in_date="2026-04-10",
#         check_out_date="2026-04-12",
#         rating=9,  # 4.5+ rating
#     )
#     print("\nHigh Rating Filter Search Results:")
#     print(results)
#     return results


# def example_hotel_search_health_check():
#     """Check if the hotel search service is running."""
#     status = hotel_search_service.health_check()
#     print(f"\nHotel Search Health Check: {status}")
#     return status
