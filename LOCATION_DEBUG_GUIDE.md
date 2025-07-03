# Location Debug Guide

## Current Issue
The app was showing San Francisco locations regardless of user's actual location.

## Changes Made

### 1. Removed Static Fallback
- Previously: When Google API returned no results, it fell back to hardcoded San Francisco locations
- Now: Returns empty array instead of misleading suggestions

### 2. Changed from locationRestriction to locationBias
- `locationRestriction`: Forces Google to ONLY return results within the radius (too restrictive)
- `locationBias`: Prefers results within the radius but allows others if needed (more flexible)

### 3. Increased Search Radius
- Changed from 2km to 15km for better coverage
- Some areas might not have many places within 2km
- 15km radius provides a good balance of local results without being too far

### 4. Simplified Search Queries
- Before: "restaurant lunch", "business meeting venue"
- After: "restaurant", "coffee", "gym" (simpler terms)

### 5. Added Fallback Search
- If typed search returns no results, tries again without type restrictions
- Helps when Google's type categorization doesn't match our expectations

## How to Test

1. Clear location cache:
   ```javascript
   window.locationService.clearLocationCache()
   ```

2. Refresh the app (Ctrl+R)

3. Create a new event (e.g., "Dinner")

4. Check console for debug info:
   - Your detected location
   - API request details
   - Number of suggestions returned
   - Any fallback attempts

## What to Look For in Console

```
[LocationService] getSuggestedLocations called with: {coordinates: {lat: 30.3023, lng: -97.6914}, eventType: "dinner", radius: 15000}
[LocationService] Calling Places API with: {query: "restaurant", types: ["restaurant", "bar", "night_club"], coordinates: {...}, radius: 15000}
[LocationService] Sending request to Google Places API: {...}
[LocationService] Places API response: {...}
[LocationService] Got 3 suggestions from Google
```

## If Still Getting Wrong Locations

1. Check the coordinates in the console - are they correct for your location?
2. Look at the API response - what places is Google actually returning?
3. Try manually searching on Google Maps for the same query in your area
4. Consider if the place types are too restrictive

## Common Issues

1. **No results**: Area might not have many places of that type
2. **Wrong city**: Location detection might be incorrect
3. **API limits**: Google might be rate limiting requests

## If You See Empty Results

The app no longer falls back to San Francisco suggestions. If you see no location suggestions at all:

1. Check console for "No suggestions from Google" message
2. Look for the fallback search attempt
3. Verify your coordinates are correct
4. Try a different event type (e.g., "coffee" instead of "dinner")

## Manual Testing

You can test the location service directly in the console:

```javascript
// Test getting suggestions
await window.locationService.getSuggestedLocations(
  {lat: 30.3023, lng: -97.6914}, // Your coordinates
  'dinner',
  15000
)
```

 