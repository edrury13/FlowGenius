import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TextField, Paper, List, ListItem, ListItemText, ListItemIcon, CircularProgress, IconButton, Popper } from '@mui/material';
import { LocationOn, Store, Restaurant, LocalCafe, FitnessCenter, Park, Movie, Museum } from '@mui/icons-material';
import { locationService, LocationSuggestion } from '../../services/location';
import { EventLocation } from '../../types';
import { debounce } from 'lodash';

interface LocationAutocompleteProps {
  value: EventLocation | string | undefined;
  onChange: (location: EventLocation | string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  eventType?: string;
}

const getLocationIcon = (types: string[]) => {
  if (types.includes('restaurant')) return <Restaurant />;
  if (types.includes('cafe')) return <LocalCafe />;
  if (types.includes('gym')) return <FitnessCenter />;
  if (types.includes('park')) return <Park />;
  if (types.includes('movie_theater')) return <Movie />;
  if (types.includes('museum') || types.includes('art_gallery')) return <Museum />;
  if (types.includes('store') || types.includes('shopping_mall')) return <Store />;
  return <LocationOn />;
};

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search for a place or enter an address',
  required = false,
  error = false,
  helperText,
  fullWidth = true,
  eventType,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorEl = useRef<HTMLDivElement>(null);

  // Initialize input value from prop value
  useEffect(() => {
    if (value) {
      setInputValue(locationService.formatLocation(value));
    }
  }, [value]);

  // Debounced search function
  const searchLocations = useCallback(
    debounce(async (searchText: string) => {
      if (!searchText || searchText.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await locationService.searchLocations(searchText);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (error) {
        console.error('Location search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    
    // If the user clears the input, clear the location
    if (!newValue) {
      onChange('');
      setSuggestions([]);
      setOpen(false);
    } else {
      searchLocations(newValue);
    }
  };

  const handleSuggestionClick = async (suggestion: LocationSuggestion) => {
    try {
      setLoading(true);
      const details = await locationService.getPlaceDetails(suggestion.placeId);
      onChange(details.location);
      setInputValue(locationService.formatLocation(details.location));
      setSuggestions([]);
      setOpen(false);
    } catch (error) {
      console.error('Failed to get place details:', error);
      // Fallback: use the suggestion text as a simple string location
      const simpleLocation = `${suggestion.mainText}, ${suggestion.secondaryText}`;
      onChange(simpleLocation);
      setInputValue(simpleLocation);
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    // Delay closing to allow click events on suggestions to fire
    setTimeout(() => {
      setOpen(false);
      // If the user typed something but didn't select a suggestion, save it as a string
      if (inputValue && (!value || inputValue !== locationService.formatLocation(value))) {
        onChange(inputValue);
      }
    }, 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setOpen(true);
    }
  };

  return (
    <div ref={anchorEl}>
      <TextField
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth={fullWidth}
        InputProps={{
          endAdornment: loading ? <CircularProgress size={20} /> : null,
        }}
      />
      
      <Popper
        open={open}
        anchorEl={anchorEl.current}
        placement="bottom-start"
        style={{ width: anchorEl.current?.offsetWidth, zIndex: 1300 }}
      >
        <Paper elevation={3} sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
          <List>
            {suggestions.map((suggestion) => (
              <ListItem
                key={suggestion.placeId}
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  {getLocationIcon(suggestion.types)}
                </ListItemIcon>
                <ListItemText
                  primary={suggestion.mainText}
                  secondary={suggestion.secondaryText}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popper>
    </div>
  );
}; 