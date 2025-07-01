// Smart Scheduling Type Definitions

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

export interface SmartSchedulingSettings {
  enabled: boolean;
  autoApplySuggestions: boolean;
  showClassificationDetails: boolean;
  preferences: SchedulingPreferences;
  llmProvider: 'openai' | 'local';
} 