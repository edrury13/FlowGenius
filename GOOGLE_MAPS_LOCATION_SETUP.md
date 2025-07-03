# Google Maps Location Setup for FlowGenius

This guide will walk you through setting up Google Maps integration for location features in FlowGenius.

## Prerequisites

You need to have a Google Cloud Platform account with billing enabled.

## Setup Steps

### 1. Enable Required APIs

In your Google Cloud Console, enable the following APIs:
- **Places API** - For location autocomplete and place details
- **Geocoding API** - For converting addresses to coordinates
- **Maps JavaScript API** - For displaying maps (if needed in the future)

### 2. Create an API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Click "Create Credentials" > "API Key"
4. Copy the generated API key

### 3. Restrict Your API Key (Recommended)

For security, restrict your API key:
1. Click on your API key in the credentials list
2. Under "API restrictions", select "Restrict key"
3. Select the APIs you enabled: Places API, Geocoding API, Maps JavaScript API
4. Under "Application restrictions", you can:
   - For development: Select "None" 
   - For production: Select "HTTP referrers" and add your domain

### 4. Add API Key to FlowGenius

Add the following to your `.env` file in the FlowGenius directory:

```
GOOGLE_API_KEY=your_api_key_here
```

### 5. Rebuild and Run

After adding the API key, rebuild the application:

```bash
npm run build
npm start
```

## Features Available

With Google Maps integration, you can:

1. **Location Autocomplete**: Start typing a location name and get suggestions
2. **Place Details**: Get detailed information about selected locations
3. **Smart Location Suggestions**: Based on event type (e.g., restaurants for lunch meetings)
4. **Google Maps Links**: Direct links to view locations on Google Maps

## Usage in Events

When creating or editing an event:
1. Click on the Location field
2. Start typing a place name or address
3. Select from the dropdown suggestions
4. The location will be saved with full details including coordinates

## Troubleshooting

### "Failed to load Google Maps" Error
- Check that your API key is correctly set in the `.env` file
- Ensure the required APIs are enabled in Google Cloud Console
- Check your API key restrictions

### No Location Suggestions Appearing
- Verify the Places API is enabled
- Check browser console for any errors
- Ensure you have an active internet connection

### API Key Quota Exceeded
- Google provides $200 free credit monthly
- Monitor your usage in the Google Cloud Console
- Consider implementing caching to reduce API calls

## Privacy Note

Location data is processed through Google's services. The coordinates and place details are stored locally with your events. No location data is shared with FlowGenius servers. 