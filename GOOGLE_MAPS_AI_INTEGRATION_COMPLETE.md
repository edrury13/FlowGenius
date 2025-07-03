# Google Maps Integration with AI-Powered Smart Scheduling

This document summarizes the integration of Google Maps location features with FlowGenius's AI-powered smart scheduling system.

## Overview

FlowGenius now includes advanced location suggestions powered by Google Maps APIs, integrated seamlessly with the AI scheduling features to provide contextual location recommendations for events.

## Key Features Implemented

### 1. Location Autocomplete Component
- Smart search with real-time suggestions as users type
- Place icons based on location type (restaurants, cafes, gyms, etc.)
- Click-to-open Google Maps links for selected locations
- Backward compatible with existing string-based locations

### 2. Updated Google Maps API Usage
- **Removed deprecated `PlacesService`** - New customers cannot use this API
- **Using modern APIs**:
  - `AutocompleteService` for location search and suggestions
  - `Geocoder` for address-to-coordinates conversion
  - Simplified place details retrieval

### 3. AI-Enhanced Location Suggestions
The smart scheduling system now provides location suggestions based on:
- **Event Classification**: Business, hobby, or personal events get relevant location types
- **Event Title Analysis**: Keywords like "lunch", "gym", "meeting" influence suggestions
- **Contextual Matching**: 
  - Business events → meeting rooms, cafes, restaurants
  - Hobby events → gyms, entertainment venues
  - Personal events → shopping centers, restaurants

### 4. Integration Points

#### Smart Scheduling Pipeline
```typescript
// Location suggestions are added during the schedule generation phase
private async scheduleNode(state: PipelineState): Promise<Partial<PipelineState>> {
  // Generate time slots
  let suggestedSlots = await this.generateAdvancedTimeSlots(...);
  
  // Enhance with location suggestions
  suggestedSlots = await this.enhanceWithLocationSuggestions(
    suggestedSlots,
    state.title,
    classification
  );
}
```

#### UI Display
- Location suggestions appear as clickable chips under each time slot
- Shows top 2 locations per time slot to avoid clutter
- Click to open location in Google Maps

## Technical Implementation

### Location Service Updates
- Removed dependency on deprecated `PlacesService`
- Uses `AutocompleteService` for search with location bias
- Falls back to geocoding for coordinate retrieval
- Maintains compatibility with existing Event interface

### Smart Scheduling Enhancement
```typescript
export interface TimeSlotSuggestion {
  startTime: Date;
  endTime: Date;
  reasoning: string;
  priority: number;
  conflictScore: number;
  optimalityScore: number;
  locationSuggestions?: EventLocation[]; // NEW
}
```

## Usage Examples

### Creating an Event with Location
1. User enters event title: "Team lunch meeting"
2. AI classifies as "business" event
3. Smart scheduling suggests time slots
4. Each slot includes 2-3 nearby restaurant suggestions
5. User can click location chips to view on Google Maps

### Location-Aware Event Types
- **"Coffee meeting"** → Suggests nearby cafes
- **"Gym workout"** → Suggests fitness centers
- **"Client dinner"** → Suggests restaurants
- **"Team building"** → Suggests entertainment venues

## API Configuration

Ensure your Google Cloud project has these APIs enabled:
- Places API (for autocomplete)
- Geocoding API (for coordinates)
- Maps JavaScript API (for client-side features)

Add API key to `.env`:
```
GOOGLE_API_KEY=your_api_key_here
```

## Benefits

1. **Contextual Relevance**: Locations match the event type
2. **Time Savings**: No need to search for venues separately  
3. **Seamless Integration**: Works within existing scheduling flow
4. **Smart Defaults**: AI learns from event titles to suggest appropriate venues
5. **Privacy-Focused**: Uses default location, doesn't track user location

## Future Enhancements

Potential improvements for future releases:
- User location preferences and favorites
- Distance/travel time calculations
- Integration with calendar location fields
- Custom location type mappings
- Historical location suggestions based on past events

## Troubleshooting

### Common Issues

1. **"PlacesService is not available" error**
   - This is expected for new Google Maps customers
   - The app now uses AutocompleteService instead

2. **No location suggestions appearing**
   - Check that GOOGLE_API_KEY is set in .env
   - Verify Places API and Geocoding API are enabled
   - Check browser console for API errors

3. **Multiple Google Maps script loading errors**
   - Fixed by implementing singleton loading pattern
   - Script only loads once per app session

## Summary

The integration of Google Maps with AI-powered smart scheduling creates a more intelligent event planning experience. Users get contextually relevant location suggestions without leaving the event creation flow, making FlowGenius a truly comprehensive productivity tool. 