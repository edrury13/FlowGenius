import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Chip,
  Avatar,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Notifications,
  AccountCircle,
} from '@mui/icons-material';
import { User } from '@supabase/supabase-js';
import { CalendarView } from '../../types';

interface HeaderProps {
  user: User;
  currentView: CalendarView;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  currentView,
  selectedDate,
  onDateChange,
}) => {
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      default:
        break;
    }
    
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        {/* Date Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          <IconButton onClick={() => navigateDate('prev')}>
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h6" sx={{ mx: 2, minWidth: 200 }}>
            {formatDate(selectedDate)}
          </Typography>
          
          <IconButton onClick={() => navigateDate('next')}>
            <ChevronRight />
          </IconButton>
          
          <Chip
            label="Today"
            onClick={goToToday}
            variant="outlined"
            sx={{ ml: 2 }}
          />
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right side - Notifications and User */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton>
            <Notifications />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              <AccountCircle />
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 