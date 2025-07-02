# Google Calendar Integration Setup

## Overview

FlowGenius now includes powerful **two-way sync** with Google Calendar, allowing you to:

- 📥 **Download events** from your Google Calendar into FlowGenius
- 📤 **Upload FlowGenius events** to your Google Calendar
- 📧 **Import events** from Gmail emails (meetings, appointments, etc.)
- 🔄 **Keep calendars in sync** automatically

## Quick Start

1. **Connect to Google Calendar**:
   - Click the "📅 Gmail" button in the header
   - Click "Connect Google Calendar"
   - Follow the OAuth flow to authenticate

2. **Automatic Sync**:
   - After connecting, FlowGenius will automatically sync your calendars
   - Your Google Calendar events will appear in FlowGenius
   - Your FlowGenius events will be uploaded to Google Calendar

3. **Manual Sync**:
   - Click "🔄 Sync with Google Calendar" anytime to refresh
   - Import specific events from Gmail emails using "📧 Import from Gmail Emails"

## Features

### ✅ Two-Way Calendar Sync
- **Download**: Pulls events from your primary Google Calendar
- **Upload**: Pushes FlowGenius events to Google Calendar
- **Merge**: Intelligently combines events without duplicates
- **Real-time**: Notifications are set up for all synced events

### ✅ Gmail Email Parsing
- **Smart Detection**: Finds meetings, appointments, and events in emails
- **Pattern Recognition**: Supports various date/time formats
- **Auto-Creation**: Creates calendar events from email content
- **Context Preservation**: Includes email sender and details

### ✅ Conflict Avoidance
- **Duplicate Prevention**: Won't create duplicate events
- **Source Tracking**: Tracks where each event came from
- **Smart Merging**: Combines similar events intelligently

## OAuth Setup (For Developers)

### Google Cloud Console Setup

1. **Create a Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable APIs**:
   - Enable "Gmail API"
   - Enable "Google Calendar API"

3. **Create OAuth Credentials**:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Desktop application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (development)
     - `https://flowgenius.app/auth/google/callback` (production)

4. **Configure Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

### Development Setup

The app includes demo credentials for testing, but for production use:

1. **Set Environment Variables**:
   ```bash
   # Add to your .env file
   GOOGLE_CLIENT_ID=1015492699121-xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
   ```

2. **Update Redirect URI**:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: Your app's callback URL

## Usage Guide

### Initial Connection

1. **First Time Setup**:
   ```
   📅 Click "Gmail" button → "Connect Google Calendar"
   → Follow OAuth → Automatic sync starts
   ```

2. **Authentication Flow**:
   - Browser opens with Google OAuth
   - Grant permissions for Calendar and Gmail
   - Return to FlowGenius for automatic sync

### Syncing Events

1. **Automatic Sync** (Recommended):
   - Happens automatically after connection
   - Downloads your Google Calendar events
   - Uploads your FlowGenius events

2. **Manual Sync**:
   - Use "🔄 Sync with Google Calendar" button
   - Useful for refreshing data
   - Safe to run multiple times

3. **Email Import**:
   - Use "📧 Import from Gmail Emails"
   - Scans recent emails for events
   - Creates calendar entries automatically

### Event Management

1. **Event Sources**:
   - `google_calendar`: Downloaded from Google Calendar
   - `gmail_email`: Extracted from Gmail emails
   - `local`: Created directly in FlowGenius

2. **Duplicate Handling**:
   - Events are deduplicated by title, date, and time
   - Safe to sync multiple times
   - Source tracking prevents conflicts

## Supported Email Patterns

The Gmail email parser recognizes these patterns:

### Date/Time Patterns
- `"tomorrow at 2 PM"`
- `"Monday at 10:30 AM"`
- `"March 15th at 9:00 AM"`
- `"Friday at 3 PM"`

### Event Types
- Meeting invitations
- Appointment confirmations
- Event announcements
- Schedule notifications

### Example Email Recognition
```
Subject: "Team Meeting Tomorrow"
Body: "We have a team meeting tomorrow at 2:00 PM in Conference Room A"
→ Creates: "Team Meeting" event for tomorrow at 2:00 PM
```

## Troubleshooting

### Connection Issues

1. **"Authentication Failed"**:
   - Check internet connection
   - Verify OAuth credentials
   - Try disconnecting and reconnecting

2. **"Sync Failed"**:
   - Check Google Calendar permissions
   - Verify API quotas in Google Cloud Console
   - Try manual sync instead of automatic

3. **"No Events Found"**:
   - Check date range (syncs 1 month forward)
   - Verify you have events in Google Calendar
   - Check primary calendar vs other calendars

### Permission Issues

1. **"Access Denied"**:
   - Re-authenticate with full permissions
   - Check OAuth scope includes calendar access
   - Verify Gmail API is enabled

2. **"Quota Exceeded"**:
   - Wait for quota reset (daily/hourly limits)
   - Reduce sync frequency
   - Check Google Cloud Console quotas

## Privacy & Security

### Data Handling
- **Local Storage**: Tokens stored locally in browser
- **No Server**: Direct connection to Google APIs
- **Encryption**: OAuth tokens are encrypted
- **Permissions**: Only requests necessary scopes

### What We Access
- **Calendar**: Read/write events on primary calendar
- **Gmail**: Read-only access to recent emails
- **Profile**: Basic profile info for authentication

### What We Don't Access
- **Email Content**: Only scans for event patterns
- **Other Calendars**: Only primary calendar unless specified
- **Contacts**: No access to contact information
- **Files**: No access to Google Drive or attachments

## API Limits

### Google Calendar API
- **Quota**: 1,000,000 requests per day
- **Rate Limit**: 100 requests per 100 seconds per user
- **Burst**: Short bursts allowed

### Gmail API
- **Quota**: 1,000,000 requests per day
- **Rate Limit**: 250 requests per user per second
- **Email Limit**: 20 recent emails per sync

## Support

For issues with Google Calendar integration:

1. **Check Console Logs**: Open browser DevTools → Console
2. **Test Connection**: Use "Test Connection" in settings
3. **Re-authenticate**: Disconnect and reconnect
4. **Report Issues**: Include console logs and error messages

---

🎉 **Ready to sync!** Click the Gmail button and connect your Google Calendar to get started. 