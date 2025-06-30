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

interface NotificationSettings {
  eventReminders: boolean;
  reminderTimes: number[]; // minutes before event
  productivityInsights: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
}

interface ScheduledNotification {
  id: string;
  eventId: string;
  title: string;
  message: string;
  scheduledTime: Date;
  type: 'reminder' | 'productivity' | 'system';
}

class NotificationService {
  private settings: NotificationSettings;
  private scheduledNotifications: Map<string, NodeJS.Timeout>;
  private defaultSettings: NotificationSettings = {
    eventReminders: true,
    reminderTimes: [15, 5], // 15 and 5 minutes before
    productivityInsights: true,
    emailNotifications: false,
    soundEnabled: true
  };

  constructor() {
    this.scheduledNotifications = new Map();
    this.settings = this.loadSettings();
    this.requestPermission();
  }

  private async requestPermission(): Promise<void> {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  private loadSettings(): NotificationSettings {
    try {
      const saved = localStorage.getItem('notificationSettings');
      return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : this.defaultSettings;
    } catch {
      return this.defaultSettings;
    }
  }

  private saveSettings(): void {
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  }

  public updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    console.log('📋 Notification settings updated:', this.settings);
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public async showNotification(
    title: string, 
    message: string, 
    options: {
      type?: 'reminder' | 'productivity' | 'system';
      icon?: string;
      requireInteraction?: boolean;
    } = {}
  ): Promise<void> {
    if (!this.settings.eventReminders && options.type === 'reminder') {
      return;
    }

    if (!this.settings.productivityInsights && options.type === 'productivity') {
      return;
    }

    // Try native web notification first
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: options.icon || '/assets/icon.png',
        badge: '/assets/badge.png',
        requireInteraction: options.requireInteraction || false,
        silent: !this.settings.soundEnabled,
        tag: options.type || 'default'
      });

      notification.onclick = () => {
        // Bring app to focus
        window.focus();
        notification.close();
      };

      // Auto-close after 10 seconds unless requires interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }
    } else {
      // Fallback to in-app notification
      this.showInAppNotification(title, message, options);
    }

    console.log(`🔔 Notification shown: ${title} - ${message}`);
  }

  private showInAppNotification(
    title: string, 
    message: string, 
    options: any
  ): void {
    // Create in-app notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #333;">${title}</div>
      <div style="color: #666; font-size: 14px; margin-bottom: 12px;">${message}</div>
      <div style="text-align: right;">
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
          OK
        </button>
      </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    if (!document.querySelector('[data-notification-styles]')) {
      style.setAttribute('data-notification-styles', 'true');
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  public scheduleEventReminder(event: {
    id: string;
    title: string;
    date: string;
    startTime?: string;
  }): void {
    if (!this.settings.eventReminders) return;

    // Clear existing reminders for this event
    this.cancelEventReminders(event.id);

    const eventDateTime = new Date(`${event.date}T${event.startTime || '09:00'}`);
    const now = new Date();

    this.settings.reminderTimes.forEach((minutes) => {
      const reminderTime = new Date(eventDateTime.getTime() - (minutes * 60 * 1000));
      
      if (reminderTime > now) {
        const timeoutId = setTimeout(() => {
          this.showNotification(
            `📅 Upcoming Event`,
            `"${event.title}" starts in ${minutes} minutes`,
            {
              type: 'reminder',
              requireInteraction: true
            }
          );
        }, reminderTime.getTime() - now.getTime());

        const notificationId = `${event.id}-${minutes}`;
        this.scheduledNotifications.set(notificationId, timeoutId);
        
        console.log(`⏰ Scheduled reminder for "${event.title}" in ${Math.floor((reminderTime.getTime() - now.getTime()) / 1000 / 60)} minutes`);
      }
    });
  }

  public cancelEventReminders(eventId: string): void {
    // Find and cancel all reminders for this event
    for (const [notificationId, timeoutId] of this.scheduledNotifications.entries()) {
      if (notificationId.startsWith(eventId)) {
        clearTimeout(timeoutId);
        this.scheduledNotifications.delete(notificationId);
        console.log(`❌ Cancelled reminder: ${notificationId}`);
      }
    }
  }

  public showProductivityInsight(message: string): void {
    if (this.settings.productivityInsights) {
      this.showNotification(
        '📊 Productivity Insight',
        message,
        { type: 'productivity' }
      );
    }
  }

  public cleanup(): void {
    // Cancel all scheduled notifications
    for (const timeoutId of this.scheduledNotifications.values()) {
      clearTimeout(timeoutId);
    }
    this.scheduledNotifications.clear();
    console.log('🧹 Notification service cleaned up');
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;
export type { NotificationSettings, ScheduledNotification }; 