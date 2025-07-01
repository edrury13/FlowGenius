import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  IconButton
} from '@mui/material';
import {
  Psychology,
  AccessTime,
  TrendingUp,
  Business,
  SportsEsports,
  Person,
  Close
} from '@mui/icons-material';
import { Event } from '../../services/supabase';
import {
  SmartSchedulingResult,
  TimeSlotSuggestion,
  EventClassification,
  smartSchedulingService
} from '../../services/smartScheduling';
import dayjs from 'dayjs';

interface SmartSchedulingSuggestionsProps {
  title: string;
  description: string;
  preferredDate?: Date;
  existingEvents: Event[];
  onTimeSlotSelect: (startTime: Date, endTime: Date) => void;
  onClose: () => void;
}

const SmartSchedulingSuggestions: React.FC<SmartSchedulingSuggestionsProps> = ({
  title,
  description,
  preferredDate,
  existingEvents,
  onTimeSlotSelect,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<SmartSchedulingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (title.trim()) {
      generateSuggestions();
    }
  }, [title, description, preferredDate]);

  const generateSuggestions = async () => {
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await smartSchedulingService.getSchedulingSuggestions(
        title,
        description,
        preferredDate,
        existingEvents
      );
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      console.error('Smart scheduling error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getClassificationIcon = (type: EventClassification['type']) => {
    switch (type) {
      case 'business':
        return <Business fontSize="small" />;
      case 'hobby':
        return <SportsEsports fontSize="small" />;
      case 'personal':
        return <Person fontSize="small" />;
      default:
        return <Person fontSize="small" />;
    }
  };

  const getClassificationColor = (type: EventClassification['type']) => {
    switch (type) {
      case 'business':
        return '#1976d2'; // Blue
      case 'hobby':
        return '#388e3c'; // Green
      case 'personal':
        return '#7b1fa2'; // Purple
      default:
        return '#757575'; // Gray
    }
  };

  const formatTimeSlot = (suggestion: TimeSlotSuggestion) => {
    const start = dayjs(suggestion.startTime);
    const end = dayjs(suggestion.endTime);
    const duration = end.diff(start, 'minute');
    
    return {
      date: start.format('dddd, MMM D'),
      time: `${start.format('h:mm A')} - ${end.format('h:mm A')}`,
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`
    };
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 80) return { label: 'Optimal', color: 'success' as const };
    if (priority >= 60) return { label: 'Good', color: 'primary' as const };
    if (priority >= 40) return { label: 'Fair', color: 'warning' as const };
    return { label: 'Available', color: 'default' as const };
  };

  if (!title.trim()) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center">
            Enter an event title to get smart scheduling suggestions
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 2, border: '2px solid #e3f2fd' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Psychology color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              Smart Scheduling Suggestions
            </Typography>
            {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>
          <IconButton size="small" onClick={onClose} title="Hide Suggestions">
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button size="small" onClick={generateSuggestions} sx={{ ml: 1 }}>
              Retry
            </Button>
          </Alert>
        )}

        {suggestions && (
          <>
            {/* Event Classification */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Event Classification
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  icon={getClassificationIcon(suggestions.classification.type)}
                  label={suggestions.classification.type.charAt(0).toUpperCase() + suggestions.classification.type.slice(1)}
                  sx={{ 
                    backgroundColor: getClassificationColor(suggestions.classification.type),
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
                <Chip
                  label={`${Math.round(suggestions.classification.confidence * 100)}% confident`}
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {suggestions.classification.reasoning}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Duration Estimate */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Estimated Duration
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="body2">
                  {Math.floor(suggestions.duration / 60)}h {suggestions.duration % 60}m
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Time Slot Suggestions */}
            <Typography variant="subtitle2" gutterBottom>
              Suggested Time Slots
            </Typography>

            {suggestions.suggestedSlots.length === 0 ? (
              <Alert severity="info">
                No available time slots found. Try selecting a different date or adjusting your preferences.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {suggestions.suggestedSlots.map((suggestion, index) => {
                  const timeInfo = formatTimeSlot(suggestion);
                  const priorityInfo = getPriorityLabel(suggestion.priority);

                  return (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateY(-1px)'
                        }
                      }}
                      onClick={() => onTimeSlotSelect(suggestion.startTime, suggestion.endTime)}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="subtitle2" color="primary">
                              {timeInfo.date}
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {timeInfo.time}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {suggestion.reasoning}
                            </Typography>
                          </Box>
                          <Box textAlign="right">
                            <Chip
                              label={priorityInfo.label}
                              color={priorityInfo.color}
                              size="small"
                              sx={{ mb: 0.5 }}
                            />
                            <Typography variant="caption" display="block" color="text.secondary">
                              {timeInfo.duration}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}

            <Box display="flex" justifyContent="flex-start" mt={2}>
              <Button
                size="small"
                startIcon={<TrendingUp />}
                onClick={generateSuggestions}
                disabled={loading}
              >
                Refresh Suggestions
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartSchedulingSuggestions; 