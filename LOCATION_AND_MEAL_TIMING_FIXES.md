# Location Suggestions and Meal Timing Fixes

This document summarizes the fixes applied to address location suggestions not appearing and inappropriate meal timing suggestions.

## Issues Fixed

### 1. Location Suggestions Not Appearing in UI
**Problem**: Location suggestions were implemented but not showing up in the time slot cards.

**Solution**: 
- Added debug logging to track the location suggestion flow
- Fixed the event type detection logic to be more specific
- Enhanced the `enhanceWithLocationSuggestions` method to better detect meal events
- Added fallback URL generation for Google Maps links when place details fail

**Key Changes**:
```typescript
// Better event type detection
if (lowerTitle.includes('breakfast') || lowerTitle.includes('lunch') || 
    lowerTitle.includes('dinner') || lowerTitle.includes('meal')) {
  eventType = 'dinner'; // Use 'dinner' for all meal types
} else if (lowerTitle.includes('coffee')) {
  eventType = 'coffee';
} else if (lowerTitle.includes('gym') || lowerTitle.includes('workout')) {
  eventType = 'workout';
}
```

### 2. Inappropriate Meal Timing Suggestions
**Problem**: The AI was suggesting meals at wrong times (lunch at 9am, dinner at noon).

**Solution**: Implemented meal-specific time slot generation with appropriate timing windows.

**Meal Time Windows**:
- **Breakfast**: 7-9 AM (optimal: 8 AM)
- **Brunch**: 10 AM-12 PM (optimal: 11 AM)  
- **Lunch**: 11 AM-3 PM (optimal: 12-1 PM)
- **Dinner**: 5-9 PM (optimal: 6-7 PM)

**Implementation**:
```typescript
private generateMealTimeSlots(
  date: dayjs.Dayjs,
  duration: number,
  existingEvents: Event[],
  preferences: SchedulingPreferences,
  title: string
): TimeSlotSuggestion[]
```

## How It Works Now

1. **Event Detection**: When a user enters an event title containing meal keywords (breakfast, lunch, dinner, etc.), the system recognizes it as a meal event.

2. **Time Slot Generation**: Instead of using generic business/personal hours, meal events get specific time slots appropriate for that meal type.

3. **Location Suggestions**: For each time slot, the system suggests 2-3 relevant locations:
   - Meal events → Restaurants/cafes
   - Coffee meetings → Coffee shops
   - Gym/workout → Fitness centers
   - Business meetings → Meeting spaces/cafes

4. **Priority Scoring**: Meal slots are prioritized based on optimal timing:
   - Perfect timing (e.g., 12 PM for lunch) = 100 priority
   - Good timing (e.g., 11 AM or 1 PM for lunch) = 85-90 priority
   - Weekend bonus for casual meals

## Debug Logging

Added console logging to help debug location suggestions:
```javascript
console.log('Smart scheduling result:', result);
console.log('Time slots with locations:', result.suggestedSlots);
console.log('Enhancing time slots with location suggestions for:', eventTitle);
console.log('Detected event type:', eventType);
console.log('Got location suggestions:', locationSuggestions.length);
console.log('Processed locations:', locations);
```

## User Experience Improvements

1. **Accurate Meal Timing**: Users will now see appropriate time suggestions for meals
2. **Visible Location Chips**: Each time slot shows clickable location suggestions
3. **Context-Aware**: The system understands different meal types and suggests accordingly
4. **Weekend Flexibility**: Casual meals get higher priority on weekends

## Testing Scenarios

Try these event titles to test the improvements:
- "Team lunch meeting" → Should suggest 11 AM-2 PM slots with restaurant locations
- "Coffee with client" → Should suggest morning/afternoon slots with cafe locations
- "Dinner with friends" → Should suggest 5-8 PM slots with restaurant locations
- "Breakfast meeting" → Should suggest 7-9 AM slots with breakfast spot locations

## Future Enhancements

- User preferences for meal times
- Location favorites and history
- Distance/travel time considerations
- Dietary preference matching for restaurants 