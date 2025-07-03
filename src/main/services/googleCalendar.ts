import googleAuthService from './googleAuth';

export interface CalendarEvent {
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

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
  foregroundColor?: string;
  timeZone?: string;
}

export interface CreateEventRequest {
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

class GoogleCalendarService {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';
  private lastSyncTime: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private calendars: Calendar[] = [];
  private events: Map<string, CalendarEvent[]> = new Map();

  constructor() {
    console.log('📅 GoogleCalendarService initialized');
    
    // Start periodic sync if user is already authenticated
    if (googleAuthService.isAuthenticated()) {
      this.startPeriodicSync();
    }
  }

  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!googleAuthService.isAuthenticated()) {
      throw new Error('User not authenticated with Google');
    }

    const accessToken = await googleAuthService.getValidAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Calendar API error: ${response.status} ${errorText}`);
      throw new Error(`Calendar API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  public async getCalendars(): Promise<Calendar[]> {
    console.log('📅 Fetching calendars...');
    
    try {
      const response = await this.makeApiRequest('/users/me/calendarList');
      
      this.calendars = response.items.map((item: any) => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        primary: item.primary,
        accessRole: item.accessRole,
        backgroundColor: item.backgroundColor,
        foregroundColor: item.foregroundColor,
        timeZone: item.timeZone,
      }));

      console.log(`✅ Found ${this.calendars.length} calendars`);
      return this.calendars;
    } catch (error) {
      console.error('❌ Failed to fetch calendars:', error);
      throw error;
    }
  }

  public async getEvents(calendarId: string = 'primary', options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  } = {}): Promise<CalendarEvent[]> {
    console.log(`📅 Fetching events for calendar: ${calendarId}`);

    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500', // Google's max
      ...options,
    } as Record<string, string>);

    try {
      const response = await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
      
      const events: CalendarEvent[] = response.items.map((item: any) => ({
        id: item.id,
        summary: item.summary || 'No Title',
        description: item.description,
        start: item.start,
        end: item.end,
        location: item.location,
        attendees: item.attendees,
        recurrence: item.recurrence,
        status: item.status,
        created: item.created,
        updated: item.updated,
        creator: item.creator,
        organizer: item.organizer,
        htmlLink: item.htmlLink,
        colorId: item.colorId,
      }));

      // Cache events
      this.events.set(calendarId, events);

      console.log(`✅ Found ${events.length} events for calendar: ${calendarId}`);
      return events;
    } catch (error) {
      console.error(`❌ Failed to fetch events for calendar ${calendarId}:`, error);
      throw error;
    }
  }

  public async getAllEvents(options: {
    timeMin?: string;
    timeMax?: string;
  } = {}): Promise<CalendarEvent[]> {
    console.log('📅 Fetching events from all calendars...');

    // Get calendars first
    const calendars = await this.getCalendars();
    
    // Fetch events from all calendars in parallel
    const eventPromises = calendars
      .filter(cal => cal.accessRole !== 'freeBusyReader') // Skip calendars we can't read events from
      .map(cal => this.getEvents(cal.id, options));

    try {
      const eventsArrays = await Promise.all(eventPromises);
      const allEvents = eventsArrays.flat();

      // Sort by start time
      allEvents.sort((a, b) => {
        const aTime = a.start.dateTime || a.start.date || '';
        const bTime = b.start.dateTime || b.start.date || '';
        return aTime.localeCompare(bTime);
      });

      console.log(`✅ Total events across all calendars: ${allEvents.length}`);
      return allEvents;
    } catch (error) {
      console.error('❌ Failed to fetch events from all calendars:', error);
      throw error;
    }
  }

  public async createEvent(calendarId: string = 'primary', event: CreateEventRequest): Promise<CalendarEvent> {
    console.log(`📅 Creating event in calendar: ${calendarId}`);
    console.log('Event data:', { summary: event.summary, start: event.start, end: event.end });

    try {
      const response = await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        body: JSON.stringify(event),
      });

      const createdEvent: CalendarEvent = {
        id: response.id,
        summary: response.summary,
        description: response.description,
        start: response.start,
        end: response.end,
        location: response.location,
        attendees: response.attendees,
        recurrence: response.recurrence,
        status: response.status,
        created: response.created,
        updated: response.updated,
        creator: response.creator,
        organizer: response.organizer,
        htmlLink: response.htmlLink,
        colorId: response.colorId,
      };

      console.log(`✅ Created event: ${createdEvent.summary} (ID: ${createdEvent.id})`);
      
      // Refresh cached events for this calendar
      this.getEvents(calendarId).catch(console.error);

      return createdEvent;
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      throw error;
    }
  }

  public async updateEvent(calendarId: string = 'primary', eventId: string, event: Partial<CreateEventRequest>): Promise<CalendarEvent> {
    console.log(`📅 Updating event ${eventId} in calendar: ${calendarId}`);

    try {
      const response = await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(event),
      });

      const updatedEvent: CalendarEvent = {
        id: response.id,
        summary: response.summary,
        description: response.description,
        start: response.start,
        end: response.end,
        location: response.location,
        attendees: response.attendees,
        recurrence: response.recurrence,
        status: response.status,
        created: response.created,
        updated: response.updated,
        creator: response.creator,
        organizer: response.organizer,
        htmlLink: response.htmlLink,
        colorId: response.colorId,
      };

      console.log(`✅ Updated event: ${updatedEvent.summary}`);
      
      // Refresh cached events for this calendar
      this.getEvents(calendarId).catch(console.error);

      return updatedEvent;
    } catch (error) {
      console.error('❌ Failed to update event:', error);
      throw error;
    }
  }

  public async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    console.log(`📅 Deleting event ${eventId} from calendar: ${calendarId}`);

    try {
      await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
        method: 'DELETE',
      });

      console.log(`✅ Deleted event: ${eventId}`);
      
      // Refresh cached events for this calendar
      this.getEvents(calendarId).catch(console.error);
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      throw error;
    }
  }

  public async syncEvents(): Promise<void> {
    console.log('🔄 Starting calendar sync...');
    
    try {
      // Sync events from the last 30 days to next 90 days
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      await this.getAllEvents({ timeMin, timeMax });
      
      this.lastSyncTime = new Date();
      console.log('✅ Calendar sync completed');
    } catch (error) {
      console.error('❌ Calendar sync failed:', error);
      throw error;
    }
  }

  public startPeriodicSync(intervalMinutes: number = 15): void {
    console.log(`🔄 Starting periodic calendar sync (every ${intervalMinutes} minutes)`);
    
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync
    this.syncEvents().catch(console.error);

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncEvents().catch(console.error);
    }, intervalMinutes * 60 * 1000);
  }

  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Stopped periodic calendar sync');
    }
  }

  public getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  public getCachedEvents(calendarId?: string): CalendarEvent[] {
    if (calendarId) {
      return this.events.get(calendarId) || [];
    }
    
    // Return all cached events from all calendars
    const allEvents: CalendarEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    
    return allEvents.sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || '';
      const bTime = b.start.dateTime || b.start.date || '';
      return aTime.localeCompare(bTime);
    });
  }

  public getCachedCalendars(): Calendar[] {
    return [...this.calendars];
  }

  public clearCache(): void {
    this.events.clear();
    this.calendars = [];
    console.log('🗑️ Cleared calendar cache');
  }
}

// Export singleton instance
const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService; 