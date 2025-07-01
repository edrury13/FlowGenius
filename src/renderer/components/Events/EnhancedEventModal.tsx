import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Chip,
  IconButton,
  Alert,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Close,
  Psychology,
  AccessTime,
  LocationOn,
  People
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Event } from '../../services/supabase';
import { EventFormData } from '../../types';
import SmartSchedulingSuggestions from './SmartSchedulingSuggestions';
import dayjs from 'dayjs';

interface EnhancedEventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (eventData: EventFormData) => void;
  onDelete?: (eventId: string) => void;
  event?: Event;
  existingEvents: Event[];
  selectedDate?: Date;
}

const EnhancedEventModal: React.FC<EnhancedEventModalProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  existingEvents,
  selectedDate
}) => {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(),
    location: '',
    attendees: [],
    isRecurring: false,
    recurrenceRule: ''
  });

  const [showSmartSuggestions, setShowSmartSuggestions] = useState(true);
  const [attendeesInput, setAttendeesInput] = useState('');
  const [errors, setErrors] = useState<Partial<EventFormData>>({});

  useEffect(() => {
    if (event) {
      // Editing existing event
      setFormData({
        title: event.title,
        description: event.description || '',
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
        location: event.location || '',
        attendees: event.attendees || [],
        isRecurring: event.is_recurring,
        recurrenceRule: event.recurrence_rule || ''
      });
      setAttendeesInput((event.attendees || []).join(', '));
    } else {
      // Creating new event
      const now = selectedDate ? dayjs(selectedDate) : dayjs();
      const defaultStart = now.hour(9).minute(0).second(0).millisecond(0);
      const defaultEnd = defaultStart.add(1, 'hour');

      setFormData({
        title: '',
        description: '',
        startTime: defaultStart.toDate(),
        endTime: defaultEnd.toDate(),
        location: '',
        attendees: [],
        isRecurring: false,
        recurrenceRule: ''
      });
      setAttendeesInput('');
    }
    setErrors({});
  }, [event, selectedDate, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<EventFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.startTime >= formData.endTime) {
      newErrors.startTime = 'Start time must be before end time';
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const attendeesList = attendeesInput
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      onSave({
        ...formData,
        attendees: attendeesList
      });
    }
  };

  const handleTimeSlotSelect = (startTime: Date, endTime: Date) => {
    setFormData(prev => ({
      ...prev,
      startTime,
      endTime
    }));
    setShowSmartSuggestions(false);
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleAttendeesChange = (value: string) => {
    setAttendeesInput(value);
    if (errors.attendees) {
      setErrors(prev => ({
        ...prev,
        attendees: undefined
      }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {event ? 'Edit Event' : 'Create New Event'}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Smart Scheduling Powered by AI">
              <Chip
                icon={<Psychology />}
                label="AI Powered"
                size="small"
                color="primary"
                variant="outlined"
              />
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Event Details Section */}
          <Grid item xs={12} md={showSmartSuggestions ? 7 : 12}>
            <Box>
              <TextField
                fullWidth
                label="Event Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
                margin="normal"
                required
                autoFocus
              />

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={3}
                margin="normal"
                placeholder="Add event details, agenda, or notes..."
              />

              {/* Date and Time Section */}
              <Box mt={2} mb={2}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime fontSize="small" />
                  Date & Time
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="Start Time"
                      value={dayjs(formData.startTime)}
                      onChange={(newValue) => newValue && handleInputChange('startTime', newValue.toDate())}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.startTime,
                          helperText: errors.startTime
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="End Time"
                      value={dayjs(formData.endTime)}
                      onChange={(newValue) => newValue && handleInputChange('endTime', newValue.toDate())}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.endTime,
                          helperText: errors.endTime
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Location Section */}
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                margin="normal"
                InputProps={{
                  startAdornment: <LocationOn color="action" sx={{ mr: 1 }} />
                }}
                placeholder="Add location or meeting link"
              />

              {/* Attendees Section */}
              <TextField
                fullWidth
                label="Attendees"
                value={attendeesInput}
                onChange={(e) => handleAttendeesChange(e.target.value)}
                margin="normal"
                InputProps={{
                  startAdornment: <People color="action" sx={{ mr: 1 }} />
                }}
                placeholder="Enter email addresses separated by commas"
                helperText="Separate multiple email addresses with commas"
              />

              {/* Recurring Event Toggle */}
              <Box mt={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRecurring}
                      onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                    />
                  }
                  label="Recurring Event"
                />
              </Box>

              {formData.isRecurring && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Recurrence Pattern</InputLabel>
                  <Select
                    value={formData.recurrenceRule}
                    onChange={(e) => handleInputChange('recurrenceRule', e.target.value)}
                    label="Recurrence Pattern"
                  >
                    <MenuItem value="FREQ=DAILY">Daily</MenuItem>
                    <MenuItem value="FREQ=WEEKLY">Weekly</MenuItem>
                    <MenuItem value="FREQ=MONTHLY">Monthly</MenuItem>
                    <MenuItem value="FREQ=YEARLY">Yearly</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          </Grid>

          {/* Smart Suggestions Section */}
          {showSmartSuggestions && !event && (
            <Grid item xs={12} md={5}>
              <SmartSchedulingSuggestions
                title={formData.title}
                description={formData.description}
                preferredDate={selectedDate}
                existingEvents={existingEvents}
                onTimeSlotSelect={handleTimeSlotSelect}
                onClose={() => setShowSmartSuggestions(false)}
              />
            </Grid>
          )}
        </Grid>

        {/* Show smart suggestions toggle for new events */}
        {!event && !showSmartSuggestions && (
          <Box mt={2}>
            <Button
              startIcon={<Psychology />}
              onClick={() => setShowSmartSuggestions(true)}
              variant="outlined"
              color="primary"
            >
              Show Smart Scheduling Suggestions
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Box display="flex" justifyContent="space-between" width="100%" px={1}>
          <Box>
            {event && onDelete && (
              <Button
                color="error"
                onClick={() => onDelete(event.id)}
                variant="outlined"
              >
                Delete Event
              </Button>
            )}
          </Box>
          <Box display="flex" gap={1}>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              color="primary"
            >
              {event ? 'Update Event' : 'Create Event'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedEventModal; 