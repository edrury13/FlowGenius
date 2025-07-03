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
  IconButton,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Psychology,
  AccessTime,
  TrendingUp,
  Business,
  SportsEsports,
  Person,
  Close,
  Speed,
  Timeline,
  AutoFixHigh,
  ExpandMore,
  LocationOn,
  Check
} from '@mui/icons-material';
import { Event } from '../../services/supabase';
import smartSchedulingPipeline, {
  SmartSchedulingPipelineResult,
  EventClassification,
  TimeSlotSuggestion
} from '../../services/smartSchedulingPipeline';
import dayjs from 'dayjs';

interface SmartSchedulingSuggestionsProps {
  title: string;
  description: string;
  preferredDate?: Date;
  existingEvents: Event[];
  onTimeSlotSelect: (startTime: Date, endTime: Date) => void;
  onLocationSelect?: (location: any) => void; // EventLocation type
  onClose: () => void;
}

const SmartSchedulingSuggestions: React.FC<SmartSchedulingSuggestionsProps> = ({
  title,
  description,
  preferredDate,
  existingEvents,
  onTimeSlotSelect,
  onLocationSelect,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<SmartSchedulingPipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);

  useEffect(() => {
    if (title.trim()) {
      generateSuggestions();
    }
  }, [title, description, preferredDate]);

  const generateSuggestions = async () => {
    if (!title.trim()) return;

    setLoading(true);
    setError(null);
    setPipelineProgress(0);

    try {
      // Simulate pipeline progress for better UX
      const progressInterval = setInterval(() => {
        setPipelineProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      const result = await smartSchedulingPipeline.executeSchedulingPipeline(
        title,
        description,
        preferredDate,
        existingEvents
      );

      clearInterval(progressInterval);
      setPipelineProgress(100);
      
      // Debug: Log the result to check if location suggestions are present
      console.log('Smart scheduling result:', result);
      console.log('Time slots with locations:', result.suggestedSlots);
      
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      console.error('Smart scheduling pipeline error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setPipelineProgress(0), 1000);
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

  const getOptimalityScore = (suggestion: TimeSlotSuggestion) => {
    const score = suggestion.optimalityScore || 0;
    if (score >= 90) return { label: 'Perfect', color: '#4caf50' };
    if (score >= 70) return { label: 'Great', color: '#2196f3' };
    if (score >= 50) return { label: 'Good', color: '#ff9800' };
    return { label: 'OK', color: '#757575' };
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
              AI-Powered Smart Scheduling
            </Typography>
            {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
            {suggestions?.pipelineMetadata.refinementApplied && (
              <Tooltip title="Advanced AI refinement applied">
                <AutoFixHigh color="secondary" sx={{ ml: 1 }} fontSize="small" />
              </Tooltip>
            )}
          </Box>
          <IconButton size="small" onClick={onClose} title="Hide Suggestions">
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Pipeline Progress */}
        {loading && pipelineProgress > 0 && (
          <Box mb={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                AI Pipeline Processing...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pipelineProgress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={pipelineProgress}
              sx={{ mt: 0.5, borderRadius: 1 }}
            />
          </Box>
        )}

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
            {/* Enhanced Event Classification */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                AI Event Classification
              </Typography>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
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
                {suggestions.classification.keywords && suggestions.classification.keywords.length > 0 && (
                  <Chip
                    label={`${suggestions.classification.keywords.length} keywords`}
                    variant="outlined"
                    size="small"
                    color="secondary"
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {suggestions.classification.reasoning}
              </Typography>
              {suggestions.classification.context && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                  Context: {suggestions.classification.context}
                </Typography>
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Enhanced Duration Estimate */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Estimated Duration
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="body2">
                  {Math.floor(suggestions.duration / 60)}h {suggestions.duration % 60}m
                </Typography>
                <Chip
                  label="AI Optimized"
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Enhanced Time Slot Suggestions */}
            <Typography variant="subtitle2" gutterBottom>
              Optimized Time Slots
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
                  const optimalityInfo = getOptimalityScore(suggestion);
                  
                  // Debug location suggestions
                  console.log('[UI] Rendering slot', index, 'with locations:', { 
                    hasLocations: !!suggestion.locationSuggestions,
                    locationCount: suggestion.locationSuggestions?.length || 0,
                    locations: suggestion.locationSuggestions
                  });

                  return (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateY(-1px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => onTimeSlotSelect(suggestion.startTime, suggestion.endTime)}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box flex={1}>
                            <Typography variant="subtitle2" color="primary">
                              {timeInfo.date}
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {timeInfo.time}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {suggestion.reasoning}
                            </Typography>
                            
                            {/* Enhanced metrics */}
                            <Box display="flex" gap={0.5} mt={0.5}>
                              {suggestion.conflictScore !== undefined && suggestion.conflictScore === 0 && (
                                <Chip label="No Conflicts" size="small" color="success" variant="outlined" />
                              )}
                              {suggestion.optimalityScore !== undefined && suggestion.optimalityScore >= 80 && (
                                <Chip 
                                  label={optimalityInfo.label} 
                                  size="small" 
                                  sx={{ 
                                    backgroundColor: optimalityInfo.color, 
                                    color: 'white',
                                    fontSize: '0.7rem'
                                  }} 
                                />
                              )}
                            </Box>
                            
                            {/* Location Suggestions */}
                            {suggestion.locationSuggestions && suggestion.locationSuggestions.length > 0 && (
                              <Box mt={1}>
                                <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                  <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    Suggested Locations:
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                  {suggestion.locationSuggestions.slice(0, 2).map((location, locIndex) => (
                                    <Tooltip key={locIndex} title="Click to add this location to the event">
                                      <Chip
                                        label={location.name}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{ 
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          '&:hover': {
                                            backgroundColor: 'primary.main',
                                            color: 'primary.contrastText',
                                            borderColor: 'primary.main'
                                          }
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onLocationSelect) {
                                            onLocationSelect(location);
                                          }
                                        }}
                                      />
                                    </Tooltip>
                                  ))}
                                </Stack>
                              </Box>
                            )}
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
                            {suggestion.priority && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Score: {Math.round(suggestion.priority)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}

            {/* Pipeline Metadata Accordion */}
            {suggestions.pipelineMetadata && (
              <Accordion sx={{ mt: 2 }} expanded={showMetadata} onChange={() => setShowMetadata(!showMetadata)}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Timeline fontSize="small" />
                    <Typography variant="subtitle2">
                      Pipeline Analytics
                    </Typography>
                    <Chip 
                      label={`${suggestions.pipelineMetadata.stepsExecuted.length} steps`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Processing Time:
                      </Typography>
                      <Typography variant="body2">
                        {suggestions.pipelineMetadata.totalProcessingTime}ms
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Pipeline Steps:
                      </Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                        {suggestions.pipelineMetadata.stepsExecuted.map((step, idx) => (
                          <Chip 
                            key={idx}
                            label={step}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    </Box>

                    {suggestions.pipelineMetadata.confidenceEvolution.length > 1 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Confidence Evolution:
                        </Typography>
                        <Box display="flex" gap={0.5} mt={0.5}>
                          {suggestions.pipelineMetadata.confidenceEvolution.map((conf, idx) => (
                            <Chip 
                              key={idx}
                              label={`${Math.round(conf * 100)}%`}
                              size="small"
                              color={idx === suggestions.pipelineMetadata.confidenceEvolution.length - 1 ? 'primary' : 'default'}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {suggestions.pipelineMetadata.refinementApplied && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Advanced AI refinement was applied to improve classification accuracy.
                      </Alert>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
              <Button
                size="small"
                startIcon={<TrendingUp />}
                onClick={generateSuggestions}
                disabled={loading}
              >
                Refresh Suggestions
              </Button>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Speed fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Powered by Multi-Step AI Pipeline
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartSchedulingSuggestions; 