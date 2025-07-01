# Smart Scheduling Feature Implementation Guide

## Overview

The Smart Scheduling feature uses LangChain and OpenAI to intelligently analyze event titles and descriptions, classify them as business or hobby activities, and suggest optimal time slots based on business hours and activity type.

## Features

### 1. Event Classification
- **Business Activities**: Classified during business hours (9 AM - 5 PM weekdays)
- **Hobby/Personal Activities**: Classified for evenings and weekends
- **Confidence Scoring**: AI provides confidence levels for classifications
- **Local Fallback**: Keyword-based classification when AI is unavailable

### 2. Intelligent Time Suggestions
- **Context-Aware**: Considers existing calendar events to avoid conflicts
- **Priority Scoring**: Ranks suggestions by optimal time slots
- **Duration Estimation**: Automatically estimates event duration based on content
- **Flexible Scheduling**: Provides multiple time options with reasoning

### 3. User Experience
- **Seamless Integration**: Built into existing event creation modal
- **Visual Feedback**: Clear classification indicators and priority levels
- **One-Click Selection**: Easy time slot selection from suggestions
- **Manual Override**: Users can override AI suggestions

## Implementation Steps

### Phase 1: Setup and Dependencies ✅

1. **Install Dependencies**
   ```bash
   cd FlowGenius
   npm install langchain @langchain/openai @langchain/core
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key
     ```

### Phase 2: Core Implementation ✅

The following files have been created:

1. **Smart Scheduling Service** (`src/renderer/services/smartScheduling.ts`)
   - LangChain integration
   - Event classification logic
   - Time slot generation
   - Local fallback mechanisms

2. **React Components** (`src/renderer/components/Events/SmartSchedulingSuggestions.tsx`)
   - Smart scheduling UI
   - Classification display
   - Time slot selection interface

3. **Redux State Management** (`src/renderer/store/smartSchedulingSlice.ts`)
   - Settings management
   - Preferences storage
   - Async suggestion generation

4. **Type Definitions** (`src/renderer/types/smartScheduling.ts`)
   - TypeScript interfaces
   - Data structures

### Phase 3: Integration Steps

1. **Update Event Creation Flow**
   
   Replace the existing event modal with the enhanced version:
   
   ```tsx
   // In your main App component or wherever events are created
   import EnhancedEventModal from './components/Events/EnhancedEventModal';
   
   // Replace existing event modal usage
   <EnhancedEventModal
     open={showEventModal}
     onClose={() => setShowEventModal(false)}
     onSave={handleEventSave}
     onDelete={handleEventDelete}
     event={editingEvent}
     existingEvents={events}
     selectedDate={selectedDate}
   />
   ```

2. **Update Event Creation Handler**
   
   ```tsx
   const handleEventSave = async (eventData: EventFormData) => {
     try {
       if (editingEvent) {
         // Update existing event
         await dispatch(updateEvent({ 
           eventId: editingEvent.id, 
           eventData, 
           userId: user.id 
         }));
       } else {
         // Create new event
         await dispatch(createEvent({ 
           eventData, 
           userId: user.id 
         }));
       }
       setShowEventModal(false);
       setEditingEvent(null);
     } catch (error) {
       console.error('Error saving event:', error);
     }
   };
   ```

3. **Add Smart Scheduling Settings**
   
   Create a settings panel for users to configure smart scheduling preferences:
   
   ```tsx
   // Example settings component
   const SmartSchedulingSettings = () => {
     const { settings } = useSelector((state: RootState) => state.smartScheduling);
     const dispatch = useDispatch();
     
     return (
       <Box>
         <FormControlLabel
           control={
             <Switch
               checked={settings.enabled}
               onChange={() => dispatch(toggleSmartScheduling())}
             />
           }
           label="Enable Smart Scheduling"
         />
         {/* Add more settings controls */}
       </Box>
     );
   };
   ```

### Phase 4: Testing and Optimization

1. **Test Event Classification**
   ```javascript
   // Test various event types
   const testEvents = [
     { title: "Team Meeting", description: "Weekly standup" },
     { title: "Guitar Practice", description: "Learn new songs" },
     { title: "Doctor Appointment", description: "Annual checkup" },
     { title: "Client Presentation", description: "Q4 results" }
   ];
   ```

2. **Verify Time Suggestions**
   - Business events should suggest 9-5 weekday slots
   - Hobby events should suggest evening/weekend slots
   - Check conflict detection with existing events

3. **Performance Optimization**
   - Implement caching for frequently used classifications
   - Add debouncing for real-time suggestions
   - Optimize API calls to reduce costs

### Phase 5: Advanced Features (Future)

1. **Learning from User Behavior**
   - Track user acceptance/rejection of suggestions
   - Improve classification accuracy over time
   - Personalized scheduling preferences

2. **Integration with External Calendars**
   - Google Calendar sync
   - Outlook integration
   - Cross-platform scheduling

3. **Team Scheduling**
   - Multi-user availability checking
   - Meeting room booking
   - Attendee preferences

## Configuration Options

### Smart Scheduling Preferences

```typescript
interface SchedulingPreferences {
  businessHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  workDays: number[]; // [1, 2, 3, 4, 5] (Monday-Friday)
  preferredDuration: {
    business: number; // 60 minutes
    hobby: number;    // 90 minutes
  };
}
```

### Environment Variables

```env
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
SMART_SCHEDULING_ENABLED=true
SMART_SCHEDULING_PROVIDER=openai
SMART_SCHEDULING_FALLBACK=local
```

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Verify API key is correct
   - Check rate limits and billing
   - Ensure proper error handling

2. **Classification Accuracy**
   - Review keyword lists for local fallback
   - Adjust confidence thresholds
   - Test with diverse event types

3. **Performance Issues**
   - Implement request caching
   - Add loading states
   - Optimize API calls

### Debug Mode

Set `DEBUG_MODE=true` in your environment to enable detailed logging:

```javascript
// In smartScheduling.ts
if (process.env.DEBUG_MODE === 'true') {
  console.log('Smart scheduling debug info:', {
    classification,
    suggestedSlots,
    preferences
  });
}
```

## Security Considerations

1. **API Key Protection**
   - Store API keys in environment variables
   - Never commit keys to version control
   - Use different keys for development/production

2. **Data Privacy**
   - Event data is processed by OpenAI
   - Implement local classification fallback
   - Allow users to opt out of AI features

3. **Rate Limiting**
   - Implement proper rate limiting
   - Cache frequent requests
   - Provide fallback options

## Monitoring and Analytics

1. **Usage Metrics**
   - Track suggestion acceptance rates
   - Monitor classification accuracy
   - Measure time saved in scheduling

2. **Error Tracking**
   - Log API failures
   - Monitor response times
   - Track fallback usage

3. **User Feedback**
   - Collect user ratings on suggestions
   - Allow manual classification corrections
   - Implement feedback loops

## Cost Optimization

1. **API Usage**
   - Cache classification results
   - Batch multiple requests
   - Use local fallback when possible

2. **Model Selection**
   - Start with GPT-3.5-turbo (cheaper)
   - Upgrade to GPT-4 if needed for accuracy
   - Consider fine-tuned models for specific domains

## Deployment

1. **Build Process**
   ```bash
   npm run build
   npm run make
   ```

2. **Environment Setup**
   - Ensure all environment variables are set
   - Test in staging environment
   - Monitor performance in production

3. **User Training**
   - Provide onboarding for smart scheduling
   - Create help documentation
   - Offer tutorial videos

## Support and Maintenance

1. **Regular Updates**
   - Update LangChain dependencies
   - Monitor OpenAI API changes
   - Improve classification keywords

2. **User Support**
   - Provide clear error messages
   - Offer manual override options
   - Maintain comprehensive documentation

This implementation provides a solid foundation for intelligent event scheduling in FlowGenius. The system is designed to be extensible, maintainable, and user-friendly while providing significant value through AI-powered scheduling assistance. 