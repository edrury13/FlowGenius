# Google Places API (New) Setup Guide

## Overview

This guide explains how to set up and use Google's new Places API with the AutocompleteSuggestion API in FlowGenius. This replaces the deprecated AutocompleteService that was discontinued for new customers as of March 1, 2025.

## What's New

1. **New API Endpoint**: Uses `https://places.googleapis.com/v1/places:autocomplete`
2. **POST Requests**: Instead of GET requests, the new API uses POST
3. **Better Type Filtering**: More granular place type filtering
4. **Field Masks**: Control response data and costs with field masks
5. **Modern Authentication**: Supports both API keys and OAuth

## Setup Instructions

### 1. Enable the New Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create a new one
3. Navigate to **APIs & Services > Library**
4. Search for **"Places API (New)"**
5. Click on it and click **"Enable"**
6. Also ensure **"Maps JavaScript API"** is enabled for PlacesService functionality

### 2. Configure API Key

1. Go to **APIs & Services > Credentials**
2. Create a new API key or use existing one
3. Add API restrictions:
   - Click on your API key
   - Under **"API restrictions"**, select **"Restrict key"**
   - Add these APIs:
     - Places API (New)
     - Maps JavaScript API
     - Geocoding API (if needed)
4. Add application restrictions:
   - For development: Add `http://localhost:*`
   - For production: Add your domain

### 3. Set Environment Variable

Add your API key to the `.env` file:

```env
GOOGLE_API_KEY=your_api_key_here
```

## Implementation Details

### API Features

The new implementation in `location.ts` provides:

1. **Real-time Autocomplete**: Searches Google's database for location suggestions
2. **Type-based Filtering**: Different place types for different event types
3. **Location Biasing**: Results biased to San Francisco Bay Area (configurable)
4. **Fallback Support**: Static suggestions if API fails

### Place Types by Event

- **Lunch**: restaurant, cafe, fast_food_restaurant, bakery
- **Dinner**: restaurant, bar, night_club
- **Coffee**: cafe, coffee_shop, bakery
- **Meeting**: cafe, restaurant, coworking_space
- **Workout**: gym, fitness_center, sports_club
- **Shopping**: shopping_mall, department_store, clothing_store, supermarket
- **Entertainment**: movie_theater, museum, tourist_attraction, amusement_park

### API Response Structure

```typescript
{
  "suggestions": [
    {
      "placePrediction": {
        "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
        "text": {
          "text": "Google Sydney"
        },
        "structuredFormat": {
          "mainText": {
            "text": "Google Sydney"
          },
          "secondaryText": {
            "text": "48 Pirrama Road, Pyrmont NSW, Australia"
          }
        },
        "types": ["establishment", "point_of_interest"]
      }
    }
  ]
}
```

## Usage

The location service automatically uses the new API when searching for locations:

```typescript
// Search for locations
const suggestions = await locationService.searchLocations("coffee shop");

// Get suggestions for specific event type
const lunchPlaces = await locationService.getSuggestedLocations(
  { lat: 37.7749, lng: -122.4194 },
  "lunch"
);

// Get place details
const details = await locationService.getPlaceDetails(placeId);
```

## Cost Optimization

The new API uses field masks to control costs:

- Basic fields (name, address, placeId) are cheaper
- Premium fields (reviews, photos, etc.) cost more
- Our implementation only requests necessary fields

## Troubleshooting

### Common Issues

1. **API Not Enabled**
   - Error: "Places API (New) has not been used in project..."
   - Solution: Enable the API in Google Cloud Console

2. **Invalid API Key**
   - Error: "The provided API key is invalid"
   - Solution: Check API key restrictions and ensure it's correct

3. **Quota Exceeded**
   - Error: "Quota exceeded for quota metric..."
   - Solution: Check your billing account or wait for quota reset

4. **CORS Issues**
   - Error: "CORS policy blocked..."
   - Solution: API key should work from Electron apps, but check domain restrictions

### 403 Permission Denied Error

If you see a 403 error about the Places API (New) not being enabled:

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **"Places API (New)"** - this is different from the legacy Places API
3. Check your API key restrictions - ensure "Places API (New)" is included
4. Wait 5-10 minutes for the changes to propagate

### 400 Invalid Place Type Error

If you see errors like `Invalid included_primary_types 'coworking_space'`:

This means you're using place types that aren't supported in the new API. Valid place types include:
- `restaurant`, `cafe`, `bar`, `night_club` (for dining)
- `gym`, `sports_complex` (for fitness)
- `shopping_mall`, `department_store`, `clothing_store`, `supermarket` (for shopping)
- `movie_theater`, `museum`, `tourist_attraction`, `amusement_park` (for entertainment)
- `corporate_office` (for meetings)

See the full list at: https://developers.google.com/maps/documentation/places/web-service/place-types

### Static Fallback

If the API fails for any reason, the app will automatically fall back to curated static location suggestions to ensure the feature continues working.

## Migration Notes

If migrating from the old AutocompleteService:

1. The new API returns different response structure
2. Place IDs remain compatible
3. Some place types have changed names
4. Session tokens work differently (not implemented in current version)

## Future Enhancements

1. **Session Tokens**: Implement session-based pricing for better cost control
2. **More Filters**: Add price level, rating filters
3. **Custom Biasing**: Allow users to set their own location bias
4. **Caching**: Cache recent searches to reduce API calls

## Resources

- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Place Types](https://developers.google.com/maps/documentation/places/web-service/place-types)
- [Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Migration Guide](https://developers.google.com/maps/documentation/places/web-service/migrate-autocomplete) 