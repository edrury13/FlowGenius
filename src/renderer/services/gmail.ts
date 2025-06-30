import { google } from 'googleapis';

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface EmailEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  organizer?: string;
}

interface GmailMessage {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
}

class GmailService {
  private auth: any = null;
  private gmail: any = null;
  private isConnected = false;
  private config: GmailConfig;
  private mockMode = true; // For now, use mock mode

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: 'http://localhost:3000/auth/google/callback'
    };
  }

  // Initialize OAuth2 client
  private initializeAuth(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Gmail OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    this.auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  // Get OAuth URL for user authentication
  public getAuthUrl(): string {
    if (this.mockMode) {
      return 'https://accounts.google.com/oauth/authorize?mock=true';
    }
    
    // Real implementation would return actual Google OAuth URL
    return 'https://accounts.google.com/oauth/authorize';
  }

  // Mock authentication for development
  public async authenticate(authCode?: string): Promise<boolean> {
    try {
      // In mock mode, simulate successful authentication
      if (this.mockMode) {
        this.isConnected = true;
        localStorage.setItem('gmailConnected', 'true');
        console.log('✅ Gmail authentication successful (mock mode)');
        return true;
      }

      // Real implementation would handle actual OAuth flow
      console.log('❌ Real Gmail authentication not implemented yet');
      return false;
    } catch (error) {
      console.error('❌ Gmail authentication failed:', error);
      return false;
    }
  }

  // Load stored connection status
  public async loadStoredTokens(): Promise<boolean> {
    try {
      const isConnected = localStorage.getItem('gmailConnected') === 'true';
      this.isConnected = isConnected;
      return isConnected;
    } catch (error) {
      console.error('❌ Failed to load Gmail connection status:', error);
      return false;
    }
  }

  // Clear stored tokens
  public clearStoredTokens(): void {
    localStorage.removeItem('gmailConnected');
    this.isConnected = false;
  }

  // Check connection status
  public isAuthenticated(): boolean {
    return this.isConnected;
  }

  // Get mock emails for development
  public async getRecentEmails(maxResults: number = 20): Promise<GmailMessage[]> {
    if (!this.isConnected) {
      throw new Error('Gmail not authenticated. Please authenticate first.');
    }

    // Mock emails for development
    const mockEmails: GmailMessage[] = [
      {
        id: '1',
        snippet: 'Team meeting tomorrow at 2 PM in Conference Room A. Please confirm your attendance.',
        subject: 'Team Meeting - Tomorrow 2 PM',
        from: 'manager@company.com',
        date: new Date().toISOString(),
        bodyText: 'Hi Team,\n\nWe have a team meeting scheduled for tomorrow at 2:00 PM in Conference Room A.\n\nAgenda:\n- Project updates\n- Sprint planning\n- Q&A\n\nPlease confirm your attendance.\n\nBest regards,\nManager',
        bodyHtml: '<p>Hi Team,</p><p>We have a team meeting scheduled for <strong>tomorrow at 2:00 PM</strong> in Conference Room A.</p>'
      },
      {
        id: '2',
        snippet: 'Dentist appointment scheduled for Friday, March 15th at 10:30 AM.',
        subject: 'Appointment Confirmation - Dr. Smith',
        from: 'appointments@dental.com',
        date: new Date().toISOString(),
        bodyText: 'Dear Patient,\n\nThis is to confirm your appointment with Dr. Smith on Friday, March 15th at 10:30 AM.\n\nLocation: 123 Main St, Suite 200\nPhone: (555) 123-4567\n\nPlease arrive 15 minutes early.\n\nThank you!',
        bodyHtml: '<p>Dear Patient,</p><p>This is to confirm your appointment with Dr. Smith on <strong>Friday, March 15th at 10:30 AM</strong>.</p>'
      },
      {
        id: '3',
        snippet: 'Client presentation scheduled for next Monday at 9 AM via Zoom.',
        subject: 'Client Presentation - Monday 9 AM',
        from: 'sales@company.com',
        date: new Date().toISOString(),
        bodyText: 'Hi there,\n\nReminder: Client presentation with ABC Corp is scheduled for Monday at 9:00 AM via Zoom.\n\nZoom Link: https://zoom.us/j/123456789\nMeeting ID: 123 456 789\n\nPlease join 5 minutes early to test your connection.\n\nThanks!',
        bodyHtml: '<p>Hi there,</p><p>Reminder: Client presentation with ABC Corp is scheduled for <strong>Monday at 9:00 AM</strong> via Zoom.</p>'
      }
    ];

    console.log(`📧 Retrieved ${mockEmails.length} mock emails`);
    return mockEmails;
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
        const startTime = this.parseDateTime(dateStr, timeStr);
        
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
      console.warn('Failed to extract events from email:', error);
      return [];
    }
  }

  // Helper: Extract title from email subject
  private extractTitleFromSubject(subject: string): string {
    return subject
      .replace(/^(re:|fwd?:)\s*/i, '')
      .replace(/\s*-\s*(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday).*$/i, '')
      .trim();
  }

  // Helper: Parse time string
  private parseTimeString(timeStr: string, date: Date): Date | null {
    try {
      const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (!match) return null;

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const period = match[3].toLowerCase();

      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      const result = new Date(date);
      result.setHours(hours, minutes, 0, 0);
      return result;
    } catch {
      return null;
    }
  }

  // Helper: Get next weekday
  private getNextWeekday(dayName: string): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7; // Next week
    
    const result = new Date(today);
    result.setDate(today.getDate() + daysToAdd);
    return result;
  }

  // Helper: Parse date and time
  private parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
      const currentYear = new Date().getFullYear();
      const fullDateStr = `${dateStr} ${currentYear} ${timeStr}`;
      const parsed = new Date(fullDateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
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
      isRecurring: false
    };
  }

  // Test connection
  public async testConnection(): Promise<boolean> {
    if (this.mockMode) {
      console.log('📧 Gmail connection test successful (mock mode)');
      return this.isConnected;
    }
    return false;
  }

  // Enable/disable mock mode
  public setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }
}

// Singleton instance
const gmailService = new GmailService();

export default gmailService;
export type { EmailEvent, GmailMessage, GmailConfig }; 