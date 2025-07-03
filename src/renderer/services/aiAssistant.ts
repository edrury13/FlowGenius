import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { Event } from './supabase';
import { EventFormData, EventLocation } from '../types';
import { TimeSlotSuggestion, EventClassification } from '../types/smartScheduling';
import { locationService } from './location';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: EventSuggestion[];
  eventData?: Partial<EventFormData>;
}

export interface EventSuggestion {
  id: string;
  title: string;
  description: string;
  suggestedTimes: TimeSlotSuggestion[];
  suggestedLocation?: string;
  locationSuggestions?: EventLocation[];
  suggestedInvitees?: string[];
  confidence: number;
  reasoning: string;
}

export interface UserContext {
  location?: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
    days: number[];
  };
  preferences: {
    meetingDuration: number;
    preferredMeetingTimes: string[];
    commonLocations: string[];
    frequentContacts: string[];
  };
}

export class AIAssistantService {
  private llm: ChatOpenAI | null = null;
  private conversationHistory: ChatMessage[] = [];
  private userContext: UserContext;

  constructor() {
    
    // Initialize with default user context
    this.userContext = {
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

    // Initialize LLM if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.llm = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Process user message and generate AI response with event suggestions
   */
  async processMessage(userMessage: string, existingEvents: Event[]): Promise<ChatMessage> {
    const userChatMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    this.conversationHistory.push(userChatMessage);

    try {
      if (this.llm) {
        return await this.processWithLLM(userMessage, existingEvents);
      } else {
        return await this.processWithFallback(userMessage, existingEvents);
      }
    } catch (error) {
      console.error('Error processing AI message:', error);
      return this.createErrorResponse();
    }
  }

  /**
   * Process message using LLM for natural language understanding
   */
  private async processWithLLM(userMessage: string, existingEvents: Event[]): Promise<ChatMessage> {
    const systemPrompt = this.createSystemPrompt(existingEvents);
    const contextPrompt = this.createContextPrompt(userMessage);

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(contextPrompt)
    ];

    const response = await this.llm!.invoke(messages);
    const aiResponse = response.content as string;

    // Parse the LLM response to extract structured event data
    const eventSuggestion = await this.parseEventSuggestion(aiResponse, userMessage, existingEvents);
    
    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      suggestions: eventSuggestion ? [eventSuggestion] : [],
      eventData: eventSuggestion ? this.convertSuggestionToFormData(eventSuggestion) : undefined
    };

    this.conversationHistory.push(assistantMessage);
    return assistantMessage;
  }

  /**
   * Fallback processing without LLM
   */
  private async processWithFallback(userMessage: string, existingEvents: Event[]): Promise<ChatMessage> {
    const keywords = this.extractKeywords(userMessage.toLowerCase());
    const eventType = this.inferEventType(keywords);
    const timeInfo = this.extractTimeInfo(userMessage);
    
    // Generate location suggestions using the location service
    const locationSuggestions = await this.generateLocationSuggestions(userMessage, eventType);
    
    const suggestion: EventSuggestion = {
      id: this.generateId(),
      title: this.suggestTitle(keywords, eventType),
      description: `Based on your message: "${userMessage}"`,
      suggestedTimes: this.suggestTimes(timeInfo, existingEvents),
      suggestedLocation: this.suggestLocation(eventType, keywords),
      locationSuggestions,
      suggestedInvitees: this.suggestInvitees(keywords, existingEvents),
      confidence: 0.7,
      reasoning: 'Generated using pattern matching and keyword analysis'
    };

    const response = this.generateFallbackResponse(suggestion);

    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: response,
      timestamp: new Date(),
      suggestions: [suggestion],
      eventData: this.convertSuggestionToFormData(suggestion)
    };

    this.conversationHistory.push(assistantMessage);
    return assistantMessage;
  }

  /**
   * Create system prompt for LLM
   */
  private createSystemPrompt(existingEvents: Event[]): string {
    const recentEvents = existingEvents.slice(-10); // Last 10 events for context
    
    return `You are FlowGenius AI Assistant. You help users schedule events in a friendly, conversational way.

CONTEXT:
- User timezone: ${this.userContext.timezone}
- Working hours: ${this.userContext.workingHours.start}-${this.userContext.workingHours.end}
- Common locations: ${this.userContext.preferences.commonLocations.join(', ')}

RESPONSE STYLE:
- Be conversational and friendly
- Keep responses short and natural (1-2 sentences max)
- Don't list numbered breakdowns or analysis
- Ask simple follow-up questions if you need clarification
- Let the UI show the time/location suggestions

EXAMPLES:
- "I need to schedule a team meeting" → "Great! I can help you schedule that team meeting. What day works best for you?"
- "Set up lunch with Sarah" → "Perfect! I've found some good lunch times. Check out the suggestions below."
- "Book a client call" → "I'd be happy to help schedule that client call. Any preference on the day or time?"`;
  }

  /**
   * Create context prompt with user message
   */
  private createContextPrompt(userMessage: string): string {
    return `User request: "${userMessage}"

Please help schedule this event by understanding the context:
- If it's a meal (breakfast, lunch, dinner, brunch), suggest appropriate meal times
- If it's an evening/night event, suggest evening hours
- If it's a morning event, suggest morning hours  
- If it's a weekend event, be more flexible with timing
- If it's a business meeting, suggest business hours
- If specific people are mentioned, include them

Respond naturally and conversationally. The system will automatically suggest appropriate times based on the event type.`;
  }

  /**
   * Parse LLM response to extract event suggestion
   */
  private async parseEventSuggestion(aiResponse: string, originalMessage: string, existingEvents: Event[]): Promise<EventSuggestion | null> {
    // Extract structured data from AI response
    const eventType = this.inferEventTypeFromMessage(originalMessage);
    const keywords = this.extractKeywords(originalMessage.toLowerCase());
    
    // Use smart scheduling for time suggestions
    const timeInfo = this.extractTimeInfo(originalMessage);
    const suggestedTimes = this.suggestTimes(timeInfo, existingEvents);

    // Generate location suggestions using the location service
    const locationSuggestions = await this.generateLocationSuggestions(originalMessage, eventType);

    return {
      id: this.generateId(),
      title: this.suggestTitle(keywords, eventType),
      description: aiResponse,
      suggestedTimes,
      suggestedLocation: this.suggestLocation(eventType, keywords),
      locationSuggestions,
      suggestedInvitees: this.suggestInvitees(keywords, existingEvents),
      confidence: 0.85,
      reasoning: 'Generated using AI analysis and smart scheduling'
    };
  }

  /**
   * Extract keywords from user message
   */
  private extractKeywords(message: string): string[] {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'we', 'need', 'want', 'schedule', 'set', 'up', 'book'];
    return message.split(/\s+/).filter(word => 
      word.length > 2 && !commonWords.includes(word)
    );
  }

  /**
   * Infer event type from keywords
   */
  private inferEventType(keywords: string[]): 'business' | 'hobby' {
    const businessKeywords = ['meeting', 'call', 'conference', 'presentation', 'review', 'team', 'client', 'project', 'work', 'office'];
    const hobbyKeywords = ['dinner', 'lunch', 'coffee', 'game', 'party', 'workout', 'hobby', 'personal', 'fun'];
    
    const businessScore = keywords.filter(k => businessKeywords.includes(k)).length;
    const hobbyScore = keywords.filter(k => hobbyKeywords.includes(k)).length;
    
    return businessScore >= hobbyScore ? 'business' : 'hobby';
  }

  private inferEventTypeFromMessage(message: string): 'business' | 'hobby' {
    return this.inferEventType(this.extractKeywords(message.toLowerCase()));
  }

  /**
   * Extract time information from message
   */
  private extractTimeInfo(message: string): any {
    const timePatterns = {
      nextWeek: /next week/i,
      tomorrow: /tomorrow/i,
      today: /today/i,
      monday: /monday/i,
      tuesday: /tuesday/i,
      wednesday: /wednesday/i,
      thursday: /thursday/i,
      friday: /friday/i,
      saturday: /saturday/i,
      sunday: /sunday/i,
      morning: /morning/i,
      afternoon: /afternoon/i,
      evening: /evening/i,
      night: /night/i,
      lunch: /lunch/i,
      dinner: /dinner/i,
      breakfast: /breakfast/i,
      brunch: /brunch/i
    };

    const found: any = {};
    Object.entries(timePatterns).forEach(([key, pattern]) => {
      if (pattern.test(message)) {
        found[key] = true;
      }
    });

    return found;
  }

  /**
   * Suggest times based on extracted time info and existing events
   */
  private suggestTimes(timeInfo: any, existingEvents: Event[]): TimeSlotSuggestion[] {
    const now = new Date();
    const suggestions: TimeSlotSuggestion[] = [];

    // Determine target date
    let targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1); // Default to tomorrow
    
    if (timeInfo.nextWeek) {
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (timeInfo.today) {
      targetDate = new Date(now);
    }

    // Smart time suggestions based on context
    const timeSlots = this.getContextualTimeSlots(timeInfo);
    
    timeSlots.forEach((timeSlot, index) => {
      const slotTime = new Date(targetDate);
      slotTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
      
      // If time is in the past for today, move to next day
      if (timeInfo.today && slotTime <= now) {
        slotTime.setDate(slotTime.getDate() + 1);
      }

      const duration = timeSlot.duration || 60; // Default 1 hour
      
      suggestions.push({
        startTime: slotTime,
        endTime: new Date(slotTime.getTime() + duration * 60 * 1000),
        priority: index + 1,
        conflictScore: 0,
        optimalityScore: timeSlot.optimality || (0.9 - (index * 0.2)),
        reasoning: timeSlot.reasoning
      });
    });

    return suggestions;
  }

  /**
   * Get contextual time slots based on event type and keywords
   */
  private getContextualTimeSlots(timeInfo: any): Array<{hour: number, minute: number, duration?: number, optimality?: number, reasoning: string}> {
    // Breakfast events
    if (timeInfo.breakfast) {
      return [
        { hour: 8, minute: 0, duration: 60, optimality: 0.95, reasoning: "Perfect breakfast time" },
        { hour: 9, minute: 0, duration: 60, optimality: 0.85, reasoning: "Good morning breakfast" },
        { hour: 7, minute: 30, duration: 60, optimality: 0.75, reasoning: "Early breakfast option" }
      ];
    }

    // Brunch events
    if (timeInfo.brunch) {
      return [
        { hour: 11, minute: 0, duration: 90, optimality: 0.95, reasoning: "Perfect brunch time" },
        { hour: 10, minute: 30, duration: 90, optimality: 0.85, reasoning: "Good brunch timing" },
        { hour: 12, minute: 0, duration: 90, optimality: 0.75, reasoning: "Late brunch option" }
      ];
    }

    // Lunch events
    if (timeInfo.lunch) {
      return [
        { hour: 12, minute: 0, duration: 60, optimality: 0.95, reasoning: "Perfect lunch time" },
        { hour: 12, minute: 30, duration: 60, optimality: 0.90, reasoning: "Great lunch timing" },
        { hour: 11, minute: 30, duration: 60, optimality: 0.80, reasoning: "Early lunch option" }
      ];
    }

    // Dinner events
    if (timeInfo.dinner) {
      return [
        { hour: 19, minute: 0, duration: 120, optimality: 0.95, reasoning: "Perfect dinner time" },
        { hour: 18, minute: 30, duration: 120, optimality: 0.90, reasoning: "Great dinner timing" },
        { hour: 20, minute: 0, duration: 120, optimality: 0.85, reasoning: "Later dinner option" }
      ];
    }

    // Evening events
    if (timeInfo.evening || timeInfo.night) {
      return [
        { hour: 18, minute: 0, duration: 90, optimality: 0.90, reasoning: "Perfect evening time" },
        { hour: 19, minute: 0, duration: 90, optimality: 0.85, reasoning: "Good evening timing" },
        { hour: 17, minute: 30, duration: 90, optimality: 0.75, reasoning: "Earlier evening option" }
      ];
    }

    // Morning events
    if (timeInfo.morning) {
      return [
        { hour: 9, minute: 0, duration: 60, optimality: 0.90, reasoning: "Perfect morning time" },
        { hour: 10, minute: 0, duration: 60, optimality: 0.85, reasoning: "Good morning timing" },
        { hour: 8, minute: 30, duration: 60, optimality: 0.75, reasoning: "Early morning option" }
      ];
    }

    // Afternoon events
    if (timeInfo.afternoon) {
      return [
        { hour: 14, minute: 0, duration: 60, optimality: 0.90, reasoning: "Perfect afternoon time" },
        { hour: 15, minute: 0, duration: 60, optimality: 0.85, reasoning: "Good afternoon timing" },
        { hour: 13, minute: 30, duration: 60, optimality: 0.80, reasoning: "Early afternoon option" }
      ];
    }

    // Weekend suggestions (more flexible timing)
    if (timeInfo.saturday || timeInfo.sunday) {
      return [
        { hour: 14, minute: 0, duration: 90, optimality: 0.90, reasoning: "Perfect weekend timing" },
        { hour: 11, minute: 0, duration: 90, optimality: 0.85, reasoning: "Great weekend morning" },
        { hour: 16, minute: 0, duration: 90, optimality: 0.80, reasoning: "Good weekend afternoon" }
      ];
    }

    // Default business hours for meetings/work events
    return [
      { hour: 10, minute: 0, duration: 60, optimality: 0.90, reasoning: "Optimal business hours" },
      { hour: 14, minute: 0, duration: 60, optimality: 0.85, reasoning: "Good afternoon slot" },
      { hour: 11, minute: 0, duration: 60, optimality: 0.80, reasoning: "Available morning time" }
    ];
  }

  /**
   * Suggest location based on event type and keywords
   */
  private suggestLocation(eventType: 'business' | 'hobby', keywords: string[]): string {
    // Virtual/online events
    if (keywords.some(k => ['online', 'virtual', 'zoom', 'teams', 'skype', 'call', 'video', 'remote'].includes(k))) {
      return 'Online';
    }

    // Meal-related locations
    if (keywords.includes('dinner')) {
      return 'Restaurant';
    }
    if (keywords.includes('lunch')) {
      return 'Restaurant';
    }
    if (keywords.includes('breakfast')) {
      return 'Café';
    }
    if (keywords.includes('brunch')) {
      return 'Brunch Spot';
    }
    if (keywords.includes('coffee')) {
      return 'Coffee Shop';
    }
    if (keywords.includes('drinks')) {
      return 'Bar/Lounge';
    }

    // Health/medical
    if (keywords.some(k => ['doctor', 'dentist', 'medical', 'clinic', 'hospital'].includes(k))) {
      return 'Medical Office';
    }

    // Fitness/wellness
    if (keywords.some(k => ['workout', 'gym', 'fitness', 'yoga', 'exercise'].includes(k))) {
      return 'Gym';
    }

    // Business events
    if (eventType === 'business') {
      if (keywords.some(k => ['presentation', 'demo', 'large', 'all-hands', 'company'].includes(k))) {
        return 'Conference Room';
      }
      if (keywords.some(k => ['interview', 'meeting', 'discussion'].includes(k))) {
        return 'Meeting Room';
      }
      if (keywords.some(k => ['training', 'workshop', 'seminar'].includes(k))) {
        return 'Training Room';
      }
      return 'Office';
    }

    // Personal/hobby events
    if (eventType === 'hobby') {
      if (keywords.some(k => ['party', 'birthday', 'celebration'].includes(k))) {
        return 'Event Venue';
      }
      if (keywords.some(k => ['movie', 'cinema', 'film'].includes(k))) {
        return 'Movie Theater';
      }
      if (keywords.some(k => ['shopping', 'mall'].includes(k))) {
        return 'Shopping Center';
      }
      if (keywords.some(k => ['park', 'outdoor', 'picnic'].includes(k))) {
        return 'Park';
      }
      return 'TBD';
    }

    // Default fallback
    return 'TBD';
  }

  /**
   * Generate location suggestions using the location service
   */
  private async generateLocationSuggestions(message: string, eventType: 'business' | 'hobby'): Promise<EventLocation[]> {
    try {
      // Get user's current location
      const userLocation = await this.getUserLocation();
      
      // Determine event type based on message and classification
      let locationType = 'meeting';
      const lowerMessage = message.toLowerCase();
      
      // More specific event type detection
      if (lowerMessage.includes('breakfast') || lowerMessage.includes('brunch') || 
          lowerMessage.includes('lunch') || lowerMessage.includes('dinner') || 
          lowerMessage.includes('meal') || lowerMessage.includes('dining')) {
        locationType = 'restaurant';
      } else if (lowerMessage.includes('coffee')) {
        locationType = 'cafe';
      } else if (lowerMessage.includes('gym') || lowerMessage.includes('workout') || 
                 lowerMessage.includes('exercise')) {
        locationType = 'gym';
      } else if (lowerMessage.includes('meeting') || eventType === 'business') {
        locationType = 'meeting';
      } else if (lowerMessage.includes('shopping')) {
        locationType = 'shopping_mall';
      } else if (eventType === 'hobby') {
        locationType = 'amusement_park';
      }
      
      // Get location suggestions
      const locationSuggestions = await locationService.getSuggestedLocations(
        userLocation,
        locationType,
        15000 // 15km radius
      );
      
      // Convert suggestions to EventLocation format
      const locations = await Promise.all(
        locationSuggestions.slice(0, 3).map(async (suggestion) => {
          try {
            const details = await locationService.getPlaceDetails(suggestion.placeId);
            return details.location;
          } catch (error) {
            // Fallback if details fetch fails
            return {
              name: suggestion.mainText,
              address: suggestion.secondaryText,
              placeId: suggestion.placeId,
              type: suggestion.types[0],
              url: `https://www.google.com/maps/place/?q=place_id:${suggestion.placeId}`
            } as EventLocation;
          }
        })
      );
      
      return locations;
    } catch (error) {
      console.error('Error generating location suggestions:', error);
      return [];
    }
  }

  /**
   * Get user's location from browser or return default
   */
  private async getUserLocation(): Promise<{ lat: number; lng: number }> {
    try {
      // Check if we have a cached location
      const cachedLocation = localStorage.getItem('userLocation');
      if (cachedLocation) {
        return JSON.parse(cachedLocation);
      }
      
      // Default to New York if no location is set
      return { lat: 40.7128, lng: -74.0060 };
    } catch (error) {
      console.error('Failed to get user location:', error);
      return { lat: 40.7128, lng: -74.0060 };
    }
  }

  /**
   * Suggest invitees based on keywords and past events
   */
  private suggestInvitees(keywords: string[], existingEvents: Event[]): string[] {
    const invitees: string[] = [];
    
    // Look for names in keywords (simple heuristic)
    const possibleNames = keywords.filter(k => 
      k.length > 2 && /^[A-Z][a-z]+$/.test(k)
    );
    invitees.push(...possibleNames);

    // Add team members if it's a team meeting
    if (keywords.includes('team')) {
      invitees.push('Team Members');
    }

    // Add client if mentioned
    if (keywords.includes('client')) {
      invitees.push('Client');
    }

    return [...new Set(invitees)]; // Remove duplicates
  }

  /**
   * Generate title suggestion
   */
  private suggestTitle(keywords: string[], eventType: 'business' | 'hobby'): string {
    // Meal-related events
    if (keywords.includes('dinner')) {
      const withPerson = keywords.find(k => k.charAt(0).toUpperCase() === k.charAt(0) && k.length > 2);
      return withPerson ? `Dinner with ${withPerson}` : 'Dinner';
    }
    if (keywords.includes('lunch')) {
      const withPerson = keywords.find(k => k.charAt(0).toUpperCase() === k.charAt(0) && k.length > 2);
      return withPerson ? `Lunch with ${withPerson}` : 'Lunch';
    }
    if (keywords.includes('breakfast')) {
      return 'Breakfast';
    }
    if (keywords.includes('brunch')) {
      return 'Brunch';
    }
    if (keywords.includes('coffee')) {
      const withPerson = keywords.find(k => k.charAt(0).toUpperCase() === k.charAt(0) && k.length > 2);
      return withPerson ? `Coffee with ${withPerson}` : 'Coffee Chat';
    }
    if (keywords.includes('drinks')) {
      return 'Drinks';
    }

    // Meeting-related events
    if (keywords.includes('meeting')) {
      if (keywords.includes('team')) return 'Team Meeting';
      if (keywords.includes('client')) return 'Client Meeting';
      if (keywords.includes('project')) return 'Project Meeting';
      return 'Meeting';
    }
    
    // Call-related events
    if (keywords.includes('call')) {
      if (keywords.includes('client')) return 'Client Call';
      if (keywords.includes('team')) return 'Team Call';
      return 'Call';
    }
    
    // Other specific events
    if (keywords.includes('review')) return 'Review Meeting';
    if (keywords.includes('interview')) return 'Interview';
    if (keywords.includes('demo') || keywords.includes('demonstration')) return 'Demo';
    if (keywords.includes('training')) return 'Training';
    if (keywords.includes('workshop')) return 'Workshop';
    if (keywords.includes('presentation')) return 'Presentation';
    
    // Health/personal
    if (keywords.includes('doctor') || keywords.includes('appointment')) return 'Doctor Appointment';
    if (keywords.includes('dentist')) return 'Dentist Appointment';
    if (keywords.includes('workout') || keywords.includes('gym')) return 'Workout';
    
    // Social events
    if (keywords.includes('party')) return 'Party';
    if (keywords.includes('birthday')) return 'Birthday';
    if (keywords.includes('wedding')) return 'Wedding';
    
    // Default based on event type
    return eventType === 'business' ? 'Meeting' : 'Event';
  }

  /**
   * Generate fallback response
   */
  private generateFallbackResponse(suggestion: EventSuggestion): string {
    return `Perfect! I can help you schedule that. I've found some great time slots for your ${suggestion.title.toLowerCase()}.`;
  }

  /**
   * Convert suggestion to form data
   */
  private convertSuggestionToFormData(suggestion: EventSuggestion): Partial<EventFormData> {
    const firstTime = suggestion.suggestedTimes[0];
    
    return {
      title: suggestion.title,
      description: suggestion.description,
      startTime: firstTime?.startTime || new Date(),
      endTime: firstTime?.endTime || new Date(),
      location: suggestion.suggestedLocation || '',
      attendees: suggestion.suggestedInvitees || [],
      isRecurring: false
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(): ChatMessage {
    return {
      id: this.generateId(),
      type: 'assistant',
      content: "I'm sorry, I'm having trouble processing your request right now. Could you please try rephrasing your scheduling request?",
      timestamp: new Date()
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * Update user context
   */
  updateUserContext(context: Partial<UserContext>): void {
    this.userContext = { ...this.userContext, ...context };
  }

  /**
   * Get user context
   */
  getUserContext(): UserContext {
    return { ...this.userContext };
  }
}