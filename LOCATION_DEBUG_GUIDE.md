# Location Suggestions Debugging Guide

## Current Situation
Location suggestions are implemented but not appearing in the UI. This guide will help debug the issue.

## Debug Logging Added
When you run the app and create an event, you should see these console logs:

### 1. **Component Level** (SmartSchedulingSuggestions.tsx)
```
Smart scheduling result: {...}
Time slots with locations: [...]
[UI] Rendering slot 0 with locations: {...}
```

### 2. **Pipeline Level** (smartSchedulingPipeline.ts)
```
[Pipeline] Enhancing slots with locations, before: X slots
Enhancing time slots with location suggestions for: [event title]
Detected event type: [type]
[Pipeline] After location enhancement: [...]
```

### 3. **Location Service Level** (location.ts)
```
[LocationService] Loading Google Maps with API key: [status]
[LocationService] getSuggestedLocations called with: {...}
[LocationService] Using search queries: [...]
[LocationService] Autocomplete response: {...}
[LocationService] Got predictions: [...]
[LocationService] Returning suggestions: X
```

## Common Issues to Check

### 1. **Google API Key Not Set**
Look for: `[LocationService] Loading Google Maps with API key: NO API KEY!`

**Fix**: Ensure your `.env` file contains:
```
GOOGLE_API_KEY=your_actual_api_key_here
```

### 2. **Google Maps Not Loading**
Look for errors about script loading or Google Maps not being defined.

**Fix**: 
- Check browser console for CORS or loading errors
- Verify API key is valid
- Ensure Places API is enabled in Google Cloud Console

### 3. **Autocomplete Service Errors**
Look for: `[LocationService] Autocomplete error: [status]`

Common statuses:
- `REQUEST_DENIED` - API key issue or API not enabled
- `OVER_QUERY_LIMIT` - Quota exceeded
- `INVALID_REQUEST` - Malformed request

### 4. **No Predictions Returned**
Look for: `[LocationService] No results found for query`

This could mean:
- The search query is too specific
- No places found in the area
- API quota issues

## Mock Data Fallback
I've added mock location data that will appear if the API fails. If you see:
```
[Pipeline] No locations from API, using mock data for testing
```

You should see "Starbucks Coffee" and "Blue Bottle Coffee" as location suggestions. If these don't appear either, the issue is with the UI rendering, not the API.

## Test File
Open `test-maps.html` in a browser to test if your Google Maps API key works:
1. Open the file in Chrome/Firefox
2. Open Developer Console (F12)
3. Check for success/error messages

## Quick Checklist
1. ✓ Is `GOOGLE_API_KEY` set in `.env`?
2. ✓ Are Places API and Geocoding API enabled in Google Cloud Console?
3. ✓ Do you see mock locations when API fails?
4. ✓ Are there any console errors?
5. ✓ Does `test-maps.html` work?

## What to Report
If location suggestions still don't work, please share:
1. All console logs starting with `[LocationService]`, `[Pipeline]`, or `[UI]`
2. Any error messages in the console
3. Whether mock locations appear
4. Results from `test-maps.html`

## Temporary Workaround
The app now includes mock location data. Even if the Google Maps API fails, you should see location suggestions for testing purposes. 