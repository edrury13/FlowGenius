import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Button,
} from '@mui/material';
import {
  CalendarMonth,
  ViewWeek,
  Today,
  ViewAgenda,
  Settings,
  ExitToApp,
} from '@mui/icons-material';
import { CalendarView } from '../../types';

interface SidebarProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  onLogout,
}) => {
  const viewOptions = [
    { value: 'month' as CalendarView, label: 'Month', icon: <CalendarMonth /> },
    { value: 'week' as CalendarView, label: 'Week', icon: <ViewWeek /> },
    { value: 'day' as CalendarView, label: 'Day', icon: <Today /> },
    { value: 'agenda' as CalendarView, label: 'Agenda', icon: <ViewAgenda /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" color="primary">
          FlowGenius
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Productivity Dashboard
        </Typography>
      </Box>
      
      <Divider />
      
      <List>
        <ListItem>
          <ListItemText primary="Calendar Views" />
        </ListItem>
        {viewOptions.map((option) => (
          <ListItem key={option.value} disablePadding>
            <ListItemButton
              selected={currentView === option.value}
              onClick={() => onViewChange(option.value)}
            >
              <ListItemIcon>{option.icon}</ListItemIcon>
              <ListItemText primary={option.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      <List>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ExitToApp />}
          onClick={onLogout}
          color="error"
        >
          Logout
        </Button>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 