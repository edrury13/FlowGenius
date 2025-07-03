import { google } from 'googleapis';

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GmailMessage {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  bodyText: string;
  bodyHtml?: string;
}

interface EmailEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  organizer?: string;
  attendees?: string[];
}

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  organizer?: { email: string };
}

class GmailService {
  private auth: any = null;
  private gmail: any = null;
  private calendar: any = null;
  private isConnected = false;
  private config: GmailConfig;

  constructor() {
    this.config = {
      // Use environment variables or hardcoded values for development
      clientId: process.env.GOOGLE_CLIENT_ID || '1015492699121-k4rdjap7i22j3k3h2a6h3m4h9p8n84bt.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOCSPX-demo_secret_key',
      redirectUri: process.env.NODE_ENV === 'development' ? 'http://localhost:3000/auth/google/callback' : 'https://flowgenius.app/auth/google/callback'
    };
  }

  // Initialize OAuth2 client
  private initializeAuth(): void {
    try {
    this.auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      console.log('📧 Google OAuth2 client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google OAuth2:', error);
      throw error;
    }
  }

  // Get OAuth URL for user authentication
  public getAuthUrl(): string {
    if (!this.auth) {
      this.initializeAuth();
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const url = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    console.log('🔗 Generated Google OAuth URL:', url);
    return url;
  }

    // Handle OAuth callback and exchange code for tokens
  public async authenticate(authCode?: string): Promise<boolean> {
    try {
      if (!authCode) {
        // In Electron, use the automatic OAuth flow
        if (window.electronAPI) {
          try {
            console.log('🚀 Starting automatic Google OAuth flow...');
            
            // Use the new automatic OAuth flow
            authCode = await window.electronAPI.startGoogleOAuth();
            
            console.log('✅ Authorization code received automatically');
            
          } catch (error) {
            console.error('Automatic OAuth flow failed:', error);
            console.error('Error details:', error instanceof Error ? error.message : String(error));
            return false;
          }
        } else {
          // In web browser - fallback to manual flow
          const authUrl = this.getAuthUrl();
          window.open(authUrl, '_blank');
          return false; // User needs to complete OAuth flow
        }
      }

      if (!this.auth) {
        this.initializeAuth();
      }

      // Exchange authorization code for tokens
      console.log('🔄 Exchanging authorization code for tokens...');
      const { tokens } = await this.auth.getToken(authCode);
      this.auth.setCredentials(tokens);

      // Store tokens securely
      localStorage.setItem('googleTokens', JSON.stringify(tokens));
      localStorage.setItem('gmailConnected', 'true');
      
      this.isConnected = true;
      console.log('✅ Google authentication successful');

      // Test the connection
      await this.testConnection();
      
      return true;
    } catch (error) {
      console.error('❌ Google authentication failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      this.clearStoredTokens();
      return false;
    }
  }

  // Test the Google API connection
  private async testConnection(): Promise<void> {
    try {
      // Test Gmail API
      const gmailResponse = await this.gmail.users.getProfile({ userId: 'me' });
      console.log('📧 Gmail API test successful:', gmailResponse.data.emailAddress);

      // Test Calendar API
      const calendarResponse = await this.calendar.calendarList.list();
      console.log('📅 Calendar API test successful. Found', calendarResponse.data.items?.length || 0, 'calendars');
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      throw error;
    }
  }

  // Load stored tokens and restore connection
  public async loadStoredTokens(): Promise<boolean> {
    try {
      const storedTokens = localStorage.getItem('googleTokens');
      const isConnected = localStorage.getItem('gmailConnected') === 'true';
      
      if (!storedTokens || !isConnected) {
        return false;
      }

      const tokens = JSON.parse(storedTokens);
      
      if (!this.auth) {
        this.initializeAuth();
      }

      this.auth.setCredentials(tokens);
      
      // Check if tokens are still valid
      try {
        await this.testConnection();
        this.isConnected = true;
        console.log('✅ Restored Google authentication from stored tokens');
        return true;
      } catch (error) {
        console.warn('⚠️ Stored tokens are invalid, clearing them');
        this.clearStoredTokens();
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to load stored Google tokens:', error);
      return false;
    }
  }

  // Clear stored tokens and disconnect
  public clearStoredTokens(): void {
    localStorage.removeItem('googleTokens');
    localStorage.removeItem('gmailConnected');
    this.isConnected = false;
    this.auth = null;
    this.gmail = null;
    this.calendar = null;
    console.log('🧹 Cleared Google authentication tokens');
  }

  // Check connection status
  public isAuthenticated(): boolean {
    return this.isConnected;
  }

  // Get Google Calendar events
  public async getCalendarEvents(timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> {
    if (!this.isConnected || !this.calendar) {
      throw new Error('Google Calendar not authenticated. Please authenticate first.');
    }

    try {
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(now.getMonth() + 1);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: (timeMin || now).toISOString(),
        timeMax: (timeMax || oneMonthFromNow).toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      console.log('📅 Downloaded', events.length, 'events from Google Calendar');
      return events;
    } catch (error) {
      console.error('❌ Failed to fetch calendar events:', error);
      throw error;
    }
  }

  // Upload event to Google Calendar
  public async uploadEventToCalendar(event: any): Promise<GoogleCalendarEvent> {
    if (!this.isConnected || !this.calendar) {
      throw new Error('Google Calendar not authenticated. Please authenticate first.');
    }

    try {
      const googleEvent: GoogleCalendarEvent = {
        summary: event.title,
        description: event.description || '',
        start: {
          dateTime: `${event.date}T${event.startTime || '09:00'}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: `${event.date}T${event.endTime || '10:00'}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: event.attendees?.map((email: string) => ({ email })) || [],
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent,
      });

      console.log('✅ Event uploaded to Google Calendar:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to upload event to Google Calendar:', error);
      throw error;
    }
  }

  // Convert Google Calendar event to FlowGenius format
  public convertGoogleEventToLocal(googleEvent: GoogleCalendarEvent): any {
    const startTime = new Date(googleEvent.start.dateTime);
    const endTime = new Date(googleEvent.end.dateTime);

    return {
      id: `google_${googleEvent.id}`,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      date: startTime.toISOString().split('T')[0],
      startTime: startTime.toTimeString().slice(0, 5),
      endTime: endTime.toTimeString().slice(0, 5),
      attendees: googleEvent.attendees?.map(a => a.email) || [],
      category: 'meeting' as const,
      isRecurring: false,
      source: 'google_calendar'
    };
  }

  // Sync with Google Calendar (two-way sync)
  public async syncWithGoogleCalendar(localEvents: any[]): Promise<{ downloaded: any[], uploaded: any[] }> {
    if (!this.isConnected) {
      throw new Error('Google Calendar not authenticated. Please authenticate first.');
    }

    try {
      console.log('🔄 Starting Google Calendar sync...');

      // 1. Download events from Google Calendar
      const googleEvents = await this.getCalendarEvents();
      const downloadedEvents = googleEvents.map(event => this.convertGoogleEventToLocal(event));

      // 2. Upload new local events to Google Calendar (events without google source)
      const localEventsToUpload = localEvents.filter(event => 
        !event.source || event.source !== 'google_calendar'
      );

      const uploadedEvents = [];
      for (const event of localEventsToUpload) {
        try {
          const uploadedEvent = await this.uploadEventToCalendar(event);
          uploadedEvents.push(uploadedEvent);
          // Add a small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn('⚠️ Failed to upload event:', event.title, error);
        }
      }

      console.log('✅ Google Calendar sync completed');
      console.log('📥 Downloaded:', downloadedEvents.length, 'events');
      console.log('📤 Uploaded:', uploadedEvents.length, 'events');

      return {
        downloaded: downloadedEvents,
        uploaded: uploadedEvents
      };
    } catch (error) {
      console.error('❌ Google Calendar sync failed:', error);
      throw error;
    }
  }

  // Legacy email parsing methods (keeping for backward compatibility)
  public async getRecentEmails(maxResults: number = 20): Promise<GmailMessage[]> {
    if (!this.isConnected || !this.gmail) {
      throw new Error('Gmail not authenticated. Please authenticate first.');
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'has:attachment OR (meeting OR appointment OR event OR schedule)'
      });

      const messages = response.data.messages || [];
      const detailedMessages: GmailMessage[] = [];

      for (const message of messages) {
        try {
          const detail = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = detail.data.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

          // Extract body text (simplified)
          let bodyText = detail.data.snippet || '';
          if (detail.data.payload?.parts) {
            for (const part of detail.data.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                bodyText = Buffer.from(part.body.data, 'base64').toString();
                break;
              }
            }
          }

          detailedMessages.push({
            id: message.id,
            snippet: detail.data.snippet || '',
            subject,
            from,
            date,
            bodyText
          });
        } catch (error) {
          console.warn('⚠️ Failed to fetch email details:', message.id, error);
        }
      }

      console.log('📧 Fetched', detailedMessages.length, 'emails from Gmail');
      return detailedMessages;
    } catch (error) {
      console.error('❌ Failed to fetch Gmail messages:', error);
      throw error;
    }
  }

  // Extract calendar events from email content
  public extractEventsFromEmail(message: GmailMessage): EmailEvent[] {
    const events: EmailEvent[] = [];
    
    try {
      // Simple pattern matching for demo
      const text = `${message.subject} ${message.bodyText}`.toLowerCase();
      
      // Pattern 1: "tomorrow at X PM/AM"
      const tomorrowMatch = text.match(/tomorrow\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
      if (tomorrowMatch) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const timeStr = tomorrowMatch[1];
        const startTime = this.parseTimeString(timeStr, tomorrow);
        
        if (startTime) {
          events.push({
            title: this.extractTitleFromSubject(message.subject),
            description: `From email: ${message.from}`,
            startTime,
            endTime: new Date(startTime.getTime() + 60 * 60 * 1000), // 1 hour default
            organizer: message.from
          });
        }
      }

      // Pattern 2: "Monday at X AM/PM"
      const dayMatch = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
      if (dayMatch) {
        const dayName = dayMatch[1];
        const timeStr = dayMatch[2];
        const targetDate = this.getNextWeekday(dayName);
        const startTime = this.parseTimeString(timeStr, targetDate);
        
        if (startTime) {
          events.push({
            title: this.extractTitleFromSubject(message.subject),
            description: `From email: ${message.from}`,
            startTime,
            endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
            organizer: message.from
          });
        }
      }

      // Pattern 3: Date patterns like "March 15th at 10:30 AM"
      const dateMatch = text.match(/(\w+\s+\d{1,2}(?:st|nd|rd|th)?)\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const timeStr = dateMatch[2];
        const targetDate = this.parseMonthDay(dateStr);
        const startTime = this.parseTimeString(timeStr, targetDate);
        
        if (startTime) {
          events.push({
            title: this.extractTitleFromSubject(message.subject),
            description: `From email: ${message.from}`,
            startTime,
            endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
            organizer: message.from
          });
        }
      }

      console.log(`📅 Extracted ${events.length} events from email: ${message.subject}`);
      return events;
    } catch (error) {
      console.error('❌ Failed to extract events from email:', error);
      return [];
    }
  }

  // Helper methods (keeping existing implementation)
  private parseTimeString(timeStr: string, baseDate: Date): Date | null {
    try {
      const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (!match) return null;

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const ampm = match[3].toLowerCase();

      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      const result = new Date(baseDate);
      result.setHours(hours, minutes, 0, 0);
      return result;
    } catch (error) {
      console.error('❌ Failed to parse time string:', timeStr, error);
      return null;
    }
  }

  private getNextWeekday(dayName: string): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    
    if (targetDay === -1) return new Date();

    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    if (daysUntilTarget <= 0) daysUntilTarget += 7;
    
    const result = new Date(today);
    result.setDate(today.getDate() + daysUntilTarget);
    return result;
  }

  private parseMonthDay(dateStr: string): Date {
    try {
      const currentYear = new Date().getFullYear();
      const parsed = new Date(`${dateStr}, ${currentYear}`);
      
      if (parsed.getTime() < Date.now()) {
        parsed.setFullYear(currentYear + 1);
      }
      
      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse date string:', dateStr, error);
      return new Date();
    }
  }

  private extractTitleFromSubject(subject: string): string {
    // Remove common email prefixes
    return subject
      .replace(/^(re:|fwd?:|fw:)\s*/i, '')
      .replace(/\[.*?\]/g, '')
      .trim() || 'Event from Email';
  }

  // Convert EmailEvent to calendar event format
  public convertToCalendarEvent(emailEvent: EmailEvent): any {
    return {
      id: Date.now().toString(),
      title: emailEvent.title,
      description: emailEvent.description || '',
      date: emailEvent.startTime.toISOString().split('T')[0],
      startTime: emailEvent.startTime.toTimeString().slice(0, 5),
      endTime: emailEvent.endTime.toTimeString().slice(0, 5),
      attendees: emailEvent.attendees || [],
      category: 'meeting' as const,
      isRecurring: false,
      source: 'gmail_email'
    };
  }
}

// Singleton instance
const gmailService = new GmailService();

export default gmailService;
export type { GmailMessage, EmailEvent, GoogleCalendarEvent }; 