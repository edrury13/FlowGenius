# Geolocation Fix for Smart Scheduling

## Issue

The smart scheduling feature was showing location suggestions from San Francisco (and sometimes random places like Pakistan) regardless of the user's actual location.

**Root Causes**:
1. Hardcoded San Francisco coordinates (`lat: 37.7749, lng: -122.4194`) in the location services
2. No user location detection implemented
3. The 50km radius was too large (changed to 5km)

## New Issue: Geolocation API 403 Error

When trying to use browser geolocation, we encountered:
```
Network location provider at 'https://www.googleapis.com/' : Returned error code 403
```

This happens because:
- Electron apps have issues with Google's network location provider
- The browser tries to use Google's service to determine location from IP/WiFi
- This requires additional API configuration that doesn't work well in Electron

## Solution

Implemented a localStorage-based location system:

1. **Removed browser geolocation** - Avoiding the 403 error entirely
2. **Added city presets** - Major cities with their coordinates
3. **localStorage support** - Save user's preferred location
4. **Manual location setting** - Users can set their location via console

## How to Set Your Location

1. Open Developer Console in FlowGenius (Ctrl+Shift+I)
2. Run one of these commands:

```javascript
// Example: New York
localStorage.setItem('userLocation', JSON.stringify({ lat: 40.7128, lng: -74.0060 }));

// Example: Los Angeles  
localStorage.setItem('userLocation', JSON.stringify({ lat: 34.0522, lng: -118.2437 }));

// Custom coordinates
localStorage.setItem('userLocation', JSON.stringify({ lat: YOUR_LAT, lng: YOUR_LNG }));
```

3. Refresh the app or try Smart Scheduling again

See `SET_USER_LOCATION.md` for a complete list of cities.

## Default Behavior

- If no location is set: Defaults to New York
- Location suggestions will be within 5km radius of your set location
- Location preference persists across app restarts

## Future Improvements

1. **Location Settings UI**: Add a proper location selector in app settings
2. **IP-based Geolocation**: Use a service that doesn't require Google API
3. **Remember Last Search**: Store the last searched location as preference

## Files Modified

- `src/renderer/services/smartScheduling.ts` - Updated getUserLocation()
- `src/renderer/services/smartSchedulingPipeline.ts` - Updated getUserLocation()
- `src/renderer/services/location.ts` - Fixed API types and radius

## Testing

1. Set your location using the console command
2. Create a new event
3. Click "AI Smart Scheduling"
4. Location suggestions should now be near your set location
5. No more 403 errors in console 