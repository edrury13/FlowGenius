import React, { useState, useEffect } from 'react';
import notificationService from './services/notifications';
import gmailService from './services/gmail';
import trackingService from './services/tracking';
import ProductivityDashboard from './components/Analytics/ProductivityDashboard';
import AuthModal from './components/Auth/AuthModal';
import { authService, type Profile } from './services/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  startTime?: string;
  endTime?: string;
  attendees?: string[];
  category: 'work' | 'personal' | 'meeting' | 'task' | 'reminder';
  color?: string;
  isRecurring?: boolean;
  recurrenceRule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  parentEventId?: string;
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda';
type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

const CATEGORY_COLORS = {
  work: '#667eea',
  personal: '#48bb78',
  meeting: '#ed8936',
  task: '#9f7aea',
  reminder: '#38b2ac'
};

const App: React.FC = () => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  
  // Event creation/editing state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventAttendees, setEventAttendees] = useState('');
  const [eventCategory, setEventCategory] = useState<Event['category']>('personal');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Notification and Gmail state
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showGmailIntegration, setShowGmailIntegration] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmails, setGmailEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  
  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load events from localStorage on mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('flowgenius-events');
    if (savedEvents) {
      const parsedEvents = JSON.parse(savedEvents);
      setEvents(parsedEvents);
      setFilteredEvents(parsedEvents);
    } else {
      // Sample events
      const sampleEvents: Event[] = [
        { 
          id: '1', 
          title: 'Team Meeting', 
          date: '2024-06-15', 
          startTime: '10:00', 
          endTime: '11:00',
          category: 'meeting',
          description: 'Weekly team sync meeting'
        },
        { 
          id: '2', 
          title: 'Project Review', 
          date: '2024-06-22', 
          startTime: '14:00', 
          endTime: '15:30',
          category: 'work',
          attendees: ['john@example.com', 'jane@example.com']
        },
      ];
      setEvents(sampleEvents);
      setFilteredEvents(sampleEvents);
      localStorage.setItem('flowgenius-events', JSON.stringify(sampleEvents));
    }

    // Initialize services and setup auth listener
    initializeServices();

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await handleAuthSuccess(session.user);
          setSession(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setUserProfile(null);
          setIsLoggedIn(false);
          setShowAuthModal(true);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initializeServices = async () => {
    setAuthLoading(true);
    
    try {
      // Check for existing session
      const currentSession = await authService.getCurrentSession();
      if (currentSession?.user) {
        await handleAuthSuccess(currentSession.user);
      } else {
        setShowAuthModal(true);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setShowAuthModal(true);
    }

    // Load notification settings
    const settings = notificationService.getSettings();
    console.log('📋 Loaded notification settings:', settings);

    // Check Gmail connection
    const isConnected = await gmailService.loadStoredTokens();
    setGmailConnected(isConnected);
    if (isConnected) {
      console.log('📧 Gmail already connected');
    }

    // Initialize tracking service
    const trackingSettings = trackingService.getSettings();
    console.log('📊 Loaded tracking settings:', trackingSettings);
    
    setAuthLoading(false);
  };

  // Save events to localStorage whenever events change
  useEffect(() => {
    localStorage.setItem('flowgenius-events', JSON.stringify(events));
  }, [events]);

  // Cleanup tracking service on logout or unmount
  useEffect(() => {
    return () => {
      trackingService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      trackingService.stopTracking();
    }
  }, [isLoggedIn]);

  // Filter events based on search and category
  useEffect(() => {
    let filtered = events;
    
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }
    
    setFilteredEvents(filtered);
  }, [events, searchTerm, selectedCategory]);

  const handleAuthSuccess = async (user: User) => {
    setUser(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);
    setAuthError(null);
    
    try {
      // Load user profile
      const profile = await import('./services/supabase').then(module => 
        module.profileService.getProfile(user.id)
      );
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }

    // Initialize tracking if enabled
    const trackingSettings = trackingService.getSettings();
    if (trackingSettings.enabled) {
      trackingService.startTracking();
    }
  };

  const handleAuthError = (message: string) => {
    setAuthError(message);
    console.error('Auth error:', message);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsLoggedIn(false);
      setShowAuthModal(true);
      trackingService.stopTracking();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleDayClick = (day: number, month?: number, year?: number) => {
    const clickedDate = new Date(
      year || currentDate.getFullYear(), 
      month !== undefined ? month : currentDate.getMonth(), 
      day
    );
    const dateString = clickedDate.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setEditingEvent(null);
    resetEventForm();
    setShowEventModal(true);
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedDate(event.date);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventStartTime(event.startTime || '');
    setEventEndTime(event.endTime || '');
    setEventAttendees(event.attendees?.join(', ') || '');
    setEventCategory(event.category);
    setIsRecurring(event.isRecurring || false);
    if (event.recurrenceRule) {
      setRecurrenceFrequency(event.recurrenceRule.frequency);
    }
    setShowEventModal(true);
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventStartTime('');
    setEventEndTime('');
    setEventAttendees('');
    setEventCategory('personal');
    setIsRecurring(false);
    setRecurrenceFrequency('weekly');
  };

  const generateRecurringEvents = (baseEvent: Event): Event[] => {
    if (!baseEvent.isRecurring || !baseEvent.recurrenceRule) {
      return [baseEvent];
    }

    const events: Event[] = [baseEvent];
    const rule = baseEvent.recurrenceRule;
    const startDate = new Date(baseEvent.date);
    
    console.log('🔄 Generating recurring events for:', baseEvent.title, 'Frequency:', rule.frequency);

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

      const recurringEvent: Event = {
        ...baseEvent,
        id: `${baseEvent.id}-rec-${i}`,
        date: nextDate.toISOString().split('T')[0],
        parentEventId: baseEvent.id
      };

      events.push(recurringEvent);
      console.log(`📅 Created occurrence ${i}: ${recurringEvent.date}`);
    }

    console.log(`✅ Generated ${events.length} total events (including original)`);
    return events;
  };

  const handleCreateOrUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const eventData: Event = {
      id: editingEvent?.id || Date.now().toString(),
      title: eventTitle,
      description: eventDescription || undefined,
      date: selectedDate,
      startTime: eventStartTime || undefined,
      endTime: eventEndTime || undefined,
      attendees: eventAttendees ? eventAttendees.split(',').map(a => a.trim()).filter(a => a) : undefined,
      category: eventCategory,
      isRecurring,
      recurrenceRule: isRecurring ? {
        frequency: recurrenceFrequency,
      } : undefined
    };

    if (editingEvent) {
      console.log('🔧 Updating event:', editingEvent.id, 'New recurrence:', isRecurring);
      
      // Cancel existing reminders
      notificationService.cancelEventReminders(editingEvent.id);
      
      // Remove all existing instances of this event (original + any recurring instances)
      const eventsWithoutThisEvent = events.filter(event => 
        event.id !== editingEvent.id && event.parentEventId !== editingEvent.id
      );
      
      // Generate new event(s) based on current settings
      const newEvents = generateRecurringEvents(eventData);
      
      // Schedule notifications for new events
      newEvents.forEach(event => {
        notificationService.scheduleEventReminder(event);
      });
      
      // Update the events array
      setEvents([...eventsWithoutThisEvent, ...newEvents]);
      
      console.log('✅ Event updated with', newEvents.length, 'total instances');
    } else {
      // Create new event(s)
      const newEvents = generateRecurringEvents(eventData);
      
      // Schedule notifications for new events
      newEvents.forEach(event => {
        notificationService.scheduleEventReminder(event);
      });
      
      setEvents([...events, ...newEvents]);
    }

    resetEventForm();
    setShowEventModal(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      // Cancel notifications for this event
      notificationService.cancelEventReminders(eventId);
      
      const updatedEvents = events.filter(event => 
        event.id !== eventId && event.parentEventId !== eventId
      );
      setEvents(updatedEvents);
      setShowEventModal(false);
      setEditingEvent(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedEvents.length === 0) return;
    if (confirm(`Delete ${selectedEvents.length} selected events?`)) {
      const updatedEvents = events.filter(event => !selectedEvents.includes(event.id));
      setEvents(updatedEvents);
      setSelectedEvents([]);
    }
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const getEventsForDate = (dateString: string): Event[] => {
    return filteredEvents.filter(event => event.date === dateString);
  };

  const getEventsInRange = (startDate: Date, endDate: Date): Event[] => {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return filteredEvents.filter(event => event.date >= start && event.date <= end);
  };

  // Gmail Integration Functions
  const handleGmailConnect = async () => {
    try {
      const success = await gmailService.authenticate();
      if (success) {
        setGmailConnected(true);
        notificationService.showNotification(
          '📧 Gmail Connected',
          'Successfully connected to Gmail! You can now import events from emails.',
          { type: 'system' }
        );
      }
    } catch (error) {
      console.error('Gmail connection failed:', error);
      notificationService.showNotification(
        '❌ Gmail Connection Failed',
        'Failed to connect to Gmail. Please try again.',
        { type: 'system' }
      );
    }
  };

  const handleGmailDisconnect = () => {
    gmailService.clearStoredTokens();
    setGmailConnected(false);
    setGmailEmails([]);
    notificationService.showNotification(
      '📧 Gmail Disconnected',
      'Gmail has been disconnected from FlowGenius.',
      { type: 'system' }
    );
  };

  const handleImportFromGmail = async () => {
    if (!gmailConnected) {
      alert('Please connect Gmail first');
      return;
    }

    setLoadingEmails(true);
    try {
      const emails = await gmailService.getRecentEmails(10);
      setGmailEmails(emails);
      
      // Extract events from emails
      let totalEventsImported = 0;
      const newEvents: Event[] = [];

      for (const email of emails) {
        const extractedEvents = gmailService.extractEventsFromEmail(email);
        for (const emailEvent of extractedEvents) {
          const calendarEvent = gmailService.convertToCalendarEvent(emailEvent);
          newEvents.push(calendarEvent);
          totalEventsImported++;
        }
      }

      if (newEvents.length > 0) {
        // Schedule notifications for imported events
        newEvents.forEach(event => {
          notificationService.scheduleEventReminder(event);
        });

        setEvents(prev => [...prev, ...newEvents]);
        notificationService.showNotification(
          '📅 Events Imported',
          `Successfully imported ${totalEventsImported} events from Gmail!`,
          { type: 'system' }
        );
      } else {
        notificationService.showNotification(
          '📧 No Events Found',
          'No calendar events were found in recent emails.',
          { type: 'system' }
        );
      }
    } catch (error) {
      console.error('Failed to import from Gmail:', error);
      notificationService.showNotification(
        '❌ Import Failed',
        'Failed to import events from Gmail.',
        { type: 'system' }
      );
    }
    setLoadingEmails(false);
  };

  // Notification Settings Functions
  const handleNotificationSettingsUpdate = (newSettings: any) => {
    notificationService.updateSettings(newSettings);
    notificationService.showNotification(
      '⚙️ Settings Updated',
      'Notification settings have been saved.',
      { type: 'system' }
    );
  };

  const testNotification = () => {
    notificationService.showNotification(
      '🔔 Test Notification',
      'This is a test notification from FlowGenius!',
      { type: 'system', requireInteraction: false }
    );
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: '20px',
      boxSizing: 'border-box' as const,
    },
    loginBox: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px',
    },
    title: {
      textAlign: 'center' as const,
      color: '#333',
      marginBottom: '30px',
      fontSize: '28px',
      fontWeight: 'bold',
    },
    subtitle: {
      textAlign: 'center' as const,
      color: '#666',
      marginBottom: '30px',
      fontSize: '16px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px',
    },
    input: {
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px',
      outline: 'none',
    },
    button: {
      padding: '12px',
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
    },
    dashboard: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif',
      width: '100%',
      margin: 0,
      padding: 0,
    },
    header: {
      backgroundColor: 'white',
      padding: '15px 20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box' as const,
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#333',
    },
    logoutButton: {
      padding: '8px 16px',
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    headerButton: {
      padding: '6px 12px',
      backgroundColor: '#f0f0f0',
      color: '#333',
      border: '1px solid #ddd',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    connectedButton: {
      backgroundColor: '#e8f5e8',
      borderColor: '#4caf50',
      color: '#2e7d32',
    },
    calendarContainer: {
      padding: '15px',
      flex: 1,
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      boxSizing: 'border-box' as const,
    },
    calendarControls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      flexWrap: 'wrap' as const,
      gap: '10px',
      flexShrink: 0,
    },
    searchAndFilter: {
      display: 'flex',
      gap: '15px',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
    },
    searchInput: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      width: '200px',
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    bulkActions: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    },
    calendarHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      flexShrink: 0,
    },
    calendarTitle: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#333',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    navButton: {
      padding: '10px 15px',
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '18px',
    },
    viewButtons: {
      display: 'flex',
      gap: '5px',
    },
    viewButton: {
      padding: '8px 16px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
    },
    activeViewButton: {
      backgroundColor: '#667eea',
      color: 'white',
      border: '1px solid #667eea',
    },
    calendar: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      padding: '15px',
      width: '100%',
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      boxSizing: 'border-box' as const,
    },
    calendarGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gridTemplateRows: 'auto repeat(6, 1fr)',
      gap: '1px',
      backgroundColor: '#e0e0e0',
      width: '100%',
      flex: 1,
      minHeight: 0,
    },
    weekGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gridTemplateRows: 'auto 1fr',
      gap: '1px',
      backgroundColor: '#e0e0e0',
      width: '100%',
      flex: 1,
      minHeight: 0,
    },
    dayView: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '10px',
      flex: 1,
      overflow: 'auto',
    },
    agendaView: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '15px',
      flex: 1,
      overflow: 'auto',
    },
    dayHeader: {
      backgroundColor: '#667eea',
      color: 'white',
      padding: '12px 8px',
      textAlign: 'center' as const,
      fontWeight: 'bold',
      fontSize: '14px',
    },
    dayCell: {
      backgroundColor: 'white',
      padding: '8px',
      border: '1px solid #e0e0e0',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    dayCellWeek: {
      backgroundColor: 'white',
      padding: '10px',
      minHeight: '80px',
      border: '1px solid #e0e0e0',
      cursor: 'pointer',
    },
    dayCellDay: {
      backgroundColor: 'white',
      padding: '20px',
      minHeight: '60px',
      border: '1px solid #e0e0e0',
      marginBottom: '10px',
    },
    dayNumber: {
      fontWeight: 'bold',
      marginBottom: '4px',
      fontSize: '14px',
      flexShrink: 0,
    },
    event: {
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '10px',
      marginBottom: '2px',
      cursor: 'pointer',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      color: 'white',
      position: 'relative' as const,
      flexShrink: 0,
    },
    eventTime: {
      fontSize: '10px',
      opacity: 0.9,
    },
    todayCell: {
      backgroundColor: '#e8f4fd',
      border: '2px solid #667eea',
    },
    agendaItem: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    agendaDate: {
      fontWeight: 'bold',
      color: '#667eea',
      minWidth: '100px',
    },
    checkbox: {
      position: 'absolute' as const,
      top: '5px',
      right: '5px',
      width: '16px',
      height: '16px',
    },
    // Modal styles
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto',
    },
    modalHeader: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#333',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalForm: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '15px',
    },
    modalRow: {
      display: 'flex',
      gap: '15px',
    },
    modalInput: {
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px',
      outline: 'none',
      flex: 1,
    },
    modalTextarea: {
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px',
      outline: 'none',
      resize: 'vertical' as const,
      minHeight: '80px',
    },
    modalSelect: {
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px',
      outline: 'none',
      backgroundColor: 'white',
    },
    modalCheckbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    recurrenceSection: {
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      padding: '15px',
      backgroundColor: '#f9f9f9',
    },
    modalButtons: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px',
    },
    modalButton: {
      padding: '10px 20px',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      border: 'none',
    },
    primaryButton: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#f5f5f5',
      color: '#333',
    },
    dangerButton: {
      backgroundColor: '#e53e3e',
      color: 'white',
    },
    settingsSection: {
      marginBottom: '20px',
      padding: '16px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      backgroundColor: '#fafafa',
    },
    emailItem: {
      padding: '10px',
      marginBottom: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      backgroundColor: 'white',
    },
    activeButton: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    mainContent: {
      display: 'flex',
      height: 'calc(100vh - 80px)',
      overflow: 'hidden',
      width: '100%',
    },
    calendarWithAnalytics: {
      width: '70%',
      paddingRight: '15px',
      boxSizing: 'border-box' as const,
    },
    calendarFullWidth: {
      width: '100%',
      boxSizing: 'border-box' as const,
    },
    analyticsPane: {
      width: '30%',
      minWidth: '400px',
      backgroundColor: '#f8f9fa',
      borderLeft: '1px solid #e0e0e0',
      overflow: 'auto',
      height: '100%',
    },
  };

  const renderMonthView = () => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const today = new Date();
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const calendarDays = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Add day headers
    dayNames.forEach(day => {
      calendarDays.push(
        <div key={day} style={styles.dayHeader}>{day}</div>
      );
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} style={styles.dayCell}></div>);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate() && 
                     currentMonth === today.getMonth() && 
                     currentYear === today.getFullYear();
      
      const dateString = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
      const dayEvents = getEventsForDate(dateString);
      
      const cellStyle = {
        ...styles.dayCell,
        ...(isToday ? styles.todayCell : {}),
      };
      
      calendarDays.push(
        <div 
          key={day} 
          style={cellStyle}
          onClick={() => handleDayClick(day)}
          onMouseEnter={(e) => {
            if (!isToday) {
              e.currentTarget.style.backgroundColor = '#f0f8ff';
            }
          }}
          onMouseLeave={(e) => {
            if (!isToday) {
              e.currentTarget.style.backgroundColor = 'white';
            }
          }}
        >
          {selectedEvents.length > 0 && (
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={dayEvents.some(event => selectedEvents.includes(event.id))}
              onChange={() => {
                dayEvents.forEach(event => toggleEventSelection(event.id));
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div style={styles.dayNumber}>{day}</div>
          {dayEvents.map(event => (
            <div 
              key={event.id} 
              style={{
                ...styles.event,
                backgroundColor: CATEGORY_COLORS[event.category],
              }}
              title={`${event.title}${event.startTime ? ` at ${event.startTime}` : ''}`}
              onClick={(e) => handleEventClick(event, e)}
            >
              {event.startTime && <div style={styles.eventTime}>{event.startTime}</div>}
              {event.title}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={styles.calendarGrid}>
        {calendarDays}
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Add day headers
    dayNames.forEach((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      weekDays.push(
        <div key={day} style={styles.dayHeader}>
          {day} {date.getDate()}
        </div>
      );
    });
    
    // Add day cells
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayEvents = getEventsForDate(dateString);
      
      weekDays.push(
        <div 
          key={`day-${i}`} 
          style={styles.dayCellWeek}
          onClick={() => handleDayClick(date.getDate(), date.getMonth(), date.getFullYear())}
        >
          {dayEvents.map(event => (
            <div 
              key={event.id} 
              style={{
                ...styles.event,
                backgroundColor: CATEGORY_COLORS[event.category],
              }}
              onClick={(e) => handleEventClick(event, e)}
            >
              {event.startTime && <div style={styles.eventTime}>{event.startTime}</div>}
              {event.title}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={styles.weekGrid}>
        {weekDays}
      </div>
    );
  };

  const renderDayView = () => {
    const dateString = currentDate.toISOString().split('T')[0];
    const dayEvents = getEventsForDate(dateString).sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.localeCompare(b.startTime);
    });

    return (
      <div style={styles.dayView}>
        <h3>Events for {currentDate.toLocaleDateString()}</h3>
        {dayEvents.length === 0 ? (
          <p>No events scheduled for this day.</p>
        ) : (
          dayEvents.map(event => (
            <div 
              key={event.id} 
              style={{
                ...styles.dayCellDay,
                borderLeft: `4px solid ${CATEGORY_COLORS[event.category]}`,
              }}
              onClick={(e) => handleEventClick(event, e)}
            >
              <h4>{event.title}</h4>
              {event.startTime && <p>Time: {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</p>}
              {event.description && <p>{event.description}</p>}
              {event.attendees && <p>Attendees: {event.attendees.join(', ')}</p>}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderAgendaView = () => {
    // Filter events to show only upcoming events (from today onwards)
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = filteredEvents
      .filter(event => event.date >= today)
      .slice()
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.localeCompare(b.startTime);
      });

    return (
      <div style={styles.agendaView}>
        <h3>Upcoming Events</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Showing events from today onwards
        </p>
        {upcomingEvents.length === 0 ? (
          <p>No upcoming events found.</p>
        ) : (
          upcomingEvents.map(event => (
            <div 
              key={event.id} 
              style={styles.agendaItem}
              onClick={(e) => handleEventClick(event, e)}
            >
              <div>
                <div style={styles.agendaDate}>{new Date(event.date).toLocaleDateString()}</div>
                <h4>{event.title}</h4>
                {event.startTime && <p>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</p>}
                {event.description && <p>{event.description}</p>}
              </div>
              <div 
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: CATEGORY_COLORS[event.category],
                }}
              />
            </div>
          ))
        )}
      </div>
    );
  };

  const renderCalendarView = () => {
    switch (currentView) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'agenda':
        return renderAgendaView();
      default:
        return renderMonthView();
    }
  };

  const getViewTitle = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    switch (currentView) {
      case 'month':
        return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'week': {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
      }
      case 'day':
        return currentDate.toLocaleDateString();
      case 'agenda':
        return 'All Events';
      default:
        return '';
    }
  };

  if (isLoggedIn) {
    return (
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>🚀 FlowGenius</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span>Welcome, {userProfile?.full_name || user?.email || 'User'}</span>
            <button 
              style={{...styles.headerButton, ...(gmailConnected ? styles.connectedButton : {})}}
              onClick={() => setShowGmailIntegration(true)}
              title={gmailConnected ? 'Gmail Connected - Click to manage' : 'Connect Gmail'}
            >
              📧 Gmail {gmailConnected && '✓'}
            </button>
            <button 
              style={styles.headerButton}
              onClick={() => setShowNotificationSettings(true)}
              title="Notification Settings"
            >
              🔔
            </button>
            <button 
              style={{...styles.headerButton, ...(showAnalytics ? styles.activeButton : {})}}
              onClick={() => setShowAnalytics(!showAnalytics)}
              title="Productivity Analytics"
            >
              📊
            </button>
            <button 
              style={styles.logoutButton}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
        
        <div style={styles.mainContent}>
          <div style={{
            ...styles.calendarContainer,
            ...(showAnalytics ? styles.calendarWithAnalytics : styles.calendarFullWidth),
          }}>
          {/* Controls */}
          <div style={styles.calendarControls}>
            <div style={styles.searchAndFilter}>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                style={styles.select}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            
            {selectedEvents.length > 0 && (
              <div style={styles.bulkActions}>
                <span>{selectedEvents.length} selected</span>
                <button 
                  style={{...styles.modalButton, ...styles.dangerButton}}
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </button>
                <button 
                  style={{...styles.modalButton, ...styles.secondaryButton}}
                  onClick={() => setSelectedEvents([])}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Calendar Header */}
          <div style={styles.calendarHeader}>
            <div style={styles.calendarTitle}>
              <button 
                style={styles.navButton}
                onClick={() => navigateDate('prev')}
                title="Previous"
              >
                ←
              </button>
              {getViewTitle()}
              <button 
                style={styles.navButton}
                onClick={() => navigateDate('next')}
                title="Next"
              >
                →
              </button>
            </div>
            <div style={styles.viewButtons}>
              {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map(view => (
                <button 
                  key={view}
                  style={{
                    ...styles.viewButton, 
                    ...(currentView === view ? styles.activeViewButton : {})
                  }}
                  onClick={() => setCurrentView(view)}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Calendar */}
          <div style={styles.calendar}>
            {renderCalendarView()}
          </div>
          
            <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
              Click on any day to create a new event • Click events to edit them
            </div>
          </div>
          
          {/* Analytics Pane */}
          {showAnalytics && (
            <div style={styles.analyticsPane}>
              <ProductivityDashboard 
                isVisible={true}
                onClose={() => setShowAnalytics(false)}
              />
            </div>
          )}
        </div>

        {/* Event Creation/Edit Modal */}
        {showEventModal && (
          <div style={styles.modalOverlay} onClick={() => setShowEventModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <span>
                  {editingEvent ? 'Edit Event' : 'Create New Event'} - {new Date(selectedDate).toLocaleDateString()}
                </span>
                {editingEvent && (
                  <button 
                    style={{...styles.modalButton, ...styles.dangerButton}}
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
              
              <form style={styles.modalForm} onSubmit={handleCreateOrUpdateEvent}>
                <input
                  style={styles.modalInput}
                  type="text"
                  placeholder="Event Title *"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  autoFocus
                />
                
                <div style={styles.modalRow}>
                  <input
                    style={styles.modalInput}
                    type="time"
                    placeholder="Start Time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  />
                  <input
                    style={styles.modalInput}
                    type="time"
                    placeholder="End Time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                  />
                </div>
                
                <select
                  style={styles.modalSelect}
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value as Event['category'])}
                >
                  <option value="personal">Personal</option>
                  <option value="work">Work</option>
                  <option value="meeting">Meeting</option>
                  <option value="task">Task</option>
                  <option value="reminder">Reminder</option>
                </select>
                
                <input
                  style={styles.modalInput}
                  type="text"
                  placeholder="Attendees (comma-separated emails)"
                  value={eventAttendees}
                  onChange={(e) => setEventAttendees(e.target.value)}
                />
                
                <textarea
                  style={styles.modalTextarea}
                  placeholder="Description (optional)"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                />
                
                <label style={styles.modalCheckbox}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  Recurring Event
                </label>
                
                {isRecurring && (
                                       <div style={styles.recurrenceSection}>
                     <h4>Repeat</h4>
                     <select
                       style={styles.modalSelect}
                       value={recurrenceFrequency}
                       onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                     >
                       <option value="daily">Every Day</option>
                       <option value="weekly">Every Week</option>
                       <option value="monthly">Every Month</option>
                     </select>
                     <p style={{ fontSize: '12px', color: '#666', margin: '10px 0 0 0' }}>
                       This will create repeating events for the next 30 occurrences
                     </p>
                   </div>
                )}
                
                <div style={styles.modalButtons}>
                  <button 
                    type="button"
                    style={{...styles.modalButton, ...styles.secondaryButton}}
                    onClick={() => setShowEventModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    style={{...styles.modalButton, ...styles.primaryButton}}
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Notification Settings Modal */}
        {showNotificationSettings && (
          <div style={styles.modalOverlay} onClick={() => setShowNotificationSettings(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <span>🔔 Notification Settings</span>
              </div>
              
              <div style={styles.modalForm}>
                <div style={styles.settingsSection}>
                  <h4>Event Reminders</h4>
                  <label style={styles.modalCheckbox}>
                    <input
                      type="checkbox"
                      checked={notificationService.getSettings().eventReminders}
                      onChange={(e) => handleNotificationSettingsUpdate({ eventReminders: e.target.checked })}
                    />
                    Enable event reminders
                  </label>
                  
                  <label style={styles.modalCheckbox}>
                    <input
                      type="checkbox"
                      checked={notificationService.getSettings().soundEnabled}
                      onChange={(e) => handleNotificationSettingsUpdate({ soundEnabled: e.target.checked })}
                    />
                    Enable notification sounds
                  </label>
                  
                  <label style={styles.modalCheckbox}>
                    <input
                      type="checkbox"
                      checked={notificationService.getSettings().productivityInsights}
                      onChange={(e) => handleNotificationSettingsUpdate({ productivityInsights: e.target.checked })}
                    />
                    Enable productivity insights
                  </label>
                </div>

                <div style={styles.settingsSection}>
                  <h4>Test Notifications</h4>
                  <button 
                    type="button"
                    style={{...styles.modalButton, ...styles.primaryButton}}
                    onClick={testNotification}
                  >
                    Send Test Notification
                  </button>
                </div>
                
                <div style={styles.modalButtons}>
                  <button 
                    type="button"
                    style={{...styles.modalButton, ...styles.secondaryButton}}
                    onClick={() => setShowNotificationSettings(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gmail Integration Modal */}
        {showGmailIntegration && (
          <div style={styles.modalOverlay} onClick={() => setShowGmailIntegration(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <span>📧 Gmail Integration</span>
              </div>
              
              <div style={styles.modalForm}>
                <div style={styles.settingsSection}>
                  <h4>Connection Status</h4>
                  <p style={{ color: gmailConnected ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                    {gmailConnected ? '✅ Connected to Gmail' : '❌ Not Connected'}
                  </p>
                  
                  {!gmailConnected ? (
                    <div>
                      <p>Connect Gmail to automatically import calendar events from your emails.</p>
                      <button 
                        style={{...styles.modalButton, ...styles.primaryButton}}
                        onClick={handleGmailConnect}
                      >
                        Connect Gmail
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button 
                        style={{...styles.modalButton, ...styles.primaryButton}}
                        onClick={handleImportFromGmail}
                        disabled={loadingEmails}
                      >
                        {loadingEmails ? 'Importing...' : 'Import Recent Events'}
                      </button>
                      <button 
                        style={{...styles.modalButton, ...styles.dangerButton}}
                        onClick={handleGmailDisconnect}
                      >
                        Disconnect Gmail
                      </button>
                    </div>
                  )}
                </div>

                {gmailEmails.length > 0 && (
                  <div style={styles.settingsSection}>
                    <h4>Recent Emails ({gmailEmails.length})</h4>
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {gmailEmails.map((email, index) => (
                        <div key={email.id || index} style={styles.emailItem}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{email.subject}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>From: {email.from}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>{email.snippet}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div style={styles.modalButtons}>
                  <button 
                    type="button"
                    style={{...styles.modalButton, ...styles.secondaryButton}}
                    onClick={() => setShowGmailIntegration(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <h1 style={styles.title}>🚀 FlowGenius</h1>
          <p style={styles.subtitle}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>🚀 FlowGenius</h1>
        <p style={styles.subtitle}>Your Productivity & Planning Companion</p>
        
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Please sign in to access your productivity dashboard
          </p>
          <button 
            style={{...styles.button, fontSize: '18px', padding: '12px 24px'}}
            onClick={() => setShowAuthModal(true)}
          >
            Get Started
          </button>
        </div>
        
        {authError && (
          <p style={{ textAlign: 'center', marginTop: '16px', color: '#e53e3e', fontSize: '14px' }}>
            {authError}
          </p>
        )}
      </div>

      <AuthModal
        isVisible={showAuthModal}
        onSuccess={handleAuthSuccess}
        onError={handleAuthError}
      />
    </div>
  );
};

export default App; 