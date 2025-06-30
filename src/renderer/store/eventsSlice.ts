import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Event, eventService } from '../services/supabase';
import { EventFormData } from '../types';
import dayjs from 'dayjs';

interface EventsState {
  events: Event[];
  loading: boolean;
  error: string | null;
  selectedEvent: Event | null;
}

const initialState: EventsState = {
  events: [],
  loading: false,
  error: null,
  selectedEvent: null,
};

// Helper function to convert EventFormData to Event
const formDataToEvent = (formData: EventFormData, userId: string): Omit<Event, 'id' | 'created_at' | 'updated_at'> => ({
  user_id: userId,
  title: formData.title,
  description: formData.description,
  start_time: formData.startTime.toISOString(),
  end_time: formData.endTime.toISOString(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  location: formData.location,
  attendees: formData.attendees,
  is_recurring: formData.isRecurring,
  recurrence_rule: formData.recurrenceRule,
});

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async ({ userId, startDate, endDate }: { userId: string; startDate?: string; endDate?: string }) => {
    const events = await eventService.getEvents(userId, startDate, endDate);
    return events;
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async ({ eventData, userId }: { eventData: EventFormData; userId: string }) => {
    const event = formDataToEvent(eventData, userId);
    const newEvent = await eventService.createEvent(event);
    return newEvent;
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, eventData, userId }: { eventId: string; eventData: Partial<EventFormData>; userId: string }) => {
    const updates: Partial<Event> = {};
    
    if (eventData.title !== undefined) updates.title = eventData.title;
    if (eventData.description !== undefined) updates.description = eventData.description;
    if (eventData.startTime !== undefined) updates.start_time = eventData.startTime.toISOString();
    if (eventData.endTime !== undefined) updates.end_time = eventData.endTime.toISOString();
    if (eventData.location !== undefined) updates.location = eventData.location;
    if (eventData.attendees !== undefined) updates.attendees = eventData.attendees;
    if (eventData.isRecurring !== undefined) updates.is_recurring = eventData.isRecurring;
    if (eventData.recurrenceRule !== undefined) updates.recurrence_rule = eventData.recurrenceRule;

    const updatedEvent = await eventService.updateEvent(eventId, updates);
    return updatedEvent;
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string) => {
    await eventService.deleteEvent(eventId);
    return eventId;
  }
);

export const fetchRecurringEvents = createAsyncThunk(
  'events/fetchRecurringEvents',
  async (parentEventId: string) => {
    const events = await eventService.getRecurringEvents(parentEventId);
    return events;
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setSelectedEvent: (state, action: PayloadAction<Event | null>) => {
      state.selectedEvent = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setEvents: (state, action: PayloadAction<Event[]>) => {
      state.events = action.payload;
    },
    addEvent: (state, action: PayloadAction<Event>) => {
      state.events.push(action.payload);
    },
    removeEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(event => event.id !== action.payload);
    },
    updateEventInList: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Events
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      })
      // Create Event
      .addCase(createEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events.push(action.payload);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create event';
      })
      // Update Event
      .addCase(updateEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.events.findIndex(event => event.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update event';
      })
      // Delete Event
      .addCase(deleteEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events = state.events.filter(event => event.id !== action.payload);
        if (state.selectedEvent?.id === action.payload) {
          state.selectedEvent = null;
        }
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete event';
      });
  },
});

export const { 
  setSelectedEvent, 
  clearError, 
  setEvents, 
  addEvent, 
  removeEvent, 
  updateEventInList 
} = eventsSlice.actions;

export default eventsSlice.reducer; 