import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';
import eventsSlice from './eventsSlice';
import appSlice from './appSlice';
import smartSchedulingSlice from './smartSchedulingSlice';
import aiAssistantSlice from './aiAssistantSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    events: eventsSlice,
    app: appSlice,
    smartScheduling: smartSchedulingSlice,
    aiAssistant: aiAssistantSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['events/setEvents', 'events/addEvent', 'events/updateEvent'],
        ignoredPaths: ['events.events', 'app.selectedDate'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 