// Types for the smart scheduling feature

export type EventType = 'meeting' | 'meal' | 'exercise' | 'work' | 'personal' | 'break' | 'other';

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
  locationSuggestion?: string;
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

export interface SchedulingSuggestion extends TimeSlotSuggestion {
  conflicts: string[];
  locationSuggestion?: string;
}

// Smart Scheduling Type Definitions

export interface EventClassification {
  type: 'business' | 'hobby' | 'personal';
  confidence: number;
  reasoning: string;
  keywords?: string[];
  context?: string;
}

export interface TimeSlotSuggestion {
  startTime: Date;
  endTime: Date;
  reasoning: string;
  priority: number;
  conflictScore?: number;
  optimalityScore?: number;
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
  bufferTime?: number; // minutes between meetings
  maxSuggestionsPerDay?: number;
}

// Legacy interface for backward compatibility
export interface SmartSchedulingResult {
  classification: EventClassification;
  suggestedSlots: TimeSlotSuggestion[];
  duration: number;
}

// Enhanced pipeline result interface
export interface SmartSchedulingPipelineResult extends SmartSchedulingResult {
  pipelineMetadata: {
    stepsExecuted: string[];
    totalProcessingTime: number;
    confidenceEvolution: number[];
    refinementApplied: boolean;
  };
}

// Pipeline state for advanced workflows
export interface PipelineState {
  // Input data
  title: string;
  description: string;
  preferredDate?: Date;
  existingEvents: any[]; // Event type from supabase
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

// Node function signatures for LangGraph
export type PipelineNodeFunction = (state: PipelineState) => Promise<Partial<PipelineState>>;

// Configuration for different event types
export interface EventTypeConfig {
  preferredHours: { start: number; end: number };
  allowedDays: number[];
  defaultDuration: number;
  bufferTime: number;
  priorityWeight: number;
}

// Advanced scheduling options
export interface AdvancedSchedulingOptions extends SchedulingPreferences {
  enableRefinement?: boolean;
  confidenceThreshold?: number;
  maxOptimizationIterations?: number;
  contextualAnalysis?: boolean;
  historicalPatterns?: boolean;
}

// Analytics and insights
export interface SchedulingAnalytics {
  classificationAccuracy: number;
  averageProcessingTime: number;
  mostCommonEventTypes: { type: string; count: number }[];
  timeSlotUtilization: { hour: number; usage: number }[];
  conflictRate: number;
  userSatisfactionScore?: number;
}

// Export utility types
export type PipelineStep = 'classify' | 'validate' | 'refine' | 'schedule' | 'optimize';
export type ConditionalEdgeResult = string;

// Migration helpers for legacy code
export interface LegacySmartSchedulingService {
  getSchedulingSuggestions(
    title: string,
    description?: string,
    preferredDate?: Date,
    existingEvents?: any[],
    preferences?: Partial<SchedulingPreferences>
  ): Promise<SmartSchedulingResult>;
}

export interface EnhancedSmartSchedulingPipeline {
  executeSchedulingPipeline(
    title: string,
    description?: string,
    preferredDate?: Date,
    existingEvents?: any[],
    preferences?: Partial<SchedulingPreferences>
  ): Promise<SmartSchedulingPipelineResult>;
}

export interface SmartSchedulingSettings {
  enabled: boolean;
  autoApplySuggestions: boolean;
  showClassificationDetails: boolean;
  preferences: SchedulingPreferences;
  llmProvider: 'openai' | 'local';
} 