import React, { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { ChatInterface } from '../AIAssistant/ChatInterface';
import { EventFormData } from '../../types';
import { Event } from '../../services/supabase';
import './TrayPopup.css';

interface TrayEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
}

type TrayView = 'home' | 'ai-assistant';

export const TrayPopup: React.FC = () => {
  const [todayEvents, setTodayEvents] = useState<TrayEvent[]>([]);
  const [currentView, setCurrentView] = useState<TrayView>('home');
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Load today's events
    loadTodayEvents();
    loadAllEvents();
  }, []);

  const loadTodayEvents = async () => {
    try {
      // Get today's events from the main process
      const events = await window.electronAPI.getTodayEvents();
      setTodayEvents(events || []);
    } catch (error) {
      console.error('Error loading today\'s events:', error);
    }
  };

  const loadAllEvents = async () => {
    try {
      // Load all events from localStorage for the AI assistant
      const savedEvents = localStorage.getItem('flowgenius-events');
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents);
        // Convert to Event format
        const convertedEvents: Event[] = parsedEvents.map((event: any) => ({
          id: event.id,
          user_id: '',
          title: event.title || '',
          description: event.description || '',
          start_time: event.date && event.startTime ? 
            `${event.date}T${event.startTime}:00` : new Date().toISOString(),
          end_time: event.date && event.endTime ? 
            `${event.date}T${event.endTime}:00` : new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: event.location || '',
          attendees: event.attendees || [],
          is_recurring: event.isRecurring || false,
          recurrence_rule: event.recurrenceRule ? 
            (typeof event.recurrenceRule === 'string' ? 
              event.recurrenceRule : 
              `FREQ=${event.recurrenceRule.frequency.toUpperCase()}`) : '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source: 'local' as const
        }));
        setAllEvents(convertedEvents);
      } else {
        setAllEvents([]);
      }
    } catch (error) {
      console.error('Error loading all events:', error);
      setAllEvents([]);
    }
  };

  const generateRecurringEvents = (baseEvent: any): any[] => {
    if (!baseEvent.isRecurring || !baseEvent.recurrenceRule) {
      return [baseEvent];
    }

    const events = [baseEvent];
    const rule = baseEvent.recurrenceRule;
    const startDate = new Date(baseEvent.date);
    
    // Generate 30 occurrences (about 1 month daily, 7 months weekly, 2.5 years monthly)
    for (let i = 1; i <= 30; i++) {
      const nextDate = new Date(startDate);
      
      switch (rule.frequency) {
        case 'daily':
          nextDate.setDate(startDate.getDate() + i);
          break;
        case 'weekly':
          nextDate.setDate(startDate.getDate() + (i * 7));
          break;
        case 'monthly':
          nextDate.setMonth(startDate.getMonth() + i);
          break;
      }

      const recurringEvent = {
        ...baseEvent,
        id: `${baseEvent.id}-rec-${i}`,
        date: nextDate.toISOString().split('T')[0],
        parentEventId: baseEvent.id
      };

      events.push(recurringEvent);
    }

    return events;
  };

  const handleEventCreate = async (eventData: EventFormData) => {
    try {
      // Create the event format
      const startDate = eventData.startTime instanceof Date ? eventData.startTime : new Date(eventData.startTime);
      const endDate = eventData.endTime instanceof Date ? eventData.endTime : new Date(eventData.endTime);
      
      const baseEvent = {
        id: `local-${Date.now()}`,
        title: eventData.title,
        description: eventData.description || '',
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().substring(0, 5),
        endTime: endDate.toTimeString().substring(0, 5),
        location: eventData.location || '',
        attendees: eventData.attendees || [],
        category: 'personal' as const,
        isRecurring: eventData.isRecurring || false,
        recurrenceRule: eventData.recurrenceRule ? {
          frequency: eventData.recurrenceRule.includes('DAILY') ? 'daily' as const :
                    eventData.recurrenceRule.includes('WEEKLY') ? 'weekly' as const : 'monthly' as const
        } : undefined,
        source: 'local' as const
      };
      
      // Generate all recurring events
      const newEvents = generateRecurringEvents(baseEvent);
      
      // Load existing events from localStorage
      const savedEvents = localStorage.getItem('flowgenius-events');
      const existingEvents = savedEvents ? JSON.parse(savedEvents) : [];
      
      // Add new events
      const updatedEvents = [...existingEvents, ...newEvents];
      
      // Save to localStorage
      localStorage.setItem('flowgenius-events', JSON.stringify(updatedEvents));
      
      console.log(`✅ Created ${newEvents.length} event(s) and saved to localStorage`);
      
      // Notify the main window to refresh its events
      if (window.opener || window.parent !== window) {
        // If this is a popup window or iframe
        window.postMessage({ type: 'EVENTS_UPDATED', events: updatedEvents }, '*');
      }
      
      // Also notify the main process (for tray updates)
      await window.electronAPI.createEvent(eventData);
      
      // Refresh local display
      await loadTodayEvents();
      await loadAllEvents();
      
      // Don't automatically go back to home view - stay in AI assistant
      // so the user can see the confirmation message
      console.log('Event created successfully:', eventData.title);
      
    } catch (error) {
      console.error('Error creating event:', error);
      throw error; // Re-throw so the ChatInterface can handle it
    }
  };

  const openMainApp = () => {
    window.electronAPI.showMainWindow();
  };

  const openCalendar = () => {
    window.electronAPI.openCalendar();
  };

  const openAIAssistant = () => {
    setCurrentView('ai-assistant');
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), 'h:mm a');
  };

  return (
    <div className="tray-popup">
      <div className="tray-popup-header">
        <h2>FlowGenius</h2>
        <div className="tray-popup-date">
          {format(new Date(), 'EEEE, MMMM d')}
        </div>
      </div>

      <div className="tray-popup-content">
        {currentView === 'home' && (
          <>
            {/* Quick Actions */}
            <div className="quick-actions">
              <button 
                className="quick-action-btn view-calendar"
                onClick={openCalendar}
              >
                <span className="icon">📅</span>
                View Calendar
              </button>
              <button 
                className="quick-action-btn ai-assistant"
                onClick={openAIAssistant}
              >
                <span className="icon">🤖</span>
                AI Assistant
              </button>
            </div>

            {/* Today's Events */}
            <div className="today-events">
              <h3>Today's Events</h3>
              {todayEvents.length === 0 ? (
                <div className="no-events">
                  <p>No events today</p>
                </div>
              ) : (
                <div className="events-list">
                  {todayEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="event-item">
                      <div className="event-time">
                        {formatTime(event.start)}
                      </div>
                      <div className="event-details">
                        <div className="event-title">{event.title}</div>
                        {event.location && (
                          <div className="event-location">{event.location}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {todayEvents.length > 4 && (
                    <div className="more-events">
                      +{todayEvents.length - 4} more events
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {currentView === 'ai-assistant' && (
          <div className="ai-assistant-view">
            <div className="view-header">
              <button className="back-btn" onClick={() => setCurrentView('home')}>
                ← Back
              </button>
              <h3>AI Assistant</h3>
            </div>
            
            <div className="ai-assistant-container">
              <ChatInterface 
                events={allEvents}
                onEventCreate={handleEventCreate}
                isCompactMode={true}
              />
            </div>
          </div>
        )}
      </div>

      <div className="tray-popup-footer">
        <button className="open-main-app" onClick={openMainApp}>
          Open FlowGenius
        </button>
      </div>
    </div>
  );
}; 