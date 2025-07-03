import React, { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import './TrayPopup.css';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
}

export const TrayPopup: React.FC = () => {
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  useEffect(() => {
    // Load today's events
    loadTodayEvents();
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

  const handleQuickAddEvent = async () => {
    if (!newEventTitle.trim()) return;

    try {
      // Create a quick event for today
      const event = {
        title: newEventTitle,
        start: new Date(),
        end: addDays(new Date(), 1),
        allDay: false
      };

      await window.electronAPI.createEvent(event);
      setNewEventTitle('');
      setIsAddingEvent(false);
      loadTodayEvents();
    } catch (error) {
      console.error('Error creating quick event:', error);
    }
  };

  const openMainApp = () => {
    window.electronAPI.showMainWindow();
  };

  const openCalendar = () => {
    window.electronAPI.openCalendar();
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
        {/* Quick Actions */}
        <div className="quick-actions">
          <button 
            className="quick-action-btn add-event"
            onClick={() => setIsAddingEvent(!isAddingEvent)}
          >
            <span className="icon">+</span>
            Quick Add Event
          </button>
          <button 
            className="quick-action-btn view-calendar"
            onClick={openCalendar}
          >
            <span className="icon">📅</span>
            View Calendar
          </button>
        </div>

        {/* Quick Add Event Form */}
        {isAddingEvent && (
          <div className="quick-add-form">
            <input
              type="text"
              placeholder="Event title..."
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuickAddEvent()}
              autoFocus
            />
            <div className="quick-add-buttons">
              <button onClick={handleQuickAddEvent} className="btn-primary">
                Add
              </button>
              <button onClick={() => setIsAddingEvent(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

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
      </div>

      <div className="tray-popup-footer">
        <button className="open-main-app" onClick={openMainApp}>
          Open FlowGenius
        </button>
      </div>
    </div>
  );
}; 