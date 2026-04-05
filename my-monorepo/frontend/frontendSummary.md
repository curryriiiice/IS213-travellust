TravelLust Frontend Codebase Structure
This document provides a summary of the frontend architecture and key files to help future AI assistants navigate the codebase efficiently.

Core Hierarchy
src/pages/: Higher-order route components and primary views.
src/components/: Feature-specific UI components and modular blocks.
src/data/: Data fetching logic, API mappers, and mock data.
src/contexts/: React Context providers for global state (e.g., Bookings).
📄 src/pages/ (Main Views & Routing)
Landing.tsx: The main hero page. Contains the primary call-to-actions and the initial minimal inline search forms.
SearchResults.tsx: The dedicated search page for querying and filtering Flights, Hotels, and Attractions. Contains the complex result grid cards and multi-column layouts.
Index.tsx: The dynamic view for an active trip itinerary. Displays the core timeline, ledger, and interactive map via embedded sub-components.
ItemDetail.tsx: A full-page breakdown for a specific item (Flight, Hotel) providing deep details before proceeding to booking.
Booking.tsx: The checkout and payment flow containing passenger details forms and the final confirmation step.
BookedTickets.tsx: The dashboard showing successful bookings and confirmed tickets.
Profile.tsx: User profile configuration and settings.
🧩 src/components/ (Feature Modules)
Search & Drawers
FlightSearchPanel.tsx: A slide-out panel used across the app to query for flights outside the main SearchResults view.
HotelSearchPanel.tsx: The equivalent slide-out panel for querying hotels.
DetailPane.tsx: An overlay drawer component used for previewing item details.
Trip Display (Used heavily in Index.tsx)
TripCommandCenter.tsx: The interactive workspace for a trip, housing the chat interface, map, and timeline.
TimelineNode.tsx: Individual block components representing an event (e.g., flight, hotel stay, activity) on the trip timeline.
TripCard.tsx: The summary card representing a whole trip in list views (e.g., "My Trips").
Auxiliary Systems
LedgerPane.tsx: The expense splitter and shared ledger interface for dividing costs among collaborators.
BudgetBar.tsx: A financial progress bar component.
DisruptionBanner.tsx: Warning banners for flight delays or schedule conflicts.
CollaboratorAvatars.tsx: Displays active users collaborating on an itinerary.
💾 src/data/ (Business Logic & APIs)
flightData.ts: Contains searchFlights logic mapping pure backend API responses to UI FlightOffer types. Crucially handles timezone translations using specific offsets rather than local browser metrics.
hotelData.ts / attractionData.ts: Contains data contracts and mock returns for hotels and attractions respectively.
mockData.ts: Hardcoded legacy trips and testing objects.
Key Design Patterns to Note
Timezone Safety: Flight logic specifically utilizes pure UTC epochs across regions instead of the Date object due to local browser timezone contamination.
Styling: tailwind + shadcn/ui (housed in src/components/ui/).
Interactive UI: Heavy usage of framer-motion for shared layout transitions and lucide-react for iconography.
TIP

When modifying the "Search" experience, make sure to check both SearchResults.tsx and the corresponding \*SearchPanel.tsx to maintain consistency, as inputs are sometimes duplicated across the dedicated page and the slide-out drawers.
