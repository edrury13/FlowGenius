import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  IconButton,
  Avatar,
  Chip,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as SmartIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  EventNote as EventIcon,
  ExpandMore as ExpandMoreIcon,
  AutoFixHigh as MagicIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { AIAssistantService, ChatMessage, EventSuggestion } from '../../services/aiAssistant';
import { Event } from '../../services/supabase';
import { EventFormData } from '../../types';

interface ChatInterfaceProps {
  events: Event[];
  onEventCreate: (eventData: EventFormData) => Promise<void>;
  onClose?: () => void;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  events,
  onEventCreate,
  onClose,
  className
}) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiService] = useState(() => new AIAssistantService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `Hi! 👋 I'm your AI scheduling assistant. I can help you schedule events by understanding natural language descriptions.

Try saying something like:
• "Schedule a team meeting next Tuesday"
• "Set up a client call with John next week"
• "Book lunch with Sarah tomorrow"
• "Plan a project review meeting"

What would you like to schedule?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await aiService.processMessage(userMessage, events);
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Failed to process message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateEvent = async (eventData: Partial<EventFormData>, suggestion: EventSuggestion) => {
    if (eventData.title && eventData.startTime && eventData.endTime) {
      const fullEventData: EventFormData = {
        title: eventData.title,
        description: eventData.description || '',
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: eventData.location || '',
        attendees: eventData.attendees || [],
        isRecurring: eventData.isRecurring || false,
        recurrenceRule: eventData.recurrenceRule
      };
      
      try {
        await onEventCreate(fullEventData);

        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: `confirm_${Date.now()}`,
          type: 'assistant',
          content: `✅ Great! I've created "${eventData.title}" for ${eventData.startTime.toLocaleString()}. The event has been added to your calendar!`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, confirmMessage]);
      } catch (error) {
        console.error('Failed to create event:', error);
        // Add error message
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          type: 'assistant',
          content: `❌ Sorry, I couldn't create the event "${eventData.title}". Please try again.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const handleUseTimeSlot = async (suggestion: EventSuggestion, timeSlot: any) => {
    const eventData: Partial<EventFormData> = {
      title: suggestion.title,
      description: suggestion.description,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      location: suggestion.suggestedLocation,
      attendees: suggestion.suggestedInvitees || [],
      isRecurring: false
    };
    
    await handleCreateEvent(eventData, suggestion);
  };

  const formatTimeSlot = (timeSlot: any) => {
    const day = timeSlot.startTime.toLocaleDateString('en-US', { weekday: 'long' });
    const date = timeSlot.startTime.toLocaleDateString();
    const time = `${timeSlot.startTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })} - ${timeSlot.endTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
    
    return `${day}, ${date} at ${time}`;
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          mb: 2,
          gap: 1
        }}
      >
        <Avatar
          sx={{
            bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
            width: 32,
            height: 32
          }}
        >
          {isUser ? <PersonIcon fontSize="small" /> : <SmartIcon fontSize="small" />}
        </Avatar>
        
        <Box sx={{ maxWidth: '75%', minWidth: '200px' }}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: isUser ? theme.palette.primary.light : theme.palette.grey[100],
              color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
              borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
            }}
          >
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5
              }}
            >
              {message.content}
            </Typography>
            
            <Typography
              variant="caption"
              sx={{
                opacity: 0.7,
                display: 'block',
                mt: 1,
                fontSize: '0.75rem'
              }}
            >
              {message.timestamp.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </Typography>
          </Paper>

          {/* Render event suggestions */}
          {message.suggestions && message.suggestions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {message.suggestions.map((suggestion) => (
                <Card key={suggestion.id} sx={{ mb: 2, borderRadius: 3 }}>
                  <CardContent sx={{ pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <EventIcon color="primary" sx={{ mr: 1.5 }} />
                      <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                        {suggestion.title}
                      </Typography>
                      <Chip 
                        label={`${Math.round(suggestion.confidence * 100)}% confident`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 'auto', fontWeight: 500 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                      {suggestion.suggestedLocation && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            {suggestion.suggestedLocation}
                          </Typography>
                        </Box>
                      )}

                      {suggestion.suggestedInvitees && suggestion.suggestedInvitees.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            {suggestion.suggestedInvitees.join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Location Suggestions */}
                    {suggestion.locationSuggestions && suggestion.locationSuggestions.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          📍 Suggested Locations
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {suggestion.locationSuggestions.slice(0, 3).map((location, locIndex) => (
                            <Box
                              key={locIndex}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                backgroundColor: 'background.paper',
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                  borderColor: 'primary.main'
                                }
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {location.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {location.address}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<LocationIcon />}
                                  onClick={() => {
                                    // Add location to event (this would need to be implemented)
                                    console.log('Add location to event:', location);
                                  }}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Add
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<LocationIcon />}
                                  onClick={() => {
                                    const googleMapsUrl = location.placeId 
                                      ? `https://www.google.com/maps/place/?q=place_id:${location.placeId}`
                                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name + ' ' + (location.address || ''))}`;
                                    window.open(googleMapsUrl, '_blank');
                                  }}
                                  sx={{ textTransform: 'none' }}
                                >
                                  View
                                </Button>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {suggestion.suggestedTimes.slice(0, 3).map((timeSlot, index) => (
                        <Card
                          key={index}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: 2,
                              borderColor: 'primary.main'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {formatTimeSlot(timeSlot).split(' at ')[0]}
                              </Typography>
                              <Typography variant="body1" color="primary" sx={{ fontWeight: 500, mb: 1 }}>
                                {formatTimeSlot(timeSlot).split(' at ')[1]}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={timeSlot.priority === 1 ? 'Best Option' : timeSlot.priority === 2 ? 'Good Option' : 'Available'}
                                  size="small"
                                  color={timeSlot.priority === 1 ? 'success' : timeSlot.priority === 2 ? 'warning' : 'default'}
                                  sx={{ fontWeight: 500 }}
                                />
                                {timeSlot.optimalityScore && (
                                  <Typography variant="caption" color="text.secondary">
                                    {Math.round(timeSlot.optimalityScore * 100)}% optimal
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Button
                              variant="contained"
                              startIcon={<MagicIcon />}
                              onClick={() => handleUseTimeSlot(suggestion, timeSlot)}
                              sx={{
                                ml: 2,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3
                              }}
                            >
                              Use This Time
                            </Button>
                          </Box>
                        </Card>
                      ))}
                    </Box>

                    <Accordion sx={{ mt: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2">
                          Why these suggestions? (AI Reasoning)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="text.secondary">
                          {suggestion.reasoning}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.default'
      }}
    >
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0,
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <SmartIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Scheduling Assistant
        </Typography>
        {onClose && (
          <IconButton
            color="inherit"
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        )}
      </Paper>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'grey.50'
        }}
      >
        {messages.map(renderMessage)}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                AI is thinking...
              </Typography>
            </Box>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          borderRadius: 0
        }}
      >
        <TextField
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe the event you want to schedule..."
          multiline
          maxRows={4}
          fullWidth
          variant="outlined"
          size="small"
          disabled={isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3
            }
          }}
        />
        
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark'
            },
            '&:disabled': {
              bgcolor: 'action.disabledBackground'
            }
          }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
};