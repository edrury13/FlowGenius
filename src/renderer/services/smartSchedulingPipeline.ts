import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Event } from './supabase';
import dayjs from 'dayjs';

// State interface for passing data between nodes
export interface PipelineState {
  // Input data
  title: string;
  description: string;
  preferredDate?: Date;
  existingEvents: Event[];
  preferences: SchedulingPreferences;
  
  // Classification results
  initialClassification?: EventClassification;
  validatedClassification?: EventClassification;
  refinedClassification?: EventClassification;
  
  // Scheduling results
  duration?: number;
  suggestedSlots?: TimeSlotSuggestion[];
  optimizedSlots?: TimeSlotSuggestion[];
  
  // Pipeline metadata
  confidence: number;
  requiresRefinement: boolean;
  validationPassed: boolean;
  pipelineStep: string;
  errors: string[];
  reasoning: string[];
}

// Enhanced types for the pipeline
export interface EventClassification {
  type: 'business' | 'hobby' | 'personal';
  confidence: number;
  reasoning: string;
  keywords: string[];
  context: string;
}

export interface TimeSlotSuggestion {
  startTime: Date;
  endTime: Date;
  reasoning: string;
  priority: number;
  conflictScore: number;
  optimalityScore: number;
}

export interface SchedulingPreferences {
  businessHours: {
    start: string;
    end: string;
  };
  workDays: number[];
  preferredDuration: {
    business: number;
    hobby: number;
  };
  bufferTime: number; // minutes between meetings
  maxSuggestionsPerDay: number;
}

export interface SmartSchedulingPipelineResult {
  classification: EventClassification;
  suggestedSlots: TimeSlotSuggestion[];
  duration: number;
  pipelineMetadata: {
    stepsExecuted: string[];
    totalProcessingTime: number;
    confidenceEvolution: number[];
    refinementApplied: boolean;
  };
}

class SmartSchedulingPipeline {
  private llm: ChatOpenAI;
  private readonly DEFAULT_PREFERENCES: SchedulingPreferences = {
    businessHours: {
      start: '09:00',
      end: '17:00'
    },
    workDays: [1, 2, 3, 4, 5],
    preferredDuration: {
      business: 60,
      hobby: 90
    },
    bufferTime: 15,
    maxSuggestionsPerDay: 3
  };

  constructor() {
    // Initialize LangChain with OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not found. Pipeline will use local processing.');
    }
    
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1,
    });
  }

  /**
   * Execute the full multi-step pipeline
   */
  async executeSchedulingPipeline(
    title: string,
    description: string = '',
    preferredDate?: Date,
    existingEvents: Event[] = [],
    preferences: Partial<SchedulingPreferences> = {}
  ): Promise<SmartSchedulingPipelineResult> {
    const startTime = Date.now();
    const fullPreferences = { ...this.DEFAULT_PREFERENCES, ...preferences };

    // Initialize pipeline state
    let state: PipelineState = {
      title,
      description,
      preferredDate,
      existingEvents,
      preferences: fullPreferences,
      confidence: 0,
      requiresRefinement: false,
      validationPassed: false,
      pipelineStep: 'initialize',
      errors: [],
      reasoning: []
    };

    try {
      // Execute pipeline steps sequentially
      console.log('🚀 Starting Multi-Step AI Pipeline...');
      
      // Step 1: Classification
      state = { ...state, ...(await this.classifyNode(state)) };
      
      // Step 2: Validation
      state = { ...state, ...(await this.validateNode(state)) };
      
      // Step 3: Refinement (conditional)
      if (state.requiresRefinement) {
        state = { ...state, ...(await this.refineNode(state)) };
      }
      
      // Step 4: Schedule Generation
      state = { ...state, ...(await this.scheduleNode(state)) };
      
      // Step 5: Optimization
      state = { ...state, ...(await this.optimizeNode(state)) };

      const processingTime = Date.now() - startTime;
      console.log(`✅ Pipeline completed in ${processingTime}ms`);

      return {
        classification: state.refinedClassification || state.validatedClassification || state.initialClassification!,
        suggestedSlots: state.optimizedSlots || state.suggestedSlots || [],
        duration: state.duration || 60,
        pipelineMetadata: {
          stepsExecuted: this.extractStepsFromReasoning(state.reasoning),
          totalProcessingTime: processingTime,
          confidenceEvolution: this.extractConfidenceEvolution(state),
          refinementApplied: state.requiresRefinement
        }
      };
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      // Fallback to simple classification
      return this.getFallbackResult(title, description, preferredDate, existingEvents, fullPreferences);
    }
  }

  /**
   * Node 1: Initial Classification
   */
  private async classifyNode(state: PipelineState): Promise<Partial<PipelineState>> {
    console.log('📊 Pipeline Step 1: Classification');
    
    try {
      const classification = await this.performAdvancedClassification(state.title, state.description);
      
      return {
        initialClassification: classification,
        confidence: classification.confidence,
        pipelineStep: 'classify',
        reasoning: [...state.reasoning, `Initial classification: ${classification.type} (${Math.round(classification.confidence * 100)}% confidence)`]
      };
    } catch (error) {
      return {
        errors: [...state.errors, `Classification failed: ${error}`],
        pipelineStep: 'classify_error'
      };
    }
  }

  /**
   * Node 2: Validation
   */
  private async validateNode(state: PipelineState): Promise<Partial<PipelineState>> {
    console.log('📋 Pipeline Step 2: Validation');
    
    if (!state.initialClassification) {
      return {
        errors: [...state.errors, 'No initial classification to validate'],
        validationPassed: false
      };
    }

    const classification = state.initialClassification;
    const highConfidenceThreshold = 0.8;
    const lowConfidenceThreshold = 0.4;
    
    let validationPassed = true;
    let requiresRefinement = false;
    
    // Check confidence levels
    if (classification.confidence < lowConfidenceThreshold) {
      validationPassed = false;
      requiresRefinement = true;
    } else if (classification.confidence < highConfidenceThreshold) {
      requiresRefinement = true;
    }
    
    // Additional validation checks
    const contextualValidation = await this.performContextualValidation(classification, state.title, state.description);
    
    return {
      validatedClassification: classification,
      validationPassed,
      requiresRefinement: requiresRefinement || !contextualValidation.isValid,
      pipelineStep: 'validate',
      reasoning: [...state.reasoning, `Validation: ${validationPassed ? 'Passed' : 'Failed'}, Refinement needed: ${requiresRefinement}`]
    };
  }

  /**
   * Node 3: Refinement
   */
  private async refineNode(state: PipelineState): Promise<Partial<PipelineState>> {
    console.log('🔍 Pipeline Step 3: Refinement');
    
    if (!state.validatedClassification) {
      return {
        errors: [...state.errors, 'No validated classification to refine']
      };
    }

    try {
      const refinedClassification = await this.performRefinement(
        state.validatedClassification,
        state.title,
        state.description,
        state.existingEvents
      );
      
      return {
        refinedClassification,
        confidence: refinedClassification.confidence,
        pipelineStep: 'refine',
        reasoning: [...state.reasoning, `Refinement applied: ${refinedClassification.type} (${Math.round(refinedClassification.confidence * 100)}% confidence)`]
      };
    } catch (error) {
      // If refinement fails, use validated classification
      return {
        refinedClassification: state.validatedClassification,
        errors: [...state.errors, `Refinement failed, using validated classification: ${error}`],
        pipelineStep: 'refine_fallback'
      };
    }
  }

  /**
   * Node 4: Schedule Generation
   */
  private async scheduleNode(state: PipelineState): Promise<Partial<PipelineState>> {
    console.log('📅 Pipeline Step 4: Schedule Generation');
    
    const classification = state.refinedClassification || state.validatedClassification || state.initialClassification;
    
    if (!classification) {
      return {
        errors: [...state.errors, 'No classification available for scheduling']
      };
    }

    try {
      const duration = this.estimateEventDuration(state.title, state.description, classification, state.preferences);
      const suggestedSlots = await this.generateAdvancedTimeSlots(
        classification,
        duration,
        state.preferredDate,
        state.existingEvents,
        state.preferences
      );
      
      return {
        duration,
        suggestedSlots,
        pipelineStep: 'schedule',
        reasoning: [...state.reasoning, `Generated ${suggestedSlots.length} time slot suggestions for ${duration}min event`]
      };
    } catch (error) {
      return {
        errors: [...state.errors, `Schedule generation failed: ${error}`],
        pipelineStep: 'schedule_error'
      };
    }
  }

  /**
   * Node 5: Optimization
   */
  private async optimizeNode(state: PipelineState): Promise<Partial<PipelineState>> {
    console.log('⚡ Pipeline Step 5: Optimization');
    
    if (!state.suggestedSlots || state.suggestedSlots.length === 0) {
      return {
        errors: [...state.errors, 'No suggested slots to optimize']
      };
    }

    try {
      const optimizedSlots = await this.optimizeTimeSlots(
        state.suggestedSlots,
        state.existingEvents,
        state.preferences
      );
      
      return {
        optimizedSlots,
        pipelineStep: 'optimize',
        reasoning: [...state.reasoning, `Optimized to ${optimizedSlots.length} highest-priority suggestions`]
      };
    } catch (error) {
      // If optimization fails, return original suggestions
      return {
        optimizedSlots: state.suggestedSlots,
        errors: [...state.errors, `Optimization failed, using original suggestions: ${error}`],
        pipelineStep: 'optimize_fallback'
      };
    }
  }

  /**
   * Advanced classification using LLM with enhanced prompting
   */
  private async performAdvancedClassification(title: string, description: string): Promise<EventClassification> {
    if (!process.env.OPENAI_API_KEY) {
      return this.performLocalClassification(title, description);
    }

    try {
      const systemMessage = new SystemMessage(`
        You are an advanced AI calendar assistant specializing in intelligent event classification.
        Your task is to analyze calendar events and classify them with high accuracy and detailed reasoning.
        
        Classification Categories:
        - BUSINESS: Professional activities, work meetings, client interactions, project work, deadlines
        - HOBBY: Personal interests, recreational activities, sports, creative pursuits, entertainment
        - PERSONAL: Life management, family time, health appointments, errands, social activities
        
        Analysis Framework:
        1. Identify key indicators and context clues
        2. Consider timing implications and typical patterns
        3. Evaluate the formality and professional nature
        4. Assess the personal vs. professional benefit
        
        Respond with JSON in this exact format:
        {
          "type": "business|hobby|personal",
          "confidence": 0.0-1.0,
          "reasoning": "Detailed explanation of classification logic",
          "keywords": ["key", "words", "that", "influenced", "decision"],
          "context": "Additional contextual observations"
        }
      `);

      const humanMessage = new HumanMessage(`
        Event Title: "${title}"
        Event Description: "${description || 'No description provided'}"
        
        Please provide a detailed classification analysis.
      `);

      const response = await this.llm.invoke([systemMessage, humanMessage]);
      const result = JSON.parse(response.content as string);
      
      return {
        type: result.type,
        confidence: result.confidence,
        reasoning: result.reasoning,
        keywords: result.keywords || [],
        context: result.context || ''
      };
    } catch (error) {
      console.error('Advanced LLM classification failed:', error);
      return this.performLocalClassification(title, description);
    }
  }

  /**
   * Local classification with enhanced keyword analysis
   */
  private performLocalClassification(title: string, description: string): EventClassification {
    const text = `${title} ${description}`.toLowerCase();
    
    const businessPatterns = {
      keywords: ['meeting', 'call', 'conference', 'presentation', 'project', 'deadline', 'client', 'team', 'work', 'office', 'professional', 'business', 'interview', 'standup', 'scrum', 'review', 'planning', 'sync', 'demo'],
      weight: 1.0
    };
    
    const hobbyPatterns = {
      keywords: ['gym', 'exercise', 'sport', 'game', 'music', 'practice', 'hobby', 'reading', 'creative', 'art', 'craft', 'entertainment', 'fun', 'play', 'guitar', 'piano', 'painting', 'photography', 'cooking', 'hiking'],
      weight: 1.0
    };
    
    const personalPatterns = {
      keywords: ['doctor', 'appointment', 'family', 'personal', 'grocery', 'shopping', 'dentist', 'home', 'friend', 'social', 'dinner', 'lunch', 'birthday', 'vacation', 'holiday', 'visit', 'errands'],
      weight: 1.0
    };

    const scores = {
      business: this.calculatePatternScore(text, businessPatterns),
      hobby: this.calculatePatternScore(text, hobbyPatterns),
      personal: this.calculatePatternScore(text, personalPatterns)
    };

    const maxScore = Math.max(scores.business, scores.hobby, scores.personal);
    const totalScore = scores.business + scores.hobby + scores.personal;
    
    let type: 'business' | 'hobby' | 'personal' = 'personal';
    let confidence = 0.5;
    let matchedKeywords: string[] = [];

    if (maxScore > 0) {
      if (scores.business === maxScore) {
        type = 'business';
        matchedKeywords = businessPatterns.keywords.filter(kw => text.includes(kw));
      } else if (scores.hobby === maxScore) {
        type = 'hobby';
        matchedKeywords = hobbyPatterns.keywords.filter(kw => text.includes(kw));
      } else {
        type = 'personal';
        matchedKeywords = personalPatterns.keywords.filter(kw => text.includes(kw));
      }
      
      confidence = Math.min(0.95, 0.6 + (maxScore / Math.max(totalScore, 1)) * 0.35);
    }

    return {
      type,
      confidence,
      reasoning: `Local pattern analysis identified ${matchedKeywords.length} ${type} indicators`,
      keywords: matchedKeywords,
      context: `Scores: Business(${scores.business}), Hobby(${scores.hobby}), Personal(${scores.personal})`
    };
  }

  /**
   * Calculate pattern matching score
   */
  private calculatePatternScore(text: string, pattern: { keywords: string[]; weight: number }): number {
    return pattern.keywords.reduce((score, keyword) => {
      return text.includes(keyword) ? score + pattern.weight : score;
    }, 0);
  }

  /**
   * Perform contextual validation of classification
   */
  private async performContextualValidation(
    classification: EventClassification,
    title: string,
    description: string
  ): Promise<{ isValid: boolean; reasoning: string }> {
    // Simple contextual checks
    const text = `${title} ${description}`.toLowerCase();
    
    // Check for conflicting signals
    const businessIndicators = ['meeting', 'work', 'office', 'client', 'project'];
    const personalIndicators = ['family', 'friend', 'personal', 'home'];
    const hobbyIndicators = ['fun', 'game', 'sport', 'music', 'art'];
    
    const hasBusinessSignals = businessIndicators.some(indicator => text.includes(indicator));
    const hasPersonalSignals = personalIndicators.some(indicator => text.includes(indicator));
    const hasHobbySignals = hobbyIndicators.some(indicator => text.includes(indicator));
    
    // Flag potential misclassifications
    if (classification.type === 'business' && hasPersonalSignals && !hasBusinessSignals) {
      return { isValid: false, reasoning: 'Personal signals detected in business classification' };
    }
    
    if (classification.type === 'personal' && hasBusinessSignals && !hasPersonalSignals) {
      return { isValid: false, reasoning: 'Business signals detected in personal classification' };
    }
    
    return { isValid: true, reasoning: 'Classification validated' };
  }

  /**
   * Refine classification based on additional context
   */
  private async performRefinement(
    classification: EventClassification,
    title: string,
    description: string,
    existingEvents: Event[]
  ): Promise<EventClassification> {
    // Enhanced refinement logic
    const text = `${title} ${description}`.toLowerCase();
    
    // Analyze similar events from history
    const similarEvents = existingEvents.filter(event => 
      event.title.toLowerCase().includes(title.toLowerCase().split(' ')[0]) ||
      title.toLowerCase().includes(event.title.toLowerCase().split(' ')[0])
    );
    
    if (similarEvents.length > 0) {
      // TODO: Could use historical patterns to improve classification
      // For now, increase confidence if we find similar patterns
      const refinedConfidence = Math.min(0.95, classification.confidence + 0.1);
      
      return {
        ...classification,
        confidence: refinedConfidence,
        reasoning: `${classification.reasoning} | Refined based on ${similarEvents.length} similar events`,
        context: `${classification.context} | Historical pattern analysis applied`
      };
    }
    
    return classification;
  }

  /**
   * Enhanced duration estimation
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
      { pattern: /(\d+)h(\d+)m/i, converter: (h: string, m: string) => parseInt(h) * 60 + parseInt(m) }
    ];

    for (const { pattern, multiplier, converter } of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (converter) {
          return converter(match[1], match[2] || '0');
        } else {
          return parseInt(match[1]) * (multiplier || 1);
        }
      }
    }

    // Context-based duration estimation
    if (text.includes('quick') || text.includes('brief') || text.includes('standup')) {
      return 15;
    } else if (text.includes('workshop') || text.includes('training') || text.includes('session')) {
      return 120;
    } else if (text.includes('all day') || text.includes('conference')) {
      return 480;
    }

    // Default durations based on classification
    switch (classification.type) {
      case 'business':
        return preferences.preferredDuration.business;
      case 'hobby':
        return preferences.preferredDuration.hobby;
      default:
        return 60;
    }
  }

  /**
   * Generate advanced time slots with better logic
   */
  private async generateAdvancedTimeSlots(
    classification: EventClassification,
    duration: number,
    preferredDate: Date | undefined,
    existingEvents: Event[],
    preferences: SchedulingPreferences
  ): Promise<TimeSlotSuggestion[]> {
    const suggestions: TimeSlotSuggestion[] = [];
    const today = dayjs();
    const startDate = preferredDate ? dayjs(preferredDate) : today;
    
    // Generate suggestions for next 10 days (expanded from 7)
    for (let i = 0; i < 10; i++) {
      const currentDate = startDate.add(i, 'day');
      const dayOfWeek = currentDate.day();
      
      let daySlots: TimeSlotSuggestion[] = [];
      
      if (classification.type === 'business') {
        if (preferences.workDays.includes(dayOfWeek)) {
          daySlots = this.generateBusinessHourSlots(currentDate, duration, existingEvents, preferences);
        }
      } else {
        daySlots = this.generatePersonalTimeSlots(currentDate, duration, existingEvents, preferences);
      }
      
      // Limit suggestions per day
      const topDaySlots = daySlots
        .slice(0, preferences.maxSuggestionsPerDay)
        .map(slot => ({
          ...slot,
          conflictScore: this.calculateConflictScore(slot.startTime, slot.endTime, existingEvents),
          optimalityScore: this.calculateOptimalityScore(slot.startTime, classification.type)
        }));
      
      suggestions.push(...topDaySlots);
    }

    // Return top 8 suggestions (increased from 5)
    return suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);
  }

  /**
   * Generate business hour slots with buffer time
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
    
    // Generate slots every 30 minutes (more granular)
    let current = dayStart;
    while (current.add(duration, 'minute').isBefore(dayEnd)) {
      const slotEnd = current.add(duration, 'minute');
      
      if (!this.hasConflict(current.toDate(), slotEnd.toDate(), existingEvents)) {
        // Check buffer time
        const hasBufferConflict = this.hasBufferConflict(
          current.toDate(),
          slotEnd.toDate(),
          existingEvents,
          preferences.bufferTime
        );
        
        if (!hasBufferConflict) {
          slots.push({
            startTime: current.toDate(),
            endTime: slotEnd.toDate(),
            reasoning: `Business hours slot on ${current.format('dddd, MMMM D')} at ${current.format('h:mm A')}`,
            priority: this.calculatePriority(current, 'business'),
            conflictScore: 0,
            optimalityScore: 0
          });
        }
      }
      
      current = current.add(30, 'minute'); // 30-minute intervals
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
    
    let timeSlots: { start: number; end: number; label: string }[] = [];
    
    if (isWeekend) {
      // Weekend: more flexible hours
      timeSlots = [
        { start: 9, end: 12, label: 'Weekend morning' },
        { start: 14, end: 17, label: 'Weekend afternoon' },
        { start: 19, end: 22, label: 'Weekend evening' }
      ];
    } else {
      // Weekday: after work hours
      timeSlots = [
        { start: 18, end: 20, label: 'Evening' },
        { start: 20, end: 22, label: 'Late evening' }
      ];
    }
    
    for (const timeSlot of timeSlots) {
      let current = date.hour(timeSlot.start).minute(0).second(0);
      const slotEnd = date.hour(timeSlot.end).minute(0).second(0);
      
      while (current.add(duration, 'minute').isBefore(slotEnd)) {
        const eventEnd = current.add(duration, 'minute');
        
        if (!this.hasConflict(current.toDate(), eventEnd.toDate(), existingEvents)) {
          const hasBufferConflict = this.hasBufferConflict(
            current.toDate(),
            eventEnd.toDate(),
            existingEvents,
            preferences.bufferTime
          );
          
          if (!hasBufferConflict) {
            slots.push({
              startTime: current.toDate(),
              endTime: eventEnd.toDate(),
              reasoning: `${timeSlot.label} slot on ${current.format('dddd, MMMM D')} at ${current.format('h:mm A')}`,
              priority: this.calculatePriority(current, 'personal'),
              conflictScore: 0,
              optimalityScore: 0
            });
          }
        }
        
        current = current.add(60, 'minute'); // 1-hour intervals for personal events
      }
    }
    
    return slots;
  }

  /**
   * Check for conflicts with existing events
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
   * Check for buffer time conflicts
   */
  private hasBufferConflict(
    startTime: Date,
    endTime: Date,
    existingEvents: Event[],
    bufferMinutes: number
  ): boolean {
    const bufferStart = dayjs(startTime).subtract(bufferMinutes, 'minute').toDate();
    const bufferEnd = dayjs(endTime).add(bufferMinutes, 'minute').toDate();
    
    return this.hasConflict(bufferStart, bufferEnd, existingEvents);
  }

  /**
   * Calculate priority score for time slots
   */
  private calculatePriority(time: dayjs.Dayjs, eventType: string): number {
    let priority = 50; // Base priority
    
    const hour = time.hour();
    const dayOfWeek = time.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (eventType === 'business') {
      // Business events prefer mid-morning and early afternoon
      if (hour >= 9 && hour <= 11) priority += 30; // Morning boost
      else if (hour >= 14 && hour <= 16) priority += 20; // Afternoon boost
      else if (hour >= 12 && hour <= 13) priority -= 10; // Lunch penalty
      
      if (isWeekend) priority -= 40; // Weekend penalty for business
    } else {
      // Personal/hobby events prefer evenings and weekends
      if (isWeekend) priority += 30;
      if (hour >= 18 && hour <= 20) priority += 25; // Evening boost
      if (hour >= 9 && hour <= 17 && !isWeekend) priority -= 20; // Work hours penalty
    }
    
    return Math.max(0, Math.min(100, priority));
  }

  /**
   * Calculate conflict score (0 = no conflicts, higher = more conflicts)
   */
  private calculateConflictScore(startTime: Date, endTime: Date, existingEvents: Event[]): number {
    let score = 0;
    const slotStart = dayjs(startTime);
    const slotEnd = dayjs(endTime);
    
    existingEvents.forEach(event => {
      const eventStart = dayjs(event.start_time);
      const eventEnd = dayjs(event.end_time);
      
      // Check proximity to existing events
      const minutesBeforeEvent = eventStart.diff(slotEnd, 'minute');
      const minutesAfterEvent = slotStart.diff(eventEnd, 'minute');
      
      if (minutesBeforeEvent >= 0 && minutesBeforeEvent < 30) {
        score += (30 - minutesBeforeEvent) / 30 * 10; // Proximity penalty
      }
      
      if (minutesAfterEvent >= 0 && minutesAfterEvent < 30) {
        score += (30 - minutesAfterEvent) / 30 * 10; // Proximity penalty
      }
    });
    
    return score;
  }

  /**
   * Calculate optimality score based on event type and timing
   */
  private calculateOptimalityScore(startTime: Date, eventType: string): number {
    const time = dayjs(startTime);
    const hour = time.hour();
    const dayOfWeek = time.day();
    
    // Optimal times for different event types
    if (eventType === 'business') {
      if (hour >= 9 && hour <= 11) return 100; // Peak productivity hours
      if (hour >= 14 && hour <= 16) return 90;  // Good afternoon hours
      if (hour >= 8 && hour <= 9) return 80;    // Early morning
      return 60; // Other business hours
    } else if (eventType === 'hobby') {
      if (dayOfWeek === 0 || dayOfWeek === 6) return 100; // Weekends
      if (hour >= 18 && hour <= 20) return 90; // Evening
      if (hour >= 20 && hour <= 22) return 85; // Late evening
      return 70; // Other times
    } else { // personal
      if (hour >= 17 && hour <= 19) return 95; // After work
      if (dayOfWeek === 0 || dayOfWeek === 6) return 90; // Weekends
      return 75; // Other times
    }
  }

  /**
   * Optimize time slots based on various factors
   */
  private async optimizeTimeSlots(
    slots: TimeSlotSuggestion[],
    existingEvents: Event[],
    preferences: SchedulingPreferences
  ): Promise<TimeSlotSuggestion[]> {
    // Calculate comprehensive scores for each slot
    const scoredSlots = slots.map(slot => {
      const conflictScore = this.calculateConflictScore(slot.startTime, slot.endTime, existingEvents);
      const optimalityScore = this.calculateOptimalityScore(slot.startTime, 'business'); // Default to business for now
      
      // Combined optimization score
      const optimizationScore = (
        slot.priority * 0.4 +
        (100 - conflictScore) * 0.3 +
        optimalityScore * 0.3
      );
      
      return {
        ...slot,
        conflictScore,
        optimalityScore,
        priority: optimizationScore,
        reasoning: `${slot.reasoning} | Optimization score: ${Math.round(optimizationScore)}`
      };
    });
    
    // Return top 5 optimized slots
    return scoredSlots
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }

  /**
   * Helper methods for pipeline metadata
   */
  private extractStepsFromReasoning(reasoning: string[]): string[] {
    return reasoning.map(r => r.split(':')[0]).filter(Boolean);
  }

  private extractConfidenceEvolution(state: PipelineState): number[] {
    const evolution = [0]; // Starting confidence
    
    if (state.initialClassification) {
      evolution.push(state.initialClassification.confidence);
    }
    
    if (state.refinedClassification) {
      evolution.push(state.refinedClassification.confidence);
    }
    
    return evolution;
  }

  /**
   * Fallback result for pipeline failures
   */
  private async getFallbackResult(
    title: string,
    description: string,
    preferredDate: Date | undefined,
    existingEvents: Event[],
    preferences: SchedulingPreferences
  ): Promise<SmartSchedulingPipelineResult> {
    const classification = this.performLocalClassification(title, description);
    const duration = this.estimateEventDuration(title, description, classification, preferences);
    
    // Simple time slot generation for fallback
    const suggestedSlots: TimeSlotSuggestion[] = [{
      startTime: preferredDate || dayjs().add(1, 'day').hour(10).minute(0).toDate(),
      endTime: preferredDate ? dayjs(preferredDate).add(duration, 'minute').toDate() : dayjs().add(1, 'day').hour(10).minute(duration).toDate(),
      reasoning: 'Fallback suggestion due to pipeline failure',
      priority: 50,
      conflictScore: 0,
      optimalityScore: 50
    }];
    
    return {
      classification,
      suggestedSlots,
      duration,
      pipelineMetadata: {
        stepsExecuted: ['fallback'],
        totalProcessingTime: 0,
        confidenceEvolution: [classification.confidence],
        refinementApplied: false
      }
    };
  }
}

// Singleton instance
const smartSchedulingPipeline = new SmartSchedulingPipeline();

export default smartSchedulingPipeline; 