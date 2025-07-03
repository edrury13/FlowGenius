import { EventLocation } from '../types';

// Google Maps API types
declare global {
  interface Window {
    google: typeof google;
  }
}

// New Places API types
interface PlacePrediction {
  place: string;
  placeId: string;
  text: {
    text: string;
    matches?: Array<{
      startOffset: number;
      endOffset: number;
    }>;
  };
  structuredFormat?: {
    mainText: {
      text: string;
      matches?: Array<{
        startOffset: number;
        endOffset: number;
      }>;
    };
    secondaryText?: {
      text: string;
      matches?: Array<{
        startOffset: number;
        endOffset: number;
      }>;
    };
  };
  types?: string[];
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction: PlacePrediction;
  }>;
}

// Initialize Google Maps
let geocoder: google.maps.Geocoder | null = null;
let placesService: google.maps.places.PlacesService | null = null;
let mapsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Load Google Maps script
export const loadGoogleMaps = async (): Promise<void> => {
  // If already loaded, return immediately
  if (mapsLoaded && window.google) {
    return;
  }

  // If currently loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Check if script already exists in the DOM
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    // Wait for existing script to load
    return new Promise((resolve) => {
      if (window.google && window.google.maps) {
        mapsLoaded = true;
        initializeServices();
        resolve();
      } else {
        existingScript.addEventListener('load', () => {
          mapsLoaded = true;
          initializeServices();
          resolve();
        });
      }
    });
  }

  // Create loading promise
  loadingPromise = new Promise((resolve, reject) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log('[LocationService] Loading Google Maps with API key:', apiKey ? 'API key present' : 'NO API KEY!');
    
    if (!apiKey) {
      console.error('[LocationService] GOOGLE_API_KEY is not set in environment variables!');
      reject(new Error('Google API key not configured'));
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      mapsLoaded = true;
      loadingPromise = null;
      initializeServices();
      resolve();
    };
    
    script.onerror = () => {
      loadingPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    
    document.head.appendChild(script);
  });

  return loadingPromise;
};

// Initialize Google Maps services
const initializeServices = () => {
  if (!window.google) return;
  
  geocoder = new window.google.maps.Geocoder();
  // Create a dummy map element for PlacesService
  const dummyMap = new window.google.maps.Map(document.createElement('div'));
  placesService = new window.google.maps.places.PlacesService(dummyMap);
};

// Location service interface
export interface LocationSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface LocationDetails {
  location: EventLocation;
  openingHours?: {
    isOpen: boolean;
    weekdayText: string[];
  };
  rating?: number;
  priceLevel?: number;
  phoneNumber?: string;
  website?: string;
}

// New Places API Autocomplete function
async function callPlacesAutocomplete(
  input: string, 
  types?: string[], 
  coordinates?: { lat: number; lng: number },
  radius: number = 5000
): Promise<AutocompleteResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  const url = 'https://places.googleapis.com/v1/places:autocomplete';
  
  const requestBody: any = {
    input,
  };

  // Add location bias if coordinates are provided
  if (coordinates) {
    // Use locationBias first - it's less restrictive than locationRestriction
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: coordinates.lat,
          longitude: coordinates.lng
        },
        radius: radius // Use the full radius (default 5000m)
      }
    };
  }

  // Add type filters if specified
  if (types && types.length > 0) {
    requestBody.includedPrimaryTypes = types;
  }

  console.log('[LocationService] Sending request to Google Places API:', {
    url,
    requestBody: JSON.stringify(requestBody, null, 2)
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[LocationService] Places API error:', error);
      throw new Error(`Places API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[LocationService] Places API response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('[LocationService] Autocomplete request failed:', error);
    throw error;
  }
}

// Get place types based on event type
function getPlaceTypesForEvent(eventType: string): string[] {
  const typeMap: Record<string, string[]> = {
    lunch: ['restaurant', 'cafe', 'bakery'],
    dinner: ['restaurant', 'bar', 'night_club'],
    coffee: ['cafe', 'bakery'],
    meeting: ['cafe', 'restaurant', 'corporate_office'],
    workout: ['gym', 'sports_complex'],
    shopping: ['shopping_mall', 'department_store', 'clothing_store', 'supermarket'],
    entertainment: ['movie_theater', 'museum', 'tourist_attraction', 'amusement_park']
  };

  return typeMap[eventType.toLowerCase()] || ['establishment'];
}

// Fallback static suggestions
const getStaticSuggestions = (eventType: string): LocationSuggestion[] => {
  const staticSuggestions: Record<string, LocationSuggestion[]> = {
    lunch: [
      { placeId: 'lunch1', mainText: 'The French Laundry', secondaryText: '6640 Washington St, Yountville, CA', types: ['restaurant'] },
      { placeId: 'lunch2', mainText: 'Chez Panisse', secondaryText: '1517 Shattuck Ave, Berkeley, CA', types: ['restaurant'] },
      { placeId: 'lunch3', mainText: 'Sweetgreen', secondaryText: '2 Embarcadero Center, San Francisco, CA', types: ['restaurant'] },
    ],
    dinner: [
      { placeId: 'dinner1', mainText: 'Gary Danko', secondaryText: '800 N Point St, San Francisco, CA', types: ['restaurant'] },
      { placeId: 'dinner2', mainText: 'House of Prime Rib', secondaryText: '1906 Van Ness Ave, San Francisco, CA', types: ['restaurant'] },
      { placeId: 'dinner3', mainText: 'Atelier Crenn', secondaryText: '3127 Fillmore St, San Francisco, CA', types: ['restaurant'] },
    ],
    coffee: [
      { placeId: 'coffee1', mainText: 'Blue Bottle Coffee', secondaryText: '66 Mint St, San Francisco, CA', types: ['cafe'] },
      { placeId: 'coffee2', mainText: 'Philz Coffee', secondaryText: '549 Castro St, San Francisco, CA', types: ['cafe'] },
      { placeId: 'coffee3', mainText: 'Ritual Coffee Roasters', secondaryText: '1026 Valencia St, San Francisco, CA', types: ['cafe'] },
    ],
    meeting: [
      { placeId: 'meeting1', mainText: 'WeWork Salesforce Tower', secondaryText: '415 Mission St, San Francisco, CA', types: ['corporate_office'] },
      { placeId: 'meeting2', mainText: 'The St. Regis San Francisco', secondaryText: '125 3rd St, San Francisco, CA', types: ['lodging'] },
      { placeId: 'meeting3', mainText: 'Soho House', secondaryText: '1812 Telegraph Ave, Oakland, CA', types: ['establishment'] },
    ],
    workout: [
      { placeId: 'gym1', mainText: 'Equinox Sports Club', secondaryText: '747 Market St, San Francisco, CA', types: ['gym'] },
      { placeId: 'gym2', mainText: 'Barry\'s Bootcamp', secondaryText: '2368 Fillmore St, San Francisco, CA', types: ['gym'] },
      { placeId: 'gym3', mainText: 'CrossFit Golden Gate', secondaryText: '1410 Fillmore St, San Francisco, CA', types: ['gym'] },
    ],
    shopping: [
      { placeId: 'shop1', mainText: 'Westfield San Francisco Centre', secondaryText: '865 Market St, San Francisco, CA', types: ['shopping_mall'] },
      { placeId: 'shop2', mainText: 'Union Square', secondaryText: 'Union Square, San Francisco, CA', types: ['shopping_mall'] },
      { placeId: 'shop3', mainText: 'Ferry Building Marketplace', secondaryText: '1 Ferry Building, San Francisco, CA', types: ['shopping_mall', 'food'] },
    ],
    entertainment: [
      { placeId: 'ent1', mainText: 'AMC Metreon 16', secondaryText: '135 4th St, San Francisco, CA', types: ['movie_theater'] },
      { placeId: 'ent2', mainText: 'San Francisco Museum of Modern Art', secondaryText: '151 3rd St, San Francisco, CA', types: ['museum'] },
      { placeId: 'ent3', mainText: 'The Fillmore', secondaryText: '1805 Geary Blvd, San Francisco, CA', types: ['establishment'] },
    ],
  };
  
  return staticSuggestions[eventType.toLowerCase()] || staticSuggestions['meeting'];
};

// Location service
export const locationService = {
  // Search for location suggestions
  async searchLocations(input: string, coordinates?: { lat: number; lng: number }): Promise<LocationSuggestion[]> {
    try {
      const response = await callPlacesAutocomplete(input, undefined, coordinates);
      
      if (response.suggestions) {
        return response.suggestions.map(suggestion => {
          const prediction = suggestion.placePrediction;
          return {
            placeId: prediction.placeId,
            mainText: prediction.structuredFormat?.mainText?.text || prediction.text.text,
            secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
            types: prediction.types || ['establishment']
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('[LocationService] Search failed, using fallback:', error);
      // Return some default suggestions as fallback
      return getStaticSuggestions('meeting').slice(0, 3);
    }
  },

  // Get detailed information about a place
  async getPlaceDetails(placeId: string): Promise<LocationDetails> {
    console.log('[LocationService] getPlaceDetails called for:', placeId);
    
    // First check if this is a static place ID
    const allStaticSuggestions = Object.values({
      lunch: getStaticSuggestions('lunch'),
      dinner: getStaticSuggestions('dinner'),
      coffee: getStaticSuggestions('coffee'),
      meeting: getStaticSuggestions('meeting'),
      workout: getStaticSuggestions('workout'),
      shopping: getStaticSuggestions('shopping'),
      entertainment: getStaticSuggestions('entertainment'),
    }).flat();
    
    const staticSuggestion = allStaticSuggestions.find(s => s.placeId === placeId);
    
    if (staticSuggestion) {
      const location: EventLocation = {
        name: staticSuggestion.mainText,
        address: staticSuggestion.secondaryText,
        placeId: placeId,
        coordinates: {
          lat: 37.7749, // Default SF coordinates
          lng: -122.4194,
        },
        type: staticSuggestion.types?.[0],
        url: `https://www.google.com/maps/search/${encodeURIComponent(staticSuggestion.mainText + ' ' + staticSuggestion.secondaryText)}`,
      };

      return {
        location,
        openingHours: undefined,
        rating: undefined,
        priceLevel: undefined,
        phoneNumber: undefined,
        website: undefined,
      };
    }
    
    // For real place IDs, use the PlacesService
    await loadGoogleMaps();
    
    return new Promise((resolve, reject) => {
      if (!placesService) {
        reject(new Error('Places service not initialized'));
        return;
      }

      const request = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'geometry', 'types', 'url', 'opening_hours', 'rating', 'price_level', 'formatted_phone_number', 'website']
      };

      placesService.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const location: EventLocation = {
            name: place.name || '',
            address: place.formatted_address || '',
            placeId: placeId,
            coordinates: place.geometry?.location ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            } : undefined,
            type: place.types?.[0],
            url: place.url,
          };

          const details: LocationDetails = {
            location,
            openingHours: place.opening_hours ? {
              isOpen: place.opening_hours.isOpen?.() || false,
              weekdayText: place.opening_hours.weekday_text || [],
            } : undefined,
            rating: place.rating,
            priceLevel: place.price_level,
            phoneNumber: place.formatted_phone_number,
            website: place.website,
          };

          resolve(details);
        } else {
          reject(new Error(`Place details error: ${status}`));
        }
      });
    });
  },

  // Geocode an address to get coordinates
  async geocodeAddress(address: string): Promise<EventLocation> {
    if (!geocoder) {
      await loadGoogleMaps();
    }

    return new Promise((resolve, reject) => {
      if (!geocoder) {
        reject(new Error('Geocoder not initialized'));
        return;
      }

      geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const result = results[0];
          const location: EventLocation = {
            name: address,
            address: result.formatted_address,
            placeId: result.place_id,
            coordinates: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            },
          };
          resolve(location);
        } else {
          reject(new Error(`Geocoding error: ${status}`));
        }
      });
    });
  },

  // Get nearby places based on event type and time
  async getSuggestedLocations(
    coordinates: { lat: number; lng: number },
    eventType: string,
    radius: number = 5000
  ): Promise<LocationSuggestion[]> {
    console.log('[LocationService] getSuggestedLocations called with:', { coordinates, eventType, radius });
    
    try {
      // Try to get city name from cache or geolocation data
      let cityContext = '';
      const cachedLocationData = localStorage.getItem('userLocationData');
      if (cachedLocationData) {
        try {
          const locationData = JSON.parse(cachedLocationData);
          if (locationData.city && locationData.region) {
            cityContext = ` in ${locationData.city}, ${locationData.region}`;
          }
        } catch (e) {
          console.warn('Failed to parse cached location data');
        }
      }
      
      // Use the new Places API with appropriate types for the event
      const types = getPlaceTypesForEvent(eventType);
      
      // Create simpler queries based on event type
      let query = '';
      switch (eventType.toLowerCase()) {
        case 'lunch':
          query = 'restaurant';
          break;
        case 'dinner':
          query = 'restaurant';
          break;
        case 'coffee':
          query = 'coffee';
          break;
        case 'meeting':
          query = 'coffee';
          break;
        case 'workout':
          query = 'gym';
          break;
        case 'shopping':
          query = 'shopping';
          break;
        case 'entertainment':
          query = 'entertainment';
          break;
        default:
          query = eventType.toLowerCase();
      }
      
      // Add city context if available (temporarily disabled for debugging)
      // query += cityContext;
      
      console.log('[LocationService] Calling Places API with:', {
        query,
        types,
        coordinates,
        radius
      });
      
      const response = await callPlacesAutocomplete(query, types, coordinates, radius);
      
      if (response.suggestions && response.suggestions.length > 0) {
        const suggestions = response.suggestions.map(suggestion => {
          const prediction = suggestion.placePrediction;
          return {
            placeId: prediction.placeId,
            mainText: prediction.structuredFormat?.mainText?.text || prediction.text.text,
            secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
            types: prediction.types || ['establishment']
          };
        });
        
        console.log('[LocationService] Got', suggestions.length, 'suggestions from Google');
        // Limit to 3 suggestions
        return suggestions.slice(0, 3);
      } else {
        console.log('[LocationService] No suggestions from Google, API returned:', {
          response: response,
          hassuggestions: 'suggestions' in response,
          suggestionsLength: response.suggestions?.length || 0
        });
        // Try a fallback search without types
        console.log('[LocationService] Trying fallback search without type restrictions...');
        const fallbackResponse = await callPlacesAutocomplete(query, undefined, coordinates, radius);
        if (fallbackResponse.suggestions && fallbackResponse.suggestions.length > 0) {
          const suggestions = fallbackResponse.suggestions.map(suggestion => {
            const prediction = suggestion.placePrediction;
            return {
              placeId: prediction.placeId,
              mainText: prediction.structuredFormat?.mainText?.text || prediction.text.text,
              secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
              types: prediction.types || ['establishment']
            };
          });
          console.log('[LocationService] Fallback search got', suggestions.length, 'suggestions');
          return suggestions.slice(0, 3);
        }
        
        // Return empty array if still no results
        return [];
      }
    } catch (error) {
      console.error('[LocationService] Failed to get suggestions:', error);
      // Return empty array instead of static San Francisco suggestions
      return [];
    }
  },

  // Format location for display
  formatLocation(location: EventLocation | string): string {
    if (typeof location === 'string') {
      return location;
    }
    return location.name || location.address;
  },

  // Create Google Maps URL
  createMapsUrl(location: EventLocation | string): string {
    if (typeof location === 'string') {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    }
    
    if (location.url) {
      return location.url;
    }
    
    if (location.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${location.placeId}`;
    }
    
    if (location.coordinates) {
      return `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`;
    }
    
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || location.name)}`;
  },
  
  // Clear location cache (useful for testing)
  clearLocationCache(): void {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationTimestamp');
    localStorage.removeItem('userLocationData');
    console.log('[LocationService] Location cache cleared');
  }
}; 