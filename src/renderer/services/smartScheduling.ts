import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Event } from './supabase';
import dayjs from 'dayjs';

// Types for the smart scheduling feature
export interface EventClassification {
  type: 'business' | 'hobby' | 'personal';
  confidence: number;
  reasoning: string;
}

export interface TimeSlotSuggestion {
  startTime: Date;
  endTime: Date;
  reasoning: string;
  priority: number;
}

export interface SmartSchedulingResult {
  classification: EventClassification;
  suggestedSlots: TimeSlotSuggestion[];
  duration: number; // in minutes
}

export interface SchedulingPreferences {
  businessHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  workDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  preferredDuration: {
    business: number; // minutes
    hobby: number;    // minutes
  };
}

class SmartSchedulingService {
  private llm: ChatOpenAI;
  private readonly DEFAULT_PREFERENCES: SchedulingPreferences = {
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

  constructor() {
    // Initialize LangChain with OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not found. Smart scheduling will use local classification.');
    }
    
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1, // Low temperature for consistent classification
    });
  }

  /**
   * Main method to get smart scheduling suggestions
   */
  async getSchedulingSuggestions(
    title: string,
    description: string = '',
    preferredDate?: Date,
    existingEvents: Event[] = [],
    preferences: Partial<SchedulingPreferences> = {}
  ): Promise<SmartSchedulingResult> {
    const fullPreferences = { ...this.DEFAULT_PREFERENCES, ...preferences };
    
    try {
      // Step 1: Classify the event
      const classification = await this.classifyEvent(title, description);
      
      // Step 2: Determine event duration
      const duration = this.estimateEventDuration(title, description, classification, fullPreferences);
      
      // Step 3: Generate time slot suggestions
      const suggestedSlots = await this.generateTimeSlots(
        classification,
        duration,
        preferredDate,
        existingEvents,
        fullPreferences
      );

      return {
        classification,
        suggestedSlots,
        duration
      };
    } catch (error) {
      console.error('Smart scheduling failed:', error);
      // Fallback to basic classification and scheduling
      return this.getFallbackSuggestions(title, description, preferredDate, existingEvents, fullPreferences);
    }
  }

  /**
   * Classify event using LangChain and OpenAI
   */
  private async classifyEvent(title: string, description: string): Promise<EventClassification> {
    if (!process.env.OPENAI_API_KEY) {
      return this.classifyEventLocally(title, description);
    }

    try {
      const systemMessage = new SystemMessage(`
        You are an expert at classifying calendar events. Based on the event title and description, 
        classify the event as either "business", "hobby", or "personal".
        
        Classification Guidelines:
        - BUSINESS: Work meetings, client calls, presentations, deadlines, professional development, 
          team meetings, project work, interviews, conferences, business travel
        - HOBBY: Sports, gaming, reading, crafts, music practice, creative projects, exercise, 
          entertainment, hobbies, recreational activities
        - PERSONAL: Family time, medical appointments, personal errands, social gatherings, 
          personal care, household tasks, personal calls
        
        Respond in the following JSON format:
        {
          "type": "business|hobby|personal",
          "confidence": 0.0-1.0,
          "reasoning": "Brief explanation of classification"
        }
      `);

      const humanMessage = new HumanMessage(`
        Event Title: "${title}"
        Event Description: "${description || 'No description provided'}"
        
        Please classify this event.
      `);

      const response = await this.llm.invoke([systemMessage, humanMessage]);
      const result = JSON.parse(response.content as string);
      
      return {
        type: result.type,
        confidence: result.confidence,
        reasoning: result.reasoning
      };
    } catch (error) {
      console.error('LLM classification failed, using local fallback:', error);
      return this.classifyEventLocally(title, description);
    }
  }

  /**
   * Local classification fallback using keyword matching
   */
  private classifyEventLocally(title: string, description: string): EventClassification {
    const text = `${title} ${description}`.toLowerCase();
    
    const businessKeywords = [
      'meeting', 'call', 'conference', 'presentation', 'project', 'deadline', 
      'client', 'team', 'work', 'office', 'professional', 'business', 'interview',
      'standup', 'scrum', 'review', 'planning', 'sync', 'demo'
    ];
    
    const hobbyKeywords = [
      'gym', 'exercise', 'sport', 'game', 'music', 'practice', 'hobby', 
      'reading', 'creative', 'art', 'craft', 'entertainment', 'fun', 'play',
      'guitar', 'piano', 'painting', 'photography', 'cooking', 'hiking'
    ];
    
    const personalKeywords = [
      'doctor', 'appointment', 'family', 'personal', 'grocery', 'shopping',
      'dentist', 'home', 'friend', 'social', 'dinner', 'lunch', 'birthday',
      'vacation', 'holiday', 'visit', 'errands'
    ];

    let businessScore = 0;
    let hobbyScore = 0;
    let personalScore = 0;

    businessKeywords.forEach(keyword => {
      if (text.includes(keyword)) businessScore++;
    });
    
    hobbyKeywords.forEach(keyword => {
      if (text.includes(keyword)) hobbyScore++;
    });
    
    personalKeywords.forEach(keyword => {
      if (text.includes(keyword)) personalScore++;
    });

    let type: 'business' | 'hobby' | 'personal' = 'personal';
    let confidence = 0.5;

    if (businessScore >= hobbyScore && businessScore >= personalScore && businessScore > 0) {
      type = 'business';
      confidence = Math.min(0.9, 0.6 + businessScore * 0.1);
    } else if (hobbyScore >= personalScore && hobbyScore > 0) {
      type = 'hobby';
      confidence = Math.min(0.9, 0.6 + hobbyScore * 0.1);
    } else if (personalScore > 0) {
      type = 'personal';
      confidence = Math.min(0.9, 0.6 + personalScore * 0.1);
    }

    return {
      type,
      confidence,
      reasoning: `Local classification based on keyword analysis. Detected ${businessScore} business, ${hobbyScore} hobby, and ${personalScore} personal keywords.`
    };
  }

  /**
   * Estimate event duration based on type and content
   */
  private estimateEventDuration(
    title: string, 
    description: string, 
    classification: EventClassification,
    preferences: SchedulingPreferences
  ): number {
    const text = `${title} ${description}`.toLowerCase();
    
    // Check for explicit duration mentions
    const durationPatterns = [
      { pattern: /(\d+)\s*hours?/i, multiplier: 60 },
      { pattern: /(\d+)\s*hrs?/i, multiplier: 60 },
      { pattern: /(\d+)\s*minutes?/i, multiplier: 1 },
      { pattern: /(\d+)\s*mins?/i, multiplier: 1 },
      { pattern: /(\d+)\s*h/i, multiplier: 60 },
      { pattern: /(\d+)\s*m/i, multiplier: 1 }
    ];

    for (const { pattern, multiplier } of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]) * multiplier;
      }
    }

    // Default durations based on classification
    switch (classification.type) {
      case 'business':
        return preferences.preferredDuration.business;
      case 'hobby':
        return preferences.preferredDuration.hobby;
      default:
        return 60; // 1 hour default
    }
  }

  /**
   * Generate time slot suggestions based on classification and preferences
   */
  private async generateTimeSlots(
    classification: EventClassification,
    duration: number,
    preferredDate: Date | undefined,
    existingEvents: Event[],
    preferences: SchedulingPreferences
  ): Promise<TimeSlotSuggestion[]> {
    const suggestions: TimeSlotSuggestion[] = [];
    const today = dayjs();
    const startDate = preferredDate ? dayjs(preferredDate) : today;
    
    // Generate suggestions for the next 7 days
    for (let i = 0; i < 7; i++) {
      const currentDate = startDate.add(i, 'day');
      const dayOfWeek = currentDate.day();
      
      if (classification.type === 'business') {
        // Business events: weekdays during business hours
        if (preferences.workDays.includes(dayOfWeek)) {
          const slots = this.generateBusinessHourSlots(currentDate, duration, existingEvents, preferences);
          suggestions.push(...slots);
        }
      } else {
        // Hobby/Personal events: after hours and weekends
        const slots = this.generatePersonalTimeSlots(currentDate, duration, existingEvents, preferences);
        suggestions.push(...slots);
      }
    }

    // Sort by priority and return top 5 suggestions
    return suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }

  /**
   * Generate business hour time slots
   */
  private generateBusinessHourSlots(
    date: dayjs.Dayjs,
    duration: number,
    existingEvents: Event[],
    preferences: SchedulingPreferences
  ): TimeSlotSuggestion[] {
    const slots: TimeSlotSuggestion[] = [];
    const [startHour, startMinute] = preferences.businessHours.start.split(':').map(Number);
    const [endHour, endMinute] = preferences.businessHours.end.split(':').map(Number);
    
    const dayStart = date.hour(startHour).minute(startMinute).second(0);
    const dayEnd = date.hour(endHour).minute(endMinute).second(0);
    
    // Generate 30-minute intervals
    let currentTime = dayStart;
    while (currentTime.add(duration, 'minute').isBefore(dayEnd) || currentTime.add(duration, 'minute').isSame(dayEnd)) {
      const slotEnd = currentTime.add(duration, 'minute');
      
      if (!this.hasConflict(currentTime.toDate(), slotEnd.toDate(), existingEvents)) {
        const priority = this.calculatePriority(currentTime, 'business');
        slots.push({
          startTime: currentTime.toDate(),
          endTime: slotEnd.toDate(),
          reasoning: `Business hours slot on ${currentTime.format('dddd, MMMM D')} at ${currentTime.format('h:mm A')}`,
          priority
        });
      }
      
      currentTime = currentTime.add(30, 'minute');
    }
    
    return slots;
  }

  /**
   * Generate personal/hobby time slots
   */
  private generatePersonalTimeSlots(
    date: dayjs.Dayjs,
    duration: number,
    existingEvents: Event[],
    preferences: SchedulingPreferences
  ): TimeSlotSuggestion[] {
    const slots: TimeSlotSuggestion[] = [];
    const dayOfWeek = date.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend) {
      // Weekend: flexible hours (8 AM to 10 PM)
      const dayStart = date.hour(8).minute(0).second(0);
      const dayEnd = date.hour(22).minute(0).second(0);
      
      let currentTime = dayStart;
      while (currentTime.add(duration, 'minute').isBefore(dayEnd) || currentTime.add(duration, 'minute').isSame(dayEnd)) {
        const slotEnd = currentTime.add(duration, 'minute');
        
        if (!this.hasConflict(currentTime.toDate(), slotEnd.toDate(), existingEvents)) {
          const priority = this.calculatePriority(currentTime, 'hobby');
          slots.push({
            startTime: currentTime.toDate(),
            endTime: slotEnd.toDate(),
            reasoning: `Weekend leisure time on ${currentTime.format('dddd')} at ${currentTime.format('h:mm A')}`,
            priority
          });
        }
        
        currentTime = currentTime.add(60, 'minute'); // 1-hour intervals for weekends
      }
    } else {
      // Weekday: after business hours (6 PM to 10 PM)
      const eveningStart = date.hour(18).minute(0).second(0);
      const eveningEnd = date.hour(22).minute(0).second(0);
      
      let currentTime = eveningStart;
      while (currentTime.add(duration, 'minute').isBefore(eveningEnd) || currentTime.add(duration, 'minute').isSame(eveningEnd)) {
        const slotEnd = currentTime.add(duration, 'minute');
        
        if (!this.hasConflict(currentTime.toDate(), slotEnd.toDate(), existingEvents)) {
          const priority = this.calculatePriority(currentTime, 'hobby');
          slots.push({
            startTime: currentTime.toDate(),
            endTime: slotEnd.toDate(),
            reasoning: `Evening time on ${currentTime.format('dddd')} at ${currentTime.format('h:mm A')}`,
            priority
          });
        }
        
        currentTime = currentTime.add(30, 'minute');
      }
    }
    
    return slots;
  }

  /**
   * Check if a time slot conflicts with existing events
   */
  private hasConflict(startTime: Date, endTime: Date, existingEvents: Event[]): boolean {
    return existingEvents.some(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      return (
        (startTime >= eventStart && startTime < eventEnd) ||
        (endTime > eventStart && endTime <= eventEnd) ||
        (startTime <= eventStart && endTime >= eventEnd)
      );
    });
  }

  /**
   * Calculate priority score for time slots
   */
  private calculatePriority(time: dayjs.Dayjs, eventType: string): number {
    let priority = 50; // Base priority
    
    if (eventType === 'business') {
      // Prefer morning hours for business
      const hour = time.hour();
      if (hour >= 9 && hour <= 11) priority += 30;
      else if (hour >= 14 && hour <= 16) priority += 20;
      else priority += 10;
    } else {
      // Prefer evening/weekend hours for personal
      const hour = time.hour();
      const dayOfWeek = time.day();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        priority += 25; // Weekend bonus
        if (hour >= 10 && hour <= 16) priority += 15; // Good weekend hours
      } else {
        if (hour >= 18 && hour <= 20) priority += 20; // Prime evening hours
        else if (hour >= 17 && hour <= 21) priority += 10;
      }
    }
    
    return priority;
  }

  /**
   * Fallback suggestions when LLM is unavailable
   */
  private async getFallbackSuggestions(
    title: string,
    description: string,
    preferredDate: Date | undefined,
    existingEvents: Event[],
    preferences: SchedulingPreferences
  ): Promise<SmartSchedulingResult> {
    const classification = this.classifyEventLocally(title, description);
    const duration = this.estimateEventDuration(title, description, classification, preferences);
    const suggestedSlots = await this.generateTimeSlots(
      classification,
      duration,
      preferredDate,
      existingEvents,
      preferences
    );

    return {
      classification,
      suggestedSlots,
      duration
    };
  }
}

export const smartSchedulingService = new SmartSchedulingService(); 