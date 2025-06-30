import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import { Add, Notifications, AccountCircle, ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import { User } from '@supabase/supabase-js';
import dayjs from 'dayjs';

import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setShowEventModal, navigateDate } from '../../store/appSlice';

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const dispatch = useAppDispatch();
  const { currentView, selectedDate } = useAppSelector(state => state.app);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleNewEvent = () => {
    dispatch(setShowEventModal(true));
  };

  const handleNavigation = (direction: 'prev' | 'next' | 'today') => {
    dispatch(navigateDate(direction));
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const getDateLabel = () => {
    const date = dayjs(selectedDate);
    switch (currentView) {
      case 'month':
        return date.format('MMMM YYYY');
      case 'week':
        const startOfWeek = date.startOf('week');
        const endOfWeek = date.endOf('week');
        return `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D, YYYY')}`;
      case 'day':
        return date.format('dddd, MMMM D, YYYY');
      case 'agenda':
        return 'Agenda View';
      default:
        return date.format('MMMM YYYY');
    }
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: 'white',
        color: 'text.primary',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar>
        {/* Date Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => handleNavigation('prev')} size="small">
            <ChevronLeft />
          </IconButton>
          <IconButton onClick={() => handleNavigation('today')} size="small" color="primary">
            <Today />
          </IconButton>
          <IconButton onClick={() => handleNavigation('next')} size="small">
            <ChevronRight />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2, minWidth: '200px' }}>
            {getDateLabel()}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleNewEvent}
            size="small"
          >
            New Event
          </Button>

          <IconButton size="small">
            <Notifications />
          </IconButton>

          <IconButton
            onClick={handleProfileMenuOpen}
            size="small"
          >
            {user?.user_metadata?.avatar_url ? (
              <Avatar 
                src={user.user_metadata.avatar_url} 
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle />
            )}
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleProfileMenuClose}>
              <Typography variant="body2">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleProfileMenuClose}>Profile</MenuItem>
            <MenuItem onClick={handleProfileMenuClose}>Settings</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 