# Search Migration Guide: Plan Service Integration

## Overview

This document describes the migration of frontend flight and hotel search operations to route through the plan service instead of directly calling downstream services.

## Migration Date

**Implementation Date**: April 7, 2026
**Release**: Version 2.0.0

## Changes Summary

### Architecture Changes

#### Before
```
Frontend → /api/flights/search → flight-management (port 5005)
Frontend → /api/hotel-management/search → hotel-management (port 5009)
Frontend → /api/plan/* → plan service (port 5011) → downstream services
```

#### After
```
Frontend → /api/plan/flights/search → plan service → flight-management
Frontend → /api/plan/hotels/search → plan service → hotel-management
Frontend → /api/plan/* → plan service (port 5011) → downstream services
```

### Benefits

1. **Unified Architecture**: All trip planning operations now route through a single gateway service
2. **Consistent Error Handling**: Standardized error responses and user-friendly messages
3. **Enhanced Reliability**: Automatic retry logic for transient errors (network issues, timeouts, server errors)
4. **Better Monitoring**: Single point to track all trip planning activities
5. **Future Flexibility**: Easy to add caching, rate limiting, or request transformation
6. **Improved User Experience**: Retry logic reduces failed searches due to temporary issues

## Technical Changes

### Flight Search Migration

**File**: `frontend/src/data/flightData.ts`

**Function Signature Changes**:
```typescript
// Before
export async function searchFlights(
  origin: string,
  destination: string,
  date: string
): Promise<FlightOffer[]>

// After
export async function searchFlights(
  origin: string,
  destination: string,
  date: string,
  options?: {
    adults?: number;
    children?: number;
    cabin_class?: "economy" | "business" | "first";
    currency?: string;
  }
): Promise<FlightOffer[]>
```

**Key Changes**:
1. **Endpoint**: Changed from `/api/flights/search` to `/api/plan/flights/search`
2. **Optional Parameters**: Added support for `adults`, `children`, `cabin_class`, and `currency`
3. **Error Handling**: Integrated standardized error handler with retry logic
4. **Response Parsing**: Updated to handle plan service response structure

**Breaking Changes**: None - existing function calls remain compatible

### Hotel Search Migration

**File**: `frontend/src/data/hotelData.ts`

**Function Signature Changes**:
```typescript
// Before
export async function searchHotels(
  query: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2
): Promise<HotelOffer[]>

// After
export async function searchHotels(
  query: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2,
  options?: {
    children?: number;
    currency?: string;
    hl?: string;
    sort_by?: number;
    rating?: number;
  }
): Promise<HotelOffer[]>
```

**Key Changes**:
1. **Endpoint**: Changed from `/api/hotel-management/search` to `/api/plan/hotels/search`
2. **Optional Parameters**: Added support for `children`, `currency`, `hl`, `sort_by`, and `rating`
3. **Error Handling**: Integrated standardized error handler with retry logic
4. **Response Parsing**: Updated to handle plan service response structure

**Breaking Changes**: None - existing function calls remain compatible

## New Features

### Enhanced Error Handling

**File**: `frontend/src/utils/apiErrorHandler.ts`

**Features**:
- **Standardized Error Types**: `validation`, `network`, `server`, `timeout`, `authentication`
- **User-Friendly Messages**: Clear, actionable error messages for users
- **Automatic Retry**: Built-in retry logic with exponential backoff for transient errors
- **Error Classification**: Intelligent error type determination based on HTTP status codes

**Usage Example**:
```typescript
import { handleApiError, isRetryableError, getUserFriendlyError } from "@/utils/apiErrorHandler";

// Handle API errors
try {
  const results = await searchFlights("SIN", "HKG", "2026-04-15");
} catch (error) {
  const apiError = handleApiError(error, "flight search");
  console.error(apiError.message); // User-friendly error message
  console.error(apiError.type);    // Error type
  console.error(apiError.statusCode); // HTTP status code
}
```

### Retry Logic

Both flight and hotel search now include automatic retry logic:

- **Retry Attempts**: Up to 2 retries (3 total attempts)
- **Backoff Strategy**: Exponential backoff with 1s, 2s delays
- **Retryable Errors**: Network errors, timeouts, and server errors (500+)
- **Non-Retryable Errors**: Validation errors (4xx) and authentication errors (401/403)

**Configuration**:
```typescript
// In searchFlights and searchHotels
}, 2, 1000); // maxRetries: 2, baseDelay: 1000ms
```

## Testing

### Unit Tests

New comprehensive unit tests created:

- **Flight Tests**: `frontend/src/data/__tests__/flightData.test.ts`
- **Hotel Tests**: `frontend/src/data/__tests__/hotelData.test.ts`

**Test Coverage**:
- ✅ Successful search scenarios
- ✅ Error handling (network, validation, server errors)
- ✅ Optional parameter handling
- ✅ Empty results handling
- ✅ Response mapping and transformation
- ✅ Filter logic (price > 0, reviews > 0 for hotels)

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run specific test file
npm test flightData.test.ts
```

## Migration Steps for Developers

### For Existing Code

If you're using the search functions, no changes are required for basic usage:

```typescript
// This still works exactly as before
const flights = await searchFlights("SIN", "HKG", "2026-04-15");
const hotels = await searchHotels("Tokyo", "2026-04-15", "2026-04-17", 2);
```

### For New Features

You can now leverage the new optional parameters:

```typescript
// Enhanced flight search with options
const flights = await searchFlights("SIN", "HKG", "2026-04-15", {
  adults: 2,
  children: 1,
  cabin_class: "business",
  currency: "USD"
});

// Enhanced hotel search with options
const hotels = await searchHotels("Paris", "2026-04-15", "2026-04-17", 2, {
  children: 1,
  currency: "EUR",
  sort_by: 8,      // Sort by rating
  rating: 8         // 4.0+ rating
});
```

### Error Handling Improvements

If you're implementing custom error handling, you can use the new utility:

```typescript
import { getUserFriendlyError } from "@/utils/apiErrorHandler";

try {
  const results = await searchFlights("SIN", "HKG", "2026-04-15");
} catch (error) {
  const userMessage = getUserFriendlyError(error);
  toast({
    title: "Search Failed",
    description: userMessage,
    variant: "destructive"
  });
}
```

## Rollback Plan

If critical issues are discovered post-deployment:

### Immediate Rollback (within 5 minutes)

```bash
# Revert to previous commit
git revert <commit-hash>

# Rebuild frontend
npm run build

# Restart frontend service
# (depends on your deployment setup)
```

### Service-Level Workaround

If frontend rollback is not possible, temporarily update Vite proxy:

```typescript
// In vite.config.ts
export default defineConfig(() => ({
  server: {
    proxy: {
      // Temporarily route directly to downstream services
      "/api/flights/search": {
        target: "http://localhost:5005",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/flights\/search/, "/api/flights/search"),
      },
      "/api/hotel-management/search": {
        target: "http://localhost:5009",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hotel-management\/search/, "/api/search"),
      },
      // ... other proxies
    }
  }
}));
```

## Performance Impact

### Expected Latency

- **Additional Hop**: ~100-200ms increase (plan service forwarding)
- **Retry Logic**: Reduces perceived failures for transient issues
- **Overall Impact**: Minimal for users, improved reliability

### Monitoring Recommendations

Track these metrics post-deployment:

1. **Search Latency**: Average time from request to response
2. **Error Rates**: Percentage of failed searches
3. **Retry Rates**: How often retry logic is triggered
4. **Success Rates**: Percentage of successful searches

## FAQ

### Q: Will existing code break?

**A**: No. The migration maintains backward compatibility. All existing function calls continue to work without changes.

### Q: Do I need to update my components?

**A**: No changes required for existing functionality. Optional parameters can be added for enhanced search capabilities.

### Q: What happens if the plan service is down?

**A**: The retry logic will attempt up to 3 times with exponential backoff. If all attempts fail, a user-friendly error message will be displayed. Consider implementing fallback to direct service calls if plan service reliability is a concern.

### Q: How do I disable retry logic?

**A**: The retry logic is built into the search functions. To disable, you would need to modify the `retryWithBackoff` call or create a wrapper function that doesn't use retry logic.

### Q: Are there any breaking changes?

**A**: No. The migration is designed to be backward compatible. All existing functionality continues to work as before.

### Q: What should I monitor post-deployment?

**A**: Monitor search latency, error rates, and user feedback. Any significant increase in errors or latency should trigger investigation.

## Future Enhancements

The plan service gateway enables future improvements:

1. **Search Caching**: Cache common search results to reduce API calls
2. **Rate Limiting**: Implement rate limiting at the gateway level
3. **Request Optimization**: Batch multiple search requests if applicable
4. **Personalization**: Add personalized search preferences
5. **Analytics**: Track search patterns for optimization
6. **Multi-modal Search**: Combine flights + hotels in one search

## Support

For issues or questions related to this migration:

1. **Code Issues**: Check the GitHub repository for bug reports
2. **Documentation**: Refer to JSDoc comments in the source files
3. **Testing**: Run the provided unit tests to verify functionality
4. **Rollback**: Follow the rollback plan if critical issues arise

## Version History

- **2.0.0** (2026-04-07): Migrated flight and hotel search to plan service
  - Added optional parameters
  - Implemented retry logic
  - Enhanced error handling
  - Created comprehensive unit tests

- **1.0.0**: Original implementation with direct service calls