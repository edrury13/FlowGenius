import { Event } from './supabase';
import dayjs from 'dayjs';

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

export interface EventReminder {
  eventId: string;
  title: string;
  startTime: Date;
  reminderTime: Date;
  reminderMinutes: number;
}

class NotificationService {
  private scheduledReminders: Map<string, NodeJS.Timeout> = new Map();
  private defaultReminderTimes: number[] = [15, 5]; // minutes before event

  constructor() {
    this.requestPermission();
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Show desktop notification
  async showNotification(options: NotificationOptions): Promise<void> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return;
    }

    // Use Electron's notification API if available
    if (window.electronAPI) {
      await window.electronAPI.showNotification({
        title: options.title,
        body: options.body,
      });
    } else {
      // Fallback to browser notification
      new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
        requireInteraction: options.requireInteraction,
      });
    }
  }

  // Schedule event reminders
  scheduleEventReminders(event: Event, reminderTimes?: number[]): void {
    const reminders = reminderTimes || this.defaultReminderTimes;
    const eventStart = dayjs(event.start_time);
    const now = dayjs();

    reminders.forEach(minutes => {
      const reminderTime = eventStart.subtract(minutes, 'minute');
      
      // Only schedule if reminder time is in the future
      if (reminderTime.isAfter(now)) {
        const timeoutId = setTimeout(() => {
          this.showEventReminder(event, minutes);
        }, reminderTime.diff(now));

        const reminderId = `${event.id}-${minutes}`;
        this.scheduledReminders.set(reminderId, timeoutId);
      }
    });
  }

  // Show event reminder notification
  private async showEventReminder(event: Event, minutesBefore: number): Promise<void> {
    const startTime = dayjs(event.start_time).format('h:mm A');
    const title = `Event Reminder - ${minutesBefore} minutes`;
    const body = `${event.title} starts at ${startTime}`;

    await this.showNotification({
      title,
      body,
      requireInteraction: true,
      tag: `reminder-${event.id}`,
      actions: [
        {
          action: 'snooze',
          title: 'Snooze 5 min',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    });
  }

  // Cancel event reminders
  cancelEventReminders(eventId: string): void {
    const keysToDelete: string[] = [];
    
    this.scheduledReminders.forEach((timeoutId, key) => {
      if (key.startsWith(eventId)) {
        clearTimeout(timeoutId);
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.scheduledReminders.delete(key);
    });
  }

  // Reschedule event reminders (useful when event is updated)
  rescheduleEventReminders(event: Event, reminderTimes?: number[]): void {
    this.cancelEventReminders(event.id);
    this.scheduleEventReminders(event, reminderTimes);
  }

  // Schedule multiple events
  scheduleMultipleEvents(events: Event[], reminderTimes?: number[]): void {
    events.forEach(event => {
      this.scheduleEventReminders(event, reminderTimes);
    });
  }

  // Snooze reminder
  snoozeReminder(eventId: string, snoozeMinutes: number = 5): void {
    const timeoutId = setTimeout(() => {
      // Re-fetch event and show reminder again
      // This would typically involve calling the event service
      console.log(`Showing snoozed reminder for event ${eventId}`);
    }, snoozeMinutes * 60 * 1000);

    const reminderId = `${eventId}-snooze`;
    this.scheduledReminders.set(reminderId, timeoutId);
  }

  // Show productivity insights notification
  async showProductivityInsight(insight: string): Promise<void> {
    await this.showNotification({
      title: 'FlowGenius Productivity Insight',
      body: insight,
      tag: 'productivity-insight',
    });
  }

  // Show daily summary notification
  async showDailySummary(summary: {
    eventsCompleted: number;
    totalFocusTime: number;
    topApp: string;
  }): Promise<void> {
    const { eventsCompleted, totalFocusTime, topApp } = summary;
    const focusHours = Math.round(totalFocusTime / 3600);
    
    const body = `Today: ${eventsCompleted} events completed, ${focusHours}h focus time. Most used: ${topApp}`;
    
    await this.showNotification({
      title: 'Daily Summary',
      body,
      tag: 'daily-summary',
    });
  }

  // Clear all scheduled reminders
  clearAllReminders(): void {
    this.scheduledReminders.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.scheduledReminders.clear();
  }

  // Get scheduled reminders count
  getScheduledRemindersCount(): number {
    return this.scheduledReminders.size;
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window || !!(window as any).electronAPI;
  }

  // Get permission status
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export for easy access
export default notificationService; 