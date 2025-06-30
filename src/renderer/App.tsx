import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { authService } from './services/supabase';
import { User } from '@supabase/supabase-js';
import { notificationService } from './services/notifications';

// Components
import Login from './components/Auth/Login';
import CalendarView from './components/Calendar/CalendarView';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Types
import { CalendarView as CalendarViewType } from './types';

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<CalendarViewType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    // Check initial auth state
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Set up Electron IPC listeners
    if (window.electronAPI) {
      // Handle quick add event from system tray
      window.electronAPI.onQuickAddEvent(() => {
        console.log('Quick add event triggered from system tray');
        // TODO: Open quick add event modal
      });

      // Handle settings from system tray
      window.electronAPI.onOpenSettings(() => {
        console.log('Settings triggered from system tray');
        // TODO: Open settings modal
      });

      // Cleanup listeners on unmount
      return () => {
        window.electronAPI?.removeAllListeners('quick-add-event');
        window.electronAPI?.removeAllListeners('open-settings');
      };
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      await authService.signIn(email, password);
      // User state will be updated via the auth state change listener
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      // Clear any scheduled notifications
      notificationService.clearAllReminders();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleViewChange = (view: CalendarViewType) => {
    setCurrentView(view);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          height="100vh"
          sx={{ backgroundColor: '#f5f5f5' }}
        >
          <div>Loading FlowGenius...</div>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Box sx={{ display: 'flex', height: '100vh' }}>
          {/* Sidebar */}
          <Sidebar 
            currentView={currentView}
            onViewChange={handleViewChange}
            onLogout={handleLogout}
          />
          
          {/* Main Content */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Header 
              user={user}
              currentView={currentView}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />
            
            {/* Calendar */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <CalendarView 
                view={currentView}
                date={selectedDate}
                onViewChange={handleViewChange}
                onDateChange={handleDateChange}
              />
            </Box>
          </Box>
        </Box>
      )}
    </ThemeProvider>
  );
};

export default App; 