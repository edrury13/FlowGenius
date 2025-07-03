# Google Places API Fixes

## Issue: Invalid Place Types (400 Error)

**Problem**: The Google Places API (New) was returning 400 errors with messages like:
```
Invalid included_primary_types 'coworking_space'. See the list of supported types...
```

**Root Cause**: We were using place types from the legacy Places API that are not valid in the new API.

## Solution

Updated all place type mappings to use only valid types from the Google Places API (New):

### Place Type Mappings (`getPlaceTypesForEvent`)

**Before**:
```typescript
lunch: ['restaurant', 'cafe', 'fast_food_restaurant', 'bakery'],
dinner: ['restaurant', 'bar', 'night_club'],
coffee: ['cafe', 'coffee_shop', 'bakery'],
meeting: ['cafe', 'restaurant', 'coworking_space'],
workout: ['gym', 'fitness_center', 'sports_club'],
```

**After**:
```typescript
lunch: ['restaurant', 'cafe', 'bakery'],
dinner: ['restaurant', 'bar', 'night_club'],
coffee: ['cafe', 'bakery'],
meeting: ['cafe', 'restaurant', 'corporate_office'],
workout: ['gym', 'sports_complex'],
```

### Invalid Types Removed

- `fast_food_restaurant` → Use `restaurant` instead
- `coffee_shop` → Use `cafe` instead
- `coworking_space` → Use `corporate_office` instead
- `fitness_center` → Use `gym` instead
- `sports_club` → Use `sports_complex` instead

### Static Suggestions Updated

Also updated all static location suggestions to remove invalid types:
- Removed: `healthy`, `fine_dining`, `meeting_space`, `club`, `fitness`, `crossfit`, `shopping_area`, `music_venue`
- Replaced with valid types or generic `establishment`

## Files Modified

1. `src/renderer/services/location.ts`
   - Updated `getPlaceTypesForEvent()` function
   - Updated `getStaticSuggestions()` function

2. `GOOGLE_PLACES_NEW_API_SETUP.md`
   - Added troubleshooting section for place type errors

## Testing

After these changes:
1. Google Places API (New) autocomplete should work without 400 errors
2. Location suggestions should appear in smart scheduling
3. Static fallback should use valid place types

## References

- [Google Places API (New) Place Types](https://developers.google.com/maps/documentation/places/web-service/place-types)
- Valid types are listed in Table A and Table B of the documentation 