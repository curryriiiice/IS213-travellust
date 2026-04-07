# Implementation Plan: Frontend Search Operations via Plan Service

## Overview
Convert frontend search operations to route through the plan service instead of directly calling downstream services. This creates a consistent architectural pattern where all trip planning operations (search, save, update, delete) flow through the plan service.

## Current Architecture
```
Frontend → /api/flights/search → flight-management (port 5005)
Frontend → /api/hotel-management/search → hotel-management (port 5009)
Frontend → /api/plan/* → plan service (port 5011) → downstream services
```

## Target Architecture
```
Frontend → /api/plan/flights/search → plan service → flight-management
Frontend → /api/plan/hotels/search → plan service → hotel-management
Frontend → /api/plan/* (save/update/delete) → plan service → downstream services
```

## Benefits
1. **Consistent routing**: All trip planning operations go through one service
2. **Centralized error handling**: Standardized error responses and logging
3. **Easier monitoring**: Single point to track all trip planning activities
4. **Future flexibility**: Easy to add caching, rate limiting, or request transformation at the gateway level
5. **Simplified frontend**: Consistent API patterns across all operations

## Implementation Tasks

### Phase 1: Flight Search Migration

#### Task 1.1: Analyze Current Flight Search Implementation
**File**: `frontend/src/data/flightData.ts`

**Current Implementation Analysis**:
- Function: `searchFlights(origin, destination, date)`
- Endpoint: `/api/flights/search`
- Payload structure:
  ```json
  {
    "origin": "SIN",
    "destination": "HKG", 
    "datetime_departure": "2026-04-15T00:00:00+08:00"
  }
  ```
- Response structure:
  ```json
  {
    "count": 10,
    "data": [...],
    "success": true
  }
  ```

**Plan Service Implementation Analysis**:
- Endpoint: `/api/plan/flights/search`
- Expected payload:
  ```json
  {
    "origin": "SIN",
    "destination": "HKG",
    "departure_date": "2026-04-15",
    "return_date": "2026-04-20",      // Optional
    "adults": 2,                       // Optional, default 1
    "children": 0,                      // Optional, default 0  
    "cabin_class": "economy",           // Optional
    "currency": "SGD"                    // Optional, default USD
  }
  ```
- Response structure:
  ```json
  {
    "success": true,
    "data": {
      "flights": [...],
      "search_metadata": {...}
    }
  }
  ```

#### Task 1.2: Update Flight Search Function
**File**: `frontend/src/data/flightData.ts`

**Changes Required**:
1. Change endpoint from `/api/flights/search` to `/api/plan/flights/search`
2. Update payload structure:
   - Change `datetime_departure` to `departure_date`
   - Extract date from ISO string (format: "YYYY-MM-DD")
   - Add optional fields for completeness
3. Update response parsing:
   - Access `data.data.flights` instead of `data.data`
   - Handle new response structure
4. Update error handling to match plan service error format

**Implementation**:
```typescript
export async function searchFlights(
  origin: string,
  destination: string,
  date: string
): Promise<FlightOffer[]> {
  console.log("searchFlights called with:", origin, destination, date);

  const payload = {
    origin,
    destination,
    departure_date: date, // Already in YYYY-MM-DD format
    adults: 1,            // Default to 1 passenger
    currency: "SGD",      // Default to SGD
  };

  const response = await fetch("/api/plan/flights/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to search flights: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error("API returned unsuccessful response");
  }

  // Plan service returns { data: { flights: [...] } }
  const flights = data.data?.flights || [];
  return flights.map((flight) => mapApiFlightToOffer(flight, origin, destination));
}
```

#### Task 1.3: Update Response Mapping Function
**File**: `frontend/src/data/flightData.ts`

**Analysis Required**:
- Verify that `mapApiFlightToOffer()` still works with plan service response
- Plan service passes through flight-management response, so mapping should work
- Test with actual response data to ensure compatibility

**Potential Issues**:
- Response format differences between direct call and plan service call
- Missing fields in response
- Currency handling differences

### Phase 2: Hotel Search Migration

#### Task 2.1: Analyze Current Hotel Search Implementation
**File**: `frontend/src/data/hotelData.ts`

**Current Implementation Analysis**:
- Function: `searchHotels(query, checkInDate, checkOutDate, adults)`
- Endpoint: `/api/hotel-management/search`
- Payload structure:
  ```json
  {
    "query": "Tokyo, Japan",
    "check_in_date": "2026-04-15",
    "check_out_date": "2026-04-17",
    "adults": 2
  }
  ```
- Response structure:
  ```json
  {
    "data": {
      "search_results": {
        "properties": [...]
      }
    }
  }
  ```

**Plan Service Implementation Analysis**:
- Endpoint: `/api/plan/hotels/search`
- Expected payload (same structure):
  ```json
  {
    "query": "Tokyo, Japan",
    "check_in_date": "2026-04-15", 
    "check_out_date": "2026-04-17",
    "adults": 2,
    "children": 0,                // Optional
    "currency": "SGD",            // Optional
    "hl": "en",                   // Optional - language
    "sort_by": 3,                // Optional: 3=price, 8=rating, 13=reviews
    "rating": 8                   // Optional: 7=3.5+, 8=4.0+, 9=4.5+
  }
  ```
- Response structure:
  ```json
  {
    "success": true,
    "data": {
      "search_results": {
        "properties": [...]
      },
      "status": "success"
    }
  }
  ```

#### Task 2.2: Update Hotel Search Function
**File**: `frontend/src/data/hotelData.ts`

**Changes Required**:
1. Change endpoint from `/api/hotel-management/search` to `/api/plan/hotels/search`
2. Add optional parameters for better search control
3. Update error handling to include plan service error format
4. Test response parsing compatibility

**Implementation**:
```typescript
export async function searchHotels(
  query: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2
): Promise<HotelOffer[]> {
  const payload = {
    query,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    adults,
    currency: "SGD",           // Add default currency
    children: 0,               // Add default children count
    hl: "en",                 // Add language
  };

  const response = await fetch("/api/plan/hotels/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to search hotels: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error("API returned unsuccessful response");
  }

  // Plan service returns { data: { search_results: { properties: [...] } } }
  const properties = data?.data?.search_results?.properties || [];

  return properties.map((p: any) => {
    // ... existing mapping logic remains the same
  }).filter((h: HotelOffer) => h.price > 0 && h.reviews > 0);
}
```

### Phase 3: Testing Strategy

#### Task 3.1: Unit Tests for Flight Search
**File**: Create `frontend/src/data/__tests__/flightData.test.ts`

**Test Cases**:
1. ✅ Successful flight search with valid parameters
2. ✅ Flight search with missing required fields
3. ✅ Flight search with invalid date format
4. ✅ Flight search with plan service error response
5. ✅ Flight search with network error
6. ✅ Response mapping with different flight data variations
7. ✅ Empty results handling
8. ✅ Payload transformation correctness

**Mock Setup**:
```typescript
import { searchFlights } from '../flightData';
import { fetchMock } from 'whatwg-fetch';

beforeEach(() => {
  fetchMock.resetMocks();
});

test('searchFlights returns mapped flight offers', async () => {
  const mockResponse = {
    success: true,
    data: {
      flights: [
        {
          airline: "Singapore Airlines",
          flight_number: "SQ1",
          datetime_departure: "2026-04-15 10:00",
          datetime_arrival: "2026-04-15 15:00",
          price_sgd: 500,
          currency: "SGD"
        }
      ],
      search_metadata: {}
    }
  };

  fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

  const results = await searchFlights("SIN", "HKG", "2026-04-15");

  expect(results).toHaveLength(1);
  expect(results[0].airline).toBe("Singapore Airlines");
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/plan/flights/search'),
    expect.objectContaining({
      method: 'POST'
    })
  );
});
```

#### Task 3.2: Unit Tests for Hotel Search
**File**: Create `frontend/src/data/__tests__/hotelData.test.ts`

**Test Cases**:
1. ✅ Successful hotel search with valid parameters
2. ✅ Hotel search with different query formats
3. ✅ Hotel search with plan service error response
4. ✅ Hotel search with network error
5. ✅ Response mapping with various hotel data formats
6. ✅ Empty results handling
7. ✅ Filter logic (price > 0, reviews > 0)
8. ✅ Payload transformation correctness

#### Task 3.3: Integration Tests
**File**: Create `frontend/cypress/e2e/search-flows.cy.ts`

**Test Scenarios**:
1. ✅ Complete flight search flow from UI to plan service
2. ✅ Complete hotel search flow from UI to plan service
3. ✅ Flight search with error handling
4. ✅ Hotel search with error handling
5. ✅ Concurrent search requests
6. ✅ Search result display and interaction
7. ✅ Save to trip after search (end-to-end validation)

**Example Test**:
```typescript
describe('Flight Search Integration', () => {
  it('searches flights through plan service', () => {
    cy.intercept('POST', '/api/plan/flights/search', { 
      success: true,
      data: { flights: mockFlights, search_metadata: {} }
    }).as('searchFlights');

    cy.visit('/flights');
    cy.get('[data-testid="origin-input"]').type('SIN');
    cy.get('[data-testid="destination-input"]').type('HKG');
    cy.get('[data-testid="date-input"]').type('2026-04-15');
    cy.get('[data-testid="search-button"]').click();

    cy.wait('@searchFlights').its('request.body').then((body) => {
      expect(body).to.have.property('origin', 'SIN');
      expect(body).to.have.property('destination', 'HKG');
      expect(body).to.have.property('departure_date', '2026-04-15');
    });

    cy.get('[data-testid="flight-results"]').should('be.visible');
  });
});
```

#### Task 3.4: Backend Service Integration Tests
**File**: Create `apps/plan_service/tests/test_search_integration.py`

**Test Cases**:
1. ✅ Flight search endpoint receives correct parameters
2. ✅ Hotel search endpoint receives correct parameters
3. ✅ Error propagation from downstream services
4. ✅ Response format validation
5. ✅ Timeout handling
6. ✅ Malformed request handling

### Phase 4: Error Handling Enhancement

#### Task 4.1: Implement Standardized Error Handling
**File**: Create `frontend/src/utils/apiErrorHandler.ts`

**Purpose**: Centralize error handling for all API calls including plan service

**Implementation**:
```typescript
export interface ApiError {
  message: string;
  statusCode: number;
  type: 'validation' | 'network' | 'server' | 'timeout';
  details?: any;
}

export function handleApiError(error: any, context: string): ApiError {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your connection.',
      statusCode: 0,
      type: 'network'
    };
  }

  // Parse JSON errors
  try {
    const errorData = error.response ? await error.response.json() : null;
    if (errorData?.error) {
      return {
        message: errorData.error,
        statusCode: error.response?.status || 500,
        type: 'server',
        details: errorData
      };
    }
  } catch {
    // Not a JSON error
  }

  // Default error
  return {
    message: `An error occurred during ${context}. Please try again.`,
    statusCode: 500,
    type: 'server'
  };
}

export function isRetryableError(error: ApiError): boolean {
  return error.type === 'network' || error.statusCode >= 500;
}
```

#### Task 4.2: Update Search Functions with Enhanced Error Handling
**Files**: `frontend/src/data/flightData.ts`, `frontend/src/data/hotelData.ts`

**Changes**:
- Integrate new error handler
- Add retry logic for transient errors
- Improve error messages for users
- Add logging for debugging

**Example**:
```typescript
export async function searchFlights(
  origin: string,
  destination: string,
  date: string,
  maxRetries: number = 2
): Promise<FlightOffer[]> {
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // ... existing search logic
      const response = await fetch("/api/plan/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw response;
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "API returned unsuccessful response");
      }

      const flights = data.data?.flights || [];
      return flights.map((flight) => mapApiFlightToOffer(flight, origin, destination));

    } catch (error) {
      lastError = handleApiError(error, 'flight search');

      if (attempt < maxRetries && isRetryableError(lastError)) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Unknown error occurred');
}
```

### Phase 5: Documentation and Communication

#### Task 5.1: Update API Documentation
**File**: Update or create `frontend/docs/API.md`

**Content**:
1. Document new search endpoints through plan service
2. Update request/response examples
3. Update error handling documentation
4. Add migration notes for developers

#### Task 5.2: Update Component Documentation
**Files**: Update relevant component files with JSDoc comments

**Example**:
```typescript
/**
 * Search for flights using the plan service gateway.
 * 
 * This function routes search requests through the plan service for consistent
 * error handling and future extensibility. The plan service validates requests
 * and forwards to the flight-management service.
 * 
 * @param origin - Airport code for departure (e.g., "SIN")
 * @param destination - Airport code for arrival (e.g., "HKG")
 * @param date - Departure date in YYYY-MM-DD format
 * @returns Promise<FlightOffer[]> - Array of flight search results
 * @throws {ApiError} - For validation, network, or server errors
 * 
 * @example
 * const flights = await searchFlights("SIN", "HKG", "2026-04-15");
 */
export async function searchFlights(...)
```

#### Task 5.3: Create Migration Guide
**File**: Create `frontend/docs/SEARCH_MIGRATION.md`

**Content**:
1. Overview of changes
2. Breaking changes (none expected)
3. Benefits of the migration
4. Testing requirements
5. Rollback plan if needed

### Phase 6: Deployment Strategy

#### Task 6.1: Staging Environment Testing
**Activities**:
1. Deploy changes to staging environment
2. Run comprehensive integration tests
3. Perform manual testing of search flows
4. Load testing with concurrent requests
5. Monitor plan service performance

#### Task 6.2: Production Rollout Plan
**Strategy**:
1. **Blue-Green Deployment**: Deploy new version alongside old version
2. **Feature Flag**: Use feature flag to control migration
3. **Gradual Rollout**: Start with 10% of users, increase gradually
4. **Monitoring**: Intensive monitoring during rollout
5. **Rollback Plan**: Quick rollback if issues detected

**Rollback Plan**:
```bash
# Revert frontend changes to previous commit
git revert <commit-hash>

# Optional: temporarily route searches directly to downstream services
# by updating Vite proxy configuration

# Clear any caches
npm run clean
npm run build
```

### Phase 7: Monitoring and Validation

#### Task 7.1: Set Up Monitoring
**Metrics to Track**:
1. Search request latency (frontend → plan service → downstream)
2. Search error rates by service
3. Search result counts
4. Response time percentiles
5. Plan service resource usage

**Tools**:
- Frontend: Vite analytics, console error tracking
- Plan Service: Flask logging, Prometheus metrics
- Downstream Services: Existing monitoring

#### Task 7.2: Validation Checklist
**Pre-Deployment**:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing completed
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Rollback plan documented

**Post-Deployment**:
- [ ] Error rates acceptable (< 1%)
- [ ] Latency within acceptable range (< 3s)
- [ ] User feedback positive
- [ ] No critical bugs reported
- [ ] Dashboard monitoring stable

## Risk Assessment

### High Priority Risks
1. **Response Format Compatibility**
   - **Risk**: Plan service response format differs from direct calls
   - **Mitigation**: Comprehensive testing, response mapping validation
   - **Impact**: High - could break search functionality

2. **Performance Degradation**
   - **Risk**: Additional hop through plan service adds latency
   - **Mitigation**: Performance testing, monitoring, optimization
   - **Impact**: Medium - affects user experience

3. **Error Handling Inconsistency**
   - **Risk**: Different error formats between services
   - **Mitigation**: Standardized error handling, comprehensive error tests
   - **Impact**: Medium - affects user experience

### Medium Priority Risks
1. **Testing Gaps**
   - **Risk**: Edge cases not covered in tests
   - **Mitigation**: Extensive unit and integration tests
   - **Impact**: Medium

2. **Rollback Complexity**
   - **Risk**: Complex rollback if issues occur
   - **Mitigation**: Clear rollback plan, feature flags
   - **Impact**: Medium

### Low Priority Risks
1. **Developer Confusion**
   - **Risk**: Team unfamiliar with new architecture
   - **Mitigation**: Documentation, training, code reviews
   - **Impact**: Low

## Success Criteria

### Functional Requirements
- ✅ Flight searches work correctly through plan service
- ✅ Hotel searches work correctly through plan service
- ✅ Search results match previous functionality
- ✅ Error handling is consistent and user-friendly
- ✅ Performance is comparable to direct calls

### Non-Functional Requirements
- ✅ Search latency increase < 500ms
- ✅ Error rate < 1%
- ✅ Code coverage > 80% for modified functions
- ✅ Documentation complete and accurate
- ✅ Monitoring and alerts configured

### Business Requirements
- ✅ No impact on user experience
- ✅ Easy to maintain and extend
- ✅ Consistent with architectural patterns
- ✅ Future-proof for additional search features

## Timeline Estimate

| Phase | Tasks | Estimated Effort | Duration |
|-------|-------|----------------|----------|
| Phase 1 | Flight Search Migration | 4-6 hours | 1 day |
| Phase 2 | Hotel Search Migration | 4-6 hours | 1 day |
| Phase 3 | Testing Strategy | 6-8 hours | 2 days |
| Phase 4 | Error Handling | 4-6 hours | 1 day |
| Phase 5 | Documentation | 3-4 hours | 1 day |
| Phase 6 | Deployment | 4-6 hours | 1 day |
| Phase 7 | Monitoring | 2-3 hours | 1 day |
| **Total** | **All Phases** | **27-39 hours** | **7-8 days** |

## Rollback Plan

If critical issues are discovered post-deployment:

1. **Immediate Rollback** (within 5 minutes):
   ```bash
   git revert <new-commit-hash>
   npm run build
   # Restart frontend service
   ```

2. **Service-Level Rollback** (if frontend rollback not possible):
   - Update Vite proxy configuration to route directly to downstream services
   - Requires redeploy of frontend configuration

3. **Feature Flag Rollback**:
   ```javascript
   // In frontend configuration
   const USE_PLAN_SERVICE_FOR_SEARCH = false; // Disable feature flag
   ```

4. **Monitoring During Rollback**:
   - Watch error rates
   - Monitor user feedback
   - Validate system stability

## Notes for Implementation

### Important Considerations
1. **Date Formatting**: Ensure date strings are consistently formatted (YYYY-MM-DD)
2. **Currency Handling**: Default to SGD but handle other currencies if needed
3. **Pagination**: Plan service may return paginated results - handle accordingly
4. **Caching**: Consider adding caching at plan service level for future optimization
5. **Rate Limiting**: Plan service can implement rate limiting if needed

### Performance Optimization Opportunities
1. **Request Batching**: Combine multiple search requests if applicable
2. **Response Caching**: Cache common search results in plan service
3. **Connection Pooling**: Optimize HTTP connections to downstream services
4. **Async Processing**: Consider async processing for complex searches

### Future Enhancements
1. **Search Analytics**: Track search patterns for optimization
2. **Personalization**: Add personalized search preferences
3. **Multi-modal Search**: Combine flights + hotels in one search
4. **Search Suggestions**: Add autocomplete and suggestions
5. **Search History**: Maintain user search history

## Conclusion

This implementation plan provides a comprehensive approach to migrating frontend search operations through the plan service. The plan includes detailed analysis, implementation tasks, testing strategies, deployment considerations, and rollback procedures. Following this plan will result in a more consistent, maintainable, and scalable architecture for trip planning operations.

The migration is designed to be backward compatible and provides multiple safety nets including comprehensive testing, gradual rollout, and clear rollback procedures. The estimated timeline of 7-8 days allows for thorough implementation and validation while minimizing risk to production systems.
