import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  CalendarMonth,
  CalendarViewWeek,
  Today,
  ViewAgenda,
  Settings,
  Logout,
  Dashboard,
} from '@mui/icons-material';

import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setCurrentView } from '../../store/appSlice';
import { CalendarView } from '../../types';

interface SidebarProps {
  onLogout: () => void;
}

const DRAWER_WIDTH = 240;

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const dispatch = useAppDispatch();
  const { currentView } = useAppSelector(state => state.app);

  const viewOptions = [
    { view: 'month' as CalendarView, label: 'Month', icon: <CalendarMonth /> },
    { view: 'week' as CalendarView, label: 'Week', icon: <CalendarViewWeek /> },
    { view: 'day' as CalendarView, label: 'Day', icon: <Today /> },
    { view: 'agenda' as CalendarView, label: 'Agenda', icon: <ViewAgenda /> },
  ];

  const handleViewChange = (view: CalendarView) => {
    dispatch(setCurrentView(view));
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          FlowGenius
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Productivity & Planning
        </Typography>
      </Box>
      
      <Divider />
      
      {/* Calendar Views */}
      <List>
        <ListItem>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            Calendar Views
          </Typography>
        </ListItem>
        {viewOptions.map((option) => (
          <ListItem key={option.view} disablePadding>
            <ListItemButton
              selected={currentView === option.view}
              onClick={() => handleViewChange(option.view)}
              sx={{
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {option.icon}
              </ListItemIcon>
              <ListItemText primary={option.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ my: 1 }} />
      
      {/* Additional Features */}
      <List>
        <ListItem>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            Tools
          </Typography>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton sx={{ mx: 1, borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Dashboard />
            </ListItemIcon>
            <ListItemText primary="Analytics" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton sx={{ mx: 1, borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
      
      {/* Bottom Actions */}
      <Box sx={{ mt: 'auto', p: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItemButton 
          onClick={onLogout}
          sx={{ 
            borderRadius: 1,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Sign Out" />
        </ListItemButton>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 