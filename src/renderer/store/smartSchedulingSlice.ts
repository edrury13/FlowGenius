import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  SmartSchedulingResult, 
  SchedulingPreferences, 
  SmartSchedulingSettings 
} from '../types/smartScheduling';

interface SmartSchedulingState {
  settings: SmartSchedulingSettings;
  lastSuggestion: SmartSchedulingResult | null;
  loading: boolean;
  error: string | null;
}

const defaultPreferences: SchedulingPreferences = {
  businessHours: {
    start: '09:00',
    end: '17:00'
  },
  workDays: [1, 2, 3, 4, 5], // Monday to Friday
  preferredDuration: {
    business: 60, // 1 hour
    hobby: 90     // 1.5 hours
  }
};

const initialState: SmartSchedulingState = {
  settings: {
    enabled: true,
    autoApplySuggestions: false,
    showClassificationDetails: true,
    preferences: defaultPreferences,
    llmProvider: 'openai'
  },
  lastSuggestion: null,
  loading: false,
  error: null
};

// Async thunk for generating scheduling suggestions
export const generateSchedulingSuggestions = createAsyncThunk(
  'smartScheduling/generateSuggestions',
  async (params: {
    title: string;
    description: string;
    preferredDate?: Date;
    existingEvents: any[];
    preferences?: Partial<SchedulingPreferences>;
  }) => {
    // This will be called from the component
    // For now, return a mock result to prevent errors
    return {
      classification: {
        type: 'business' as const,
        confidence: 0.8,
        reasoning: 'Mock classification for development'
      },
      suggestedSlots: [],
      duration: 60
    };
  }
);

const smartSchedulingSlice = createSlice({
  name: 'smartScheduling',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SmartSchedulingSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    updatePreferences: (state, action: PayloadAction<Partial<SchedulingPreferences>>) => {
      state.settings.preferences = { ...state.settings.preferences, ...action.payload };
    },
    setLastSuggestion: (state, action: PayloadAction<SmartSchedulingResult | null>) => {
      state.lastSuggestion = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    toggleSmartScheduling: (state) => {
      state.settings.enabled = !state.settings.enabled;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateSchedulingSuggestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateSchedulingSuggestions.fulfilled, (state, action) => {
        state.loading = false;
        state.lastSuggestion = action.payload;
      })
      .addCase(generateSchedulingSuggestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate suggestions';
      });
  }
});

export const {
  updateSettings,
  updatePreferences,
  setLastSuggestion,
  clearError,
  toggleSmartScheduling
} = smartSchedulingSlice.actions;

export default smartSchedulingSlice.reducer; 