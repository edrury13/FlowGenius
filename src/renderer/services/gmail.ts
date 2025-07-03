// Google Calendar Service - IPC-based implementation

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  recurrence?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  created: string;
  updated: string;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  htmlLink?: string;
  colorId?: string;
}

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
  foregroundColor?: string;
  timeZone?: string;
}

interface CreateEventRequest {
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
  location?: string;
  attendees?: Array<{
    email: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

class GoogleCalendarService {
  private userInfo: GoogleUserInfo | null = null;
  public isAuthenticated: boolean = false;
  private lastSyncTime: Date | null = null;

  constructor() {
    this.checkAuthStatus();
  }

  private async checkAuthStatus(): Promise<void> {
    try {
      if (window.electronAPI?.getGoogleAuthStatus) {
        const status = await window.electronAPI.getGoogleAuthStatus();
        this.isAuthenticated = status.isAuthenticated;
        this.userInfo = status.userInfo;
        console.log('📅 Google auth status:', this.isAuthenticated ? 'authenticated' : 'not authenticated');
      }
    } catch (error) {
      console.error('❌ Failed to check auth status:', error);
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 Starting Google Calendar authentication...');
      
      if (window.electronAPI?.startGoogleOAuth) {
        const authCode = await window.electronAPI.startGoogleOAuth();
        
        if (authCode) {
          console.log('✅ Authentication successful');
          await this.checkAuthStatus();
          return this.isAuthenticated;
        }
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
    }
    return false;
  }

  async signOut(): Promise<boolean> {
    try {
      if (window.electronAPI?.signOutGoogle) {
        await window.electronAPI.signOutGoogle();
        this.isAuthenticated = false;
        this.userInfo = null;
        this.lastSyncTime = null;
        console.log('🚪 Signed out from Google');
        return true;
      }
    } catch (error) {
      console.error('❌ Sign out failed:', error);
    }
    return false;
  }

  async syncCalendar(): Promise<boolean> {
    try {
      if (!this.isAuthenticated) {
        console.log('⚠️ Not authenticated, skipping sync');
        return false;
      }

      if (window.electronAPI?.syncGoogleCalendar) {
        const result = await window.electronAPI.syncGoogleCalendar();
        this.lastSyncTime = result.lastSync ? new Date(result.lastSync) : null;
        console.log('✅ Calendar sync completed');
        return result.success;
      }
    } catch (error) {
      console.error('❌ Calendar sync failed:', error);
    }
    return false;
  }

  async getCalendars(useCache: boolean = false): Promise<Calendar[]> {
    try {
      if (!this.isAuthenticated) {
        console.log('⚠️ Not authenticated, cannot get calendars');
        return [];
      }

      if (window.electronAPI?.getGoogleCalendars) {
        const calendars = await window.electronAPI.getGoogleCalendars(useCache);
        console.log(`📅 Retrieved ${calendars.length} calendars`);
        return calendars;
      }
    } catch (error) {
      console.error('❌ Failed to get calendars:', error);
    }
    return [];
  }

  async getEvents(options: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    useCache?: boolean;
  } = {}): Promise<CalendarEvent[]> {
    try {
      if (!this.isAuthenticated) {
        console.log('⚠️ Not authenticated, cannot get events');
        return [];
      }

      if (window.electronAPI?.getGoogleCalendarEvents) {
        const events = await window.electronAPI.getGoogleCalendarEvents(options);
        console.log(`📅 Retrieved ${events.length} events`);
        return events;
      }
    } catch (error) {
      console.error('❌ Failed to get events:', error);
    }
    return [];
  }

  async createEvent(calendarId: string = 'primary', event: CreateEventRequest): Promise<CalendarEvent | null> {
    try {
      if (!this.isAuthenticated) {
        console.log('⚠️ Not authenticated, cannot create event');
        return null;
      }

      if (window.electronAPI?.createGoogleCalendarEvent) {
        const createdEvent = await window.electronAPI.createGoogleCalendarEvent(calendarId, event);
        console.log('✅ Event created:', createdEvent.summary);
        return createdEvent;
      }
    } catch (error) {
      console.error('❌ Failed to create event:', error);
    }
    return null;
  }

  async updateEvent(calendarId: string = 'primary', eventId: string, event: Partial<CreateEventRequest>): Promise<CalendarEvent | null> {
    try {
      if (!this.isAuthenticated) {
        console.log('⚠️ Not authenticated, cannot update event');
        return null;
      }

      if (window.electronAPI?.updateGoogleCalendarEvent) {
        const updatedEvent = await window.electronAPI.updateGoogleCalendarEvent(calendarId, eventId, event);
        console.log('✅ Event updated:', updatedEvent.summary);
        return updatedEvent;
      }
    } catch (error) {
      console.error('❌ Failed to update event:', error);
    }
    return null;
  }

  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<boolean> {
    try {
      if (!this.isAuthenticated) {
        console.log('⚠️ Not authenticated, cannot delete event');
        return false;
      }

      if (window.electronAPI?.deleteGoogleCalendarEvent) {
        const result = await window.electronAPI.deleteGoogleCalendarEvent(calendarId, eventId);
        console.log('✅ Event deleted');
        return result.success;
      }
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
    }
    return false;
  }

  async syncWithGoogleCalendar(localEvents: any[]): Promise<{ uploaded: number; downloaded: any[] }> {
    try {
      console.log('🔄 Syncing with Google Calendar...');
      
      if (!this.isAuthenticated) {
        console.log('⚠️ Not authenticated, skipping sync');
        return { uploaded: 0, downloaded: [] };
      }

      // First, sync calendar data
      await this.syncCalendar();

      // Get events from the last 7 days to next 30 days
      const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const googleEvents = await this.getEvents({ timeMin, timeMax });
      
      // Convert Google events to local format
      const downloadedEvents = googleEvents.map(event => ({
        id: event.id,
        title: event.summary,
        date: event.start.date || event.start.dateTime?.split('T')[0] || '',
        startTime: event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }) : '',
        endTime: event.end.dateTime ? new Date(event.end.dateTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }) : '',
        location: event.location || '',
        description: event.description || '',
        source: 'google_calendar' as const,
        category: 'meeting' as const
      }));

      // TODO: Upload local events to Google Calendar
      // For now, just return the downloaded events
      
      console.log(`✅ Sync completed: ${downloadedEvents.length} events downloaded`);
      
      return {
        uploaded: 0, // TODO: Implement uploading local events
        downloaded: downloadedEvents
      };
    } catch (error) {
      console.error('❌ Calendar sync failed:', error);
      return { uploaded: 0, downloaded: [] };
    }
  }

  getUserInfo(): GoogleUserInfo | null {
    return this.userInfo;
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  // Legacy methods for backward compatibility
  async getEmails(maxResults: number = 10): Promise<any[]> {
    console.log('📧 getEmails called - this service now handles Calendar, not Gmail');
    return [];
  }

  async getRecentEmails(maxResults: number = 10): Promise<any[]> {
    console.log('📧 getRecentEmails called - this service now handles Calendar, not Gmail');
    return [];
  }

  extractEventsFromEmail(email: any): any[] {
    console.log('📧 extractEventsFromEmail called - this service now handles Calendar, not Gmail');
    return [];
  }

  convertToCalendarEvent(emailEvent: any): any {
    console.log('📧 convertToCalendarEvent called - this service now handles Calendar, not Gmail');
    return null;
  }
}

// Export singleton instance
const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService; 