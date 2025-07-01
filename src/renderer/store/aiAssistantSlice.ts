import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, UserContext } from '../services/aiAssistant';

interface AIAssistantState {
  isVisible: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  userContext: UserContext;
  conversationId: string | null;
  error: string | null;
}

const defaultUserContext: UserContext = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  workingHours: {
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  },
  preferences: {
    meetingDuration: 60,
    preferredMeetingTimes: ['10:00', '14:00'],
    commonLocations: ['Conference Room A', 'Office', 'Online'],
    frequentContacts: []
  }
};

const initialState: AIAssistantState = {
  isVisible: false,
  messages: [],
  isLoading: false,
  userContext: defaultUserContext,
  conversationId: null,
  error: null
};

const aiAssistantSlice = createSlice({
  name: 'aiAssistant',
  initialState,
  reducers: {
    toggleVisibility: (state) => {
      state.isVisible = !state.isVisible;
      state.error = null;
    },
    
    showAssistant: (state) => {
      state.isVisible = true;
      state.error = null;
    },
    
    hideAssistant: (state) => {
      state.isVisible = false;
    },
    
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      state.error = null;
    },
    
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
      state.error = null;
    },
    
    clearMessages: (state) => {
      state.messages = [];
      state.conversationId = null;
      state.error = null;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    updateUserContext: (state, action: PayloadAction<Partial<UserContext>>) => {
      state.userContext = { ...state.userContext, ...action.payload };
    },
    
    setUserLocation: (state, action: PayloadAction<string>) => {
      state.userContext.location = action.payload;
    },
    
    updateWorkingHours: (state, action: PayloadAction<{ start: string; end: string; days: number[] }>) => {
      state.userContext.workingHours = action.payload;
    },
    
    addFrequentContact: (state, action: PayloadAction<string>) => {
      if (!state.userContext.preferences.frequentContacts.includes(action.payload)) {
        state.userContext.preferences.frequentContacts.push(action.payload);
      }
    },
    
    removeFrequentContact: (state, action: PayloadAction<string>) => {
      state.userContext.preferences.frequentContacts = 
        state.userContext.preferences.frequentContacts.filter(contact => contact !== action.payload);
    },
    
    addCommonLocation: (state, action: PayloadAction<string>) => {
      if (!state.userContext.preferences.commonLocations.includes(action.payload)) {
        state.userContext.preferences.commonLocations.push(action.payload);
      }
    },
    
    removeCommonLocation: (state, action: PayloadAction<string>) => {
      state.userContext.preferences.commonLocations = 
        state.userContext.preferences.commonLocations.filter(location => location !== action.payload);
    },
    
    setPreferredMeetingTimes: (state, action: PayloadAction<string[]>) => {
      state.userContext.preferences.preferredMeetingTimes = action.payload;
    },
    
    setDefaultMeetingDuration: (state, action: PayloadAction<number>) => {
      state.userContext.preferences.meetingDuration = action.payload;
    },
    
    startNewConversation: (state) => {
      state.messages = [];
      state.conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      state.error = null;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Analytics and learning actions
    recordSuccessfulScheduling: (state, action: PayloadAction<{
      eventType: string;
      suggestedLocation: string;
      suggestedAttendees: string[];
      timeSlotUsed: number; // index of the time slot that was used
    }>) => {
      // Update user preferences based on successful scheduling
      const { suggestedLocation, suggestedAttendees } = action.payload;
      
      // Add location to common locations if not already there
      if (suggestedLocation && !state.userContext.preferences.commonLocations.includes(suggestedLocation)) {
        state.userContext.preferences.commonLocations.push(suggestedLocation);
      }
      
      // Add attendees to frequent contacts
      suggestedAttendees.forEach(attendee => {
        if (!state.userContext.preferences.frequentContacts.includes(attendee)) {
          state.userContext.preferences.frequentContacts.push(attendee);
        }
      });
    },
    
    // Reset to default settings
    resetUserContext: (state) => {
      state.userContext = defaultUserContext;
    }
  }
});

export const {
  toggleVisibility,
  showAssistant,
  hideAssistant,
  addMessage,
  setMessages,
  clearMessages,
  setLoading,
  updateUserContext,
  setUserLocation,
  updateWorkingHours,
  addFrequentContact,
  removeFrequentContact,
  addCommonLocation,
  removeCommonLocation,
  setPreferredMeetingTimes,
  setDefaultMeetingDuration,
  startNewConversation,
  setError,
  clearError,
  recordSuccessfulScheduling,
  resetUserContext
} = aiAssistantSlice.actions;

export default aiAssistantSlice.reducer;

// Selectors
export const selectAIAssistant = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant;
export const selectAIAssistantVisibility = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.isVisible;
export const selectAIAssistantMessages = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.messages;
export const selectAIAssistantLoading = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.isLoading;
export const selectAIAssistantUserContext = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.userContext;
export const selectAIAssistantError = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.error; 