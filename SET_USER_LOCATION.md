# Setting Your Location in FlowGenius

Due to Electron/Google API restrictions, browser geolocation doesn't work properly. Instead, you can manually set your location.

## Quick Setup

1. **Open Developer Console** in FlowGenius (Ctrl+Shift+I or Cmd+Option+I)

2. **Set your location** by running one of these commands:

### Major US Cities:
```javascript
// New York
localStorage.setItem('userLocation', JSON.stringify({ lat: 40.7128, lng: -74.0060 }));

// Los Angeles
localStorage.setItem('userLocation', JSON.stringify({ lat: 34.0522, lng: -118.2437 }));

// Chicago
localStorage.setItem('userLocation', JSON.stringify({ lat: 41.8781, lng: -87.6298 }));

// Houston
localStorage.setItem('userLocation', JSON.stringify({ lat: 29.7604, lng: -95.3698 }));

// Phoenix
localStorage.setItem('userLocation', JSON.stringify({ lat: 33.4484, lng: -112.0740 }));

// Philadelphia
localStorage.setItem('userLocation', JSON.stringify({ lat: 39.9526, lng: -75.1652 }));

// San Antonio
localStorage.setItem('userLocation', JSON.stringify({ lat: 29.4241, lng: -98.4936 }));

// San Diego
localStorage.setItem('userLocation', JSON.stringify({ lat: 32.7157, lng: -117.1611 }));

// Dallas
localStorage.setItem('userLocation', JSON.stringify({ lat: 32.7767, lng: -96.7970 }));

// San Francisco
localStorage.setItem('userLocation', JSON.stringify({ lat: 37.7749, lng: -122.4194 }));

// Seattle
localStorage.setItem('userLocation', JSON.stringify({ lat: 47.6062, lng: -122.3321 }));

// Denver
localStorage.setItem('userLocation', JSON.stringify({ lat: 39.7392, lng: -104.9903 }));

// Washington DC
localStorage.setItem('userLocation', JSON.stringify({ lat: 38.9072, lng: -77.0369 }));

// Boston
localStorage.setItem('userLocation', JSON.stringify({ lat: 42.3601, lng: -71.0589 }));

// Miami
localStorage.setItem('userLocation', JSON.stringify({ lat: 25.7617, lng: -80.1918 }));

// Atlanta
localStorage.setItem('userLocation', JSON.stringify({ lat: 33.7490, lng: -84.3880 }));
```

### International Cities:
```javascript
// London
localStorage.setItem('userLocation', JSON.stringify({ lat: 51.5074, lng: -0.1278 }));

// Toronto
localStorage.setItem('userLocation', JSON.stringify({ lat: 43.6532, lng: -79.3832 }));

// Sydney
localStorage.setItem('userLocation', JSON.stringify({ lat: -33.8688, lng: 151.2093 }));

// Mumbai
localStorage.setItem('userLocation', JSON.stringify({ lat: 19.0760, lng: 72.8777 }));

// Tokyo
localStorage.setItem('userLocation', JSON.stringify({ lat: 35.6762, lng: 139.6503 }));
```

### Custom Location:
```javascript
// Replace LAT and LNG with your coordinates
localStorage.setItem('userLocation', JSON.stringify({ lat: YOUR_LAT, lng: YOUR_LNG }));
```

3. **Refresh the app** or try Smart Scheduling again

## To Check Your Current Location:
```javascript
console.log(localStorage.getItem('userLocation'));
```

## To Clear Your Location:
```javascript
localStorage.removeItem('userLocation');
```

## Finding Your Coordinates

If your city isn't listed:
1. Go to [Google Maps](https://maps.google.com)
2. Search for your city
3. Right-click on the map
4. Click "What's here?"
5. Copy the coordinates from the popup

## Note

This is a temporary solution. A proper location selector will be added to the app settings in a future update. 