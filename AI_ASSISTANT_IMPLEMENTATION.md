# 🤖 AI Assistant Chatbot Implementation

## Overview
The FlowGenius AI Assistant is a sophisticated conversational interface that allows users to schedule events using natural language. It leverages LangChain and OpenAI to provide intelligent event scheduling with context-aware suggestions for times, locations, and invitees.

## ✨ Key Features

### Natural Language Processing
- **Conversational Interface**: Users can describe events in plain English
- **Smart Classification**: Automatically categorizes events as business, hobby, or personal
- **Context Understanding**: Extracts event details like participants, timing, and type from descriptions
- **Follow-up Questions**: Asks for clarification when information is missing

### Intelligent Suggestions
- **Time Slot Recommendations**: Suggests optimal meeting times based on:
  - User's working hours (9-5 for business, evenings/weekends for personal)
  - Existing calendar conflicts
  - Event type and duration
- **Location Suggestions**: Recommends venues based on:
  - Event type (conference room for meetings, restaurant for lunch)
  - Keywords in description (online for virtual meetings)
  - User's common locations
- **Invitee Recommendations**: Suggests attendees based on:
  - Names mentioned in description
  - Event type (team members for team meetings)
  - Historical patterns

### Learning & Personalization
- **User Context Tracking**: Learns from user preferences and scheduling patterns
- **Common Locations**: Remembers frequently used venues
- **Frequent Contacts**: Builds a list of regular meeting participants
- **Working Hours**: Adapts to user's schedule preferences

## 🏗️ Technical Architecture

### Core Components

#### 1. AIAssistantService (`src/renderer/services/aiAssistant.ts`)
- **Main Service Class**: Handles natural language processing and event suggestions
- **LangChain Integration**: Uses ChatOpenAI for intelligent conversation
- **Fallback Logic**: Local keyword-based processing when OpenAI is unavailable
- **Context Management**: Maintains user preferences and conversation history

```typescript
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: EventSuggestion[];
  eventData?: Partial<EventFormData>;
}

interface EventSuggestion {
  id: string;
  title: string;
  description: string;
  suggestedTimes: TimeSlotSuggestion[];
  suggestedLocation?: string;
  suggestedInvitees?: string[];
  confidence: number;
  reasoning: string;
}
```

#### 2. ChatInterface Component (`src/renderer/components/AIAssistant/ChatInterface.tsx`)
- **React Chat UI**: Beautiful Material-UI chat interface
- **Message Rendering**: Displays user and AI messages with timestamps
- **Suggestion Cards**: Interactive cards showing event suggestions
- **Time Slot Selection**: Clickable time suggestions with priority indicators
- **Event Creation**: One-click event creation from suggestions

#### 3. Redux State Management (`src/renderer/store/aiAssistantSlice.ts`)
- **Conversation State**: Manages chat messages and loading states
- **User Context**: Stores preferences, working hours, and locations
- **Learning Analytics**: Tracks successful scheduling for improvement
- **Visibility Control**: Handles show/hide functionality

### Integration Points

#### App Component Integration
- **Floating Action Button**: Always-visible AI assistant trigger
- **Drawer Interface**: Slide-out chat panel
- **Event Creation**: Seamless integration with existing calendar
- **Redux Connection**: State management and event handling

## 💬 User Experience

### Sample Conversations

**Example 1: Team Meeting**
```
User: "Schedule a team meeting next Tuesday to discuss the project"
AI: I'd be happy to help you schedule that! Based on your request, I suggest:

📅 **Team Meeting**
📍 Location: Conference Room A
👥 Invitees: Team Members

Suggested Times:
1. Tuesday, July 9th at 10:00 AM - 11:00 AM (Priority: 1)
2. Tuesday, July 9th at 2:00 PM - 3:00 PM (Priority: 2)
3. Tuesday, July 9th at 4:00 PM - 5:00 PM (Priority: 3)

[Use This Time] buttons for each suggestion
```

**Example 2: Client Call**
```
User: "Set up a client call with John Smith next week"
AI: I'll help you schedule that client call! Here are my suggestions:

📅 **Call**
📍 Location: Online
👥 Invitees: John Smith

I noticed you mentioned "next week" - would you prefer a specific day? 
Most client calls work well on Tuesday-Thursday between 10 AM and 4 PM.
```

### UI Features
- **Welcome Message**: Friendly greeting with example phrases
- **Typing Indicators**: Shows when AI is processing
- **Confidence Scores**: Displays AI confidence in suggestions
- **Reasoning Expandable**: Accordion showing why suggestions were made
- **Priority Indicators**: Color-coded priority levels for time slots
- **One-Click Creation**: Direct event creation from suggestions

## 🔧 Configuration & Setup

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### User Context Configuration
```typescript
const defaultUserContext: UserContext = {
  timezone: 'America/New_York',
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
```

## 🚀 Usage Examples

### Accessing the Assistant
1. **Floating Action Button**: Click the brain icon (🧠) in the bottom-right corner
2. **Slide-out Panel**: AI chat interface opens from the right side
3. **Natural Language**: Type your scheduling request in plain English

### Supported Phrases
- "Schedule a team meeting next Tuesday"
- "Set up lunch with Sarah tomorrow"
- "Book the conference room for project review"
- "Plan a client call with John next week"
- "Create a doctor appointment on Friday morning"
- "Set up a virtual demo for the new feature"

### Advanced Features
- **Context Carryover**: Maintains conversation context for follow-ups
- **Learning Mode**: Improves suggestions based on your choices
- **Conflict Detection**: Warns about scheduling conflicts
- **Multi-timezone Support**: Handles different time zones intelligently

## 🔮 Future Enhancements

### Planned Features
1. **Voice Input**: Speech-to-text for hands-free scheduling
2. **Calendar Integration**: Sync with Google Calendar, Outlook, etc.
3. **Smart Reminders**: AI-generated reminder text based on event type
4. **Meeting Prep**: Automatic agenda generation and preparation suggestions
5. **Email Integration**: Parse meeting requests from emails
6. **Recurring Events**: Smart handling of series and patterns
7. **Conflict Resolution**: Intelligent rescheduling suggestions

### AI Improvements
- **Multi-turn Conversations**: Better context understanding across messages
- **Intent Recognition**: More sophisticated understanding of user goals
- **Preference Learning**: Deeper personalization based on usage patterns
- **Natural Language Generation**: More human-like response generation

## 🛠️ Development Notes

### Dependencies Added
```json
{
  "langchain": "^0.3.29",
  "@langchain/openai": "^0.5.16",
  "@langchain/core": "^0.3.61"
}
```

### File Structure
```
src/renderer/
├── components/AIAssistant/
│   └── ChatInterface.tsx
├── services/
│   └── aiAssistant.ts
├── store/
│   └── aiAssistantSlice.ts
└── types/
    └── smartScheduling.ts (updated)
```

### Build Process
The AI Assistant is fully integrated into the existing build process and requires no additional configuration beyond the OpenAI API key.

---

🎉 **The AI Assistant is now ready to revolutionize how users interact with FlowGenius!** Users can now schedule events naturally using conversational language, making productivity management more intuitive and efficient. 