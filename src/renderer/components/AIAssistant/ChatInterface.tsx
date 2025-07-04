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
  useTheme,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl
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
  isCompactMode?: boolean;
  selectedDate?: Date;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  events,
  onEventCreate,
  onClose,
  className,
  isCompactMode = false,
  selectedDate
}) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiService] = useState(() => new AIAssistantService());
  const [selectedLocations, setSelectedLocations] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Welcome message
    const dateContext = selectedDate ? ` for ${selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })}` : '';
    
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: isCompactMode 
        ? `Hi! I can help you schedule events${dateContext}. Try: "Meeting with John tomorrow at 2pm"`
        : `Hi! 👋 I'm your AI scheduling assistant. I can help you schedule events${dateContext} by understanding natural language descriptions.

Try saying something like:
• "Schedule a team meeting next Tuesday"
• "Set up a client call with John next week"
• "Book lunch with Sarah tomorrow"
• "Plan a project review meeting"

What would you like to schedule?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [isCompactMode, selectedDate]);

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

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const aiResponse = await aiService.processMessage(userMessage, events, selectedDate);
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

  const handleLocationSelect = (suggestionId: string, locationName: string) => {
    setSelectedLocations(prev => new Map(prev.set(suggestionId, locationName)));
  };

  const handleCreateEvent = async (eventData: Partial<EventFormData>, suggestion: EventSuggestion) => {
    if (eventData.title && eventData.startTime && eventData.endTime) {
      // Get the selected location for this suggestion
      const selectedLocation = selectedLocations.get(suggestion.id) || eventData.location || '';
      
      const fullEventData: EventFormData = {
        title: eventData.title,
        description: eventData.description || '',
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: selectedLocation,
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
          content: `✅ Created "${eventData.title}" for ${eventData.startTime.toLocaleString()}${selectedLocation ? ` at ${selectedLocation}` : ''}!`,
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
    const selectedLocation = selectedLocations.get(suggestion.id) || suggestion.suggestedLocation || '';
    
    const eventData: Partial<EventFormData> = {
      title: suggestion.title,
      description: suggestion.description,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      location: selectedLocation,
      attendees: suggestion.suggestedInvitees || [],
      isRecurring: false
    };
    
    await handleCreateEvent(eventData, suggestion);
  };

  const formatTimeSlot = (timeSlot: any) => {
    if (isCompactMode) {
      const time = `${timeSlot.startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })} - ${timeSlot.endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
      const date = timeSlot.startTime.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      return `${date} ${time}`;
    }
    
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
          mb: isCompactMode ? 1 : 2,
          gap: 1
        }}
      >
        <Avatar
          sx={{
            bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
            width: isCompactMode ? 24 : 32,
            height: isCompactMode ? 24 : 32
          }}
        >
          {isUser ? 
            <PersonIcon fontSize={isCompactMode ? 'small' : 'small'} /> : 
            <SmartIcon fontSize={isCompactMode ? 'small' : 'small'} />
          }
        </Avatar>
        
        <Box sx={{ maxWidth: isCompactMode ? '85%' : '75%', minWidth: isCompactMode ? '150px' : '200px' }}>
          <Paper
            elevation={1}
            sx={{
              p: isCompactMode ? 1 : 2,
              bgcolor: isUser ? theme.palette.primary.light : theme.palette.grey[100],
              color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
              borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px'
            }}
          >
            <Typography
              variant={isCompactMode ? 'body2' : 'body1'}
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
                fontSize: isCompactMode ? '0.8rem' : undefined
              }}
            >
              {message.content}
            </Typography>
            
            <Typography
              variant="caption"
              sx={{
                opacity: 0.7,
                display: 'block',
                mt: 0.5,
                fontSize: isCompactMode ? '0.65rem' : '0.75rem'
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
            <Box sx={{ mt: isCompactMode ? 1 : 2 }}>
              {message.suggestions.map((suggestion) => (
                <Card key={suggestion.id} sx={{ 
                  mb: isCompactMode ? 1 : 2, 
                  borderRadius: 2,
                  border: isCompactMode ? '1px solid' : undefined,
                  borderColor: isCompactMode ? 'divider' : undefined,
                  boxShadow: isCompactMode ? 1 : undefined
                }}>
                  <CardContent sx={{ p: isCompactMode ? 1 : 2, '&:last-child': { pb: isCompactMode ? 1 : 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: isCompactMode ? 1 : 2 }}>
                      <EventIcon color="primary" sx={{ mr: 1, fontSize: isCompactMode ? 'small' : undefined }} />
                      <Typography variant={isCompactMode ? 'subtitle2' : 'h6'} component="div" sx={{ fontWeight: 600 }}>
                        {suggestion.title}
                      </Typography>
                      <Chip 
                        label={`${Math.round(suggestion.confidence * 100)}%`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 'auto', fontWeight: 500, fontSize: isCompactMode ? '0.65rem' : undefined }}
                      />
                    </Box>

                    {/* Location Suggestions with Radio Buttons */}
                    {suggestion.locationSuggestions && suggestion.locationSuggestions.length > 0 && (
                      <Box sx={{ mb: isCompactMode ? 1 : 2 }}>
                        <Typography variant={isCompactMode ? 'caption' : 'subtitle2'} sx={{ mb: 0.5, fontWeight: 600 }}>
                          📍 Select Location
                        </Typography>
                        <FormControl component="fieldset" sx={{ width: '100%' }}>
                          <RadioGroup
                            value={selectedLocations.get(suggestion.id) || ''}
                            onChange={(e) => handleLocationSelect(suggestion.id, e.target.value)}
                            sx={{ gap: 0.5 }}
                          >
                            {/* Option for no location */}
                            <FormControlLabel
                              value=""
                              control={<Radio size={isCompactMode ? 'small' : 'medium'} />}
                              label={
                                <Typography variant={isCompactMode ? 'caption' : 'body2'}>
                                  No location
                                </Typography>
                              }
                              sx={{ margin: 0 }}
                            />
                            
                            {/* Location options */}
                            {suggestion.locationSuggestions.slice(0, 3).map((location, locIndex) => (
                              <FormControlLabel
                                key={locIndex}
                                value={location.name}
                                control={<Radio size={isCompactMode ? 'small' : 'medium'} />}
                                label={
                                  <Box>
                                    <Typography variant={isCompactMode ? 'caption' : 'body2'} sx={{ fontWeight: 500 }}>
                                      {location.name}
                                    </Typography>
                                    {!isCompactMode && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        {location.address}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                sx={{ margin: 0, alignItems: 'flex-start' }}
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: isCompactMode ? 1 : 2 }}>
                      {suggestion.suggestedTimes.slice(0, isCompactMode ? 2 : 3).map((timeSlot, index) => (
                        <Card
                          key={index}
                          variant="outlined"
                          sx={{
                            p: isCompactMode ? 1 : 2,
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: isCompactMode ? 1 : 2,
                              borderColor: 'primary.main'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant={isCompactMode ? 'caption' : 'body1'} sx={{ fontWeight: 500, mb: 0.5 }}>
                                {formatTimeSlot(timeSlot)}
                              </Typography>
                              <Chip
                                label={timeSlot.priority === 1 ? 'Best' : timeSlot.priority === 2 ? 'Good' : 'OK'}
                                size="small"
                                color={timeSlot.priority === 1 ? 'success' : timeSlot.priority === 2 ? 'warning' : 'default'}
                                sx={{ fontWeight: 500, fontSize: isCompactMode ? '0.65rem' : undefined }}
                              />
                            </Box>
                            <Button
                              variant="contained"
                              size={isCompactMode ? 'small' : 'medium'}
                              onClick={() => handleUseTimeSlot(suggestion, timeSlot)}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: isCompactMode ? '0.7rem' : undefined,
                                px: isCompactMode ? 1 : 3
                              }}
                            >
                              {isCompactMode ? 'Use' : 'Use This Time'}
                            </Button>
                          </Box>
                        </Card>
                      ))}
                    </Box>

                    {!isCompactMode && (
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
                    )}
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
      {!isCompactMode && (
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
      )}

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: isCompactMode ? 1 : 2,
          bgcolor: 'grey.50'
        }}
      >
        {messages.map(renderMessage)}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={isCompactMode ? 16 : 20} />
              <Typography variant={isCompactMode ? 'caption' : 'body2'} color="text.secondary">
                AI is thinking...
              </Typography>
            </Box>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Paper
        elevation={isCompactMode ? 1 : 3}
        sx={{
          p: isCompactMode ? 1 : 2,
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
          placeholder={isCompactMode ? "Schedule an event..." : "Describe the event you want to schedule..."}
          multiline
          maxRows={isCompactMode ? 2 : 4}
          fullWidth
          variant="outlined"
          size="small"
          disabled={isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              fontSize: isCompactMode ? '0.8rem' : undefined
            }
          }}
        />
        
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          size={isCompactMode ? 'small' : 'medium'}
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
          <SendIcon fontSize={isCompactMode ? 'small' : 'medium'} />
        </IconButton>
      </Paper>
    </Box>
  );
};