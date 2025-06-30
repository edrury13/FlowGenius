import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';
import eventsSlice from './eventsSlice';
import appSlice from './appSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    events: eventsSlice,
    app: appSlice,
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