# Clear Location Cache Guide

## Why Clear the Cache?

The app caches your location for 24 hours to avoid repeated API calls. If you need to test with fresh location data or if you've moved to a different city, you'll need to clear the cache.

## How to Clear Location Cache

1. Open the app
2. Press F12 to open Developer Tools
3. Go to the Console tab
4. Type the following command and press Enter:
   ```javascript
   window.locationService.clearLocationCache()
   ```
5. You should see: `[LocationService] Location cache cleared`
6. Refresh the app (Ctrl+R or Cmd+R)

## What's Changed in Location Handling

1. **Stronger Location Enforcement**: Now using `locationRestriction` instead of `locationBias` for Google Places API
2. **Smaller Search Radius**: Reduced from 5km to 2km for more local results
3. **City Context**: Searches now include city name (e.g., "restaurant dinner in Austin, TX")
4. **Better Logging**: You can see exactly what's being sent to Google in the console

## Testing the Fix

1. Clear the cache using the steps above
2. Create a new event (e.g., "Dinner with friends")
3. Check the console for these logs:
   - `Got location from IP (Austin, Texas, United States)` - Shows detected location
   - `[LocationService] Calling Places API with:` - Shows the search query with city context
   - `[LocationService] Places API response:` - Shows what Google returns

The suggestions should now be from your local area (within 2km) instead of random places across the country. 