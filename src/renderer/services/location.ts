import { EventLocation } from '../types';

// Google Maps API types
declare global {
  interface Window {
    google: typeof google;
  }
}

// Initialize Google Maps
let autocompleteService: google.maps.places.AutocompleteService | null = null;
let geocoder: google.maps.Geocoder | null = null;
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

  autocompleteService = new window.google.maps.places.AutocompleteService();
  geocoder = new window.google.maps.Geocoder();
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

// Location service
export const locationService = {
  // Search for location suggestions
  async searchLocations(input: string): Promise<LocationSuggestion[]> {
    if (!autocompleteService) {
      await loadGoogleMaps();
    }

    return new Promise((resolve, reject) => {
      if (!autocompleteService) {
        reject(new Error('Autocomplete service not initialized'));
        return;
      }

      const request: google.maps.places.AutocompletionRequest = {
        input,
        types: ['establishment', 'geocode'],
      };

      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const suggestions: LocationSuggestion[] = predictions.map(prediction => ({
            placeId: prediction.place_id,
            mainText: prediction.structured_formatting.main_text,
            secondaryText: prediction.structured_formatting.secondary_text || '',
            types: prediction.types || [],
          }));
          resolve(suggestions);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  },

  // Get detailed information about a place
  async getPlaceDetails(placeId: string): Promise<LocationDetails> {
    console.log('[LocationService] getPlaceDetails called for:', placeId);
    
    // Since we're using static data, we'll return details based on the placeId
    // In a real implementation, this would call the new Google Places API
    
    const allSuggestions: LocationSuggestion[] = [
      // Lunch places
      { placeId: 'lunch1', mainText: 'The French Laundry', secondaryText: '6640 Washington St, Yountville, CA', types: ['restaurant'] },
      { placeId: 'lunch2', mainText: 'Chez Panisse', secondaryText: '1517 Shattuck Ave, Berkeley, CA', types: ['restaurant'] },
      { placeId: 'lunch3', mainText: 'Sweetgreen', secondaryText: '2 Embarcadero Center, San Francisco, CA', types: ['restaurant', 'healthy'] },
      // Dinner places
      { placeId: 'dinner1', mainText: 'Gary Danko', secondaryText: '800 N Point St, San Francisco, CA', types: ['restaurant', 'fine_dining'] },
      { placeId: 'dinner2', mainText: 'House of Prime Rib', secondaryText: '1906 Van Ness Ave, San Francisco, CA', types: ['restaurant'] },
      { placeId: 'dinner3', mainText: 'Atelier Crenn', secondaryText: '3127 Fillmore St, San Francisco, CA', types: ['restaurant', 'fine_dining'] },
      // Coffee places
      { placeId: 'coffee1', mainText: 'Blue Bottle Coffee', secondaryText: '66 Mint St, San Francisco, CA', types: ['cafe', 'coffee_shop'] },
      { placeId: 'coffee2', mainText: 'Philz Coffee', secondaryText: '549 Castro St, San Francisco, CA', types: ['cafe', 'coffee_shop'] },
      { placeId: 'coffee3', mainText: 'Ritual Coffee Roasters', secondaryText: '1026 Valencia St, San Francisco, CA', types: ['cafe', 'coffee_shop'] },
      // Meeting places
      { placeId: 'meeting1', mainText: 'WeWork Salesforce Tower', secondaryText: '415 Mission St, San Francisco, CA', types: ['coworking_space'] },
      { placeId: 'meeting2', mainText: 'The St. Regis San Francisco', secondaryText: '125 3rd St, San Francisco, CA', types: ['hotel', 'meeting_space'] },
      { placeId: 'meeting3', mainText: 'Soho House', secondaryText: '1812 Telegraph Ave, Oakland, CA', types: ['club', 'meeting_space'] },
      // Workout places
      { placeId: 'gym1', mainText: 'Equinox Sports Club', secondaryText: '747 Market St, San Francisco, CA', types: ['gym'] },
      { placeId: 'gym2', mainText: 'Barry\'s Bootcamp', secondaryText: '2368 Fillmore St, San Francisco, CA', types: ['gym', 'fitness'] },
      { placeId: 'gym3', mainText: 'CrossFit Golden Gate', secondaryText: '1410 Fillmore St, San Francisco, CA', types: ['gym', 'crossfit'] },
    ];
    
    const suggestion = allSuggestions.find(s => s.placeId === placeId);
    
    if (!suggestion) {
      throw new Error(`Place not found: ${placeId}`);
    }
    
    const location: EventLocation = {
      name: suggestion.mainText,
      address: suggestion.secondaryText,
      placeId: placeId,
      coordinates: {
        lat: 37.7749, // Default SF coordinates
        lng: -122.4194,
      },
      type: suggestion.types?.[0],
      url: `https://www.google.com/maps/search/${encodeURIComponent(suggestion.mainText + ' ' + suggestion.secondaryText)}`,
    };

    const details: LocationDetails = {
      location,
      // Static details for demo purposes
      openingHours: undefined,
      rating: undefined,
      priceLevel: undefined,
      phoneNumber: undefined,
      website: undefined,
    };

    return details;
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
    
    // Since AutocompleteService is deprecated for new customers, use static suggestions
    // These can be replaced with the new AutocompleteSuggestion API later
    
    const staticSuggestions: Record<string, LocationSuggestion[]> = {
      lunch: [
        { placeId: 'lunch1', mainText: 'The French Laundry', secondaryText: '6640 Washington St, Yountville, CA', types: ['restaurant'] },
        { placeId: 'lunch2', mainText: 'Chez Panisse', secondaryText: '1517 Shattuck Ave, Berkeley, CA', types: ['restaurant'] },
        { placeId: 'lunch3', mainText: 'Sweetgreen', secondaryText: '2 Embarcadero Center, San Francisco, CA', types: ['restaurant', 'healthy'] },
      ],
      dinner: [
        { placeId: 'dinner1', mainText: 'Gary Danko', secondaryText: '800 N Point St, San Francisco, CA', types: ['restaurant', 'fine_dining'] },
        { placeId: 'dinner2', mainText: 'House of Prime Rib', secondaryText: '1906 Van Ness Ave, San Francisco, CA', types: ['restaurant'] },
        { placeId: 'dinner3', mainText: 'Atelier Crenn', secondaryText: '3127 Fillmore St, San Francisco, CA', types: ['restaurant', 'fine_dining'] },
      ],
      coffee: [
        { placeId: 'coffee1', mainText: 'Blue Bottle Coffee', secondaryText: '66 Mint St, San Francisco, CA', types: ['cafe', 'coffee_shop'] },
        { placeId: 'coffee2', mainText: 'Philz Coffee', secondaryText: '549 Castro St, San Francisco, CA', types: ['cafe', 'coffee_shop'] },
        { placeId: 'coffee3', mainText: 'Ritual Coffee Roasters', secondaryText: '1026 Valencia St, San Francisco, CA', types: ['cafe', 'coffee_shop'] },
      ],
      meeting: [
        { placeId: 'meeting1', mainText: 'WeWork Salesforce Tower', secondaryText: '415 Mission St, San Francisco, CA', types: ['coworking_space'] },
        { placeId: 'meeting2', mainText: 'The St. Regis San Francisco', secondaryText: '125 3rd St, San Francisco, CA', types: ['hotel', 'meeting_space'] },
        { placeId: 'meeting3', mainText: 'Soho House', secondaryText: '1812 Telegraph Ave, Oakland, CA', types: ['club', 'meeting_space'] },
      ],
      workout: [
        { placeId: 'gym1', mainText: 'Equinox Sports Club', secondaryText: '747 Market St, San Francisco, CA', types: ['gym'] },
        { placeId: 'gym2', mainText: 'Barry\'s Bootcamp', secondaryText: '2368 Fillmore St, San Francisco, CA', types: ['gym', 'fitness'] },
        { placeId: 'gym3', mainText: 'CrossFit Golden Gate', secondaryText: '1410 Fillmore St, San Francisco, CA', types: ['gym', 'crossfit'] },
      ],
      shopping: [
        { placeId: 'shop1', mainText: 'Westfield San Francisco Centre', secondaryText: '865 Market St, San Francisco, CA', types: ['shopping_mall'] },
        { placeId: 'shop2', mainText: 'Union Square', secondaryText: 'Union Square, San Francisco, CA', types: ['shopping_area'] },
        { placeId: 'shop3', mainText: 'Ferry Building Marketplace', secondaryText: '1 Ferry Building, San Francisco, CA', types: ['shopping_mall', 'food'] },
      ],
      entertainment: [
        { placeId: 'ent1', mainText: 'AMC Metreon 16', secondaryText: '135 4th St, San Francisco, CA', types: ['movie_theater'] },
        { placeId: 'ent2', mainText: 'San Francisco Museum of Modern Art', secondaryText: '151 3rd St, San Francisco, CA', types: ['museum'] },
        { placeId: 'ent3', mainText: 'The Fillmore', secondaryText: '1805 Geary Blvd, San Francisco, CA', types: ['music_venue'] },
      ],
    };
    
    const suggestions = staticSuggestions[eventType.toLowerCase()] || staticSuggestions['meeting'];
    console.log('[LocationService] Returning static suggestions:', suggestions.length);
    
    return suggestions;
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
}; 