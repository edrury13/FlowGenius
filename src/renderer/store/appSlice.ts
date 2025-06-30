import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CalendarView } from '../types';

interface AppState {
  currentView: CalendarView;
  selectedDate: Date;
  loading: boolean;
  error: string | null;
  showEventModal: boolean;
  showSettingsModal: boolean;
}

const initialState: AppState = {
  currentView: 'month',
  selectedDate: new Date(),
  loading: false,
  error: null,
  showEventModal: false,
  showSettingsModal: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setCurrentView: (state, action: PayloadAction<CalendarView>) => {
      state.currentView = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<Date>) => {
      state.selectedDate = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setShowEventModal: (state, action: PayloadAction<boolean>) => {
      state.showEventModal = action.payload;
    },
    setShowSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.showSettingsModal = action.payload;
    },
    navigateDate: (state, action: PayloadAction<'prev' | 'next' | 'today'>) => {
      const currentDate = new Date(state.selectedDate);
      
      switch (action.payload) {
        case 'prev':
          if (state.currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
          } else if (state.currentView === 'week') {
            currentDate.setDate(currentDate.getDate() - 7);
          } else if (state.currentView === 'day') {
            currentDate.setDate(currentDate.getDate() - 1);
          }
          break;
        case 'next':
          if (state.currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          } else if (state.currentView === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (state.currentView === 'day') {
            currentDate.setDate(currentDate.getDate() + 1);
          }
          break;
        case 'today':
          state.selectedDate = new Date();
          return;
      }
      
      state.selectedDate = currentDate;
    },
  },
});

export const {
  setCurrentView,
  setSelectedDate,
  setLoading,
  setError,
  clearError,
  setShowEventModal,
  setShowSettingsModal,
  navigateDate,
} = appSlice.actions;

export default appSlice.reducer; 