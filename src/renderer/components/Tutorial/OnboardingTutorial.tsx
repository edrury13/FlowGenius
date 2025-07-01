import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Fade,
  Grow,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close,
  AutoAwesome,
  CalendarMonth,
  Email,
  Analytics,
  NotificationsActive,
  Schedule,
  SmartToy,
  NavigateNext,
  NavigateBefore,
  CheckCircle,
} from '@mui/icons-material';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetElement?: string;
  highlightColor?: string;
  features: string[];
}

interface OnboardingTutorialProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FlowGenius! 🎉',
    description: 'Your AI-powered productivity companion is ready to transform how you manage your time and tasks.',
    icon: <AutoAwesome sx={{ fontSize: 40, color: '#667eea' }} />,
    highlightColor: '#667eea',
    features: [
      'AI-powered intelligent scheduling',
      'Calendar management with multiple views',
      'Gmail integration for seamless workflow',
      'Detailed analytics and insights',
      'Smart notifications and reminders'
    ]
  },
  {
    id: 'ai-scheduling',
    title: 'AI Smart Scheduling ✨',
    description: 'Let our AI automatically classify and schedule your events based on context and optimal timing.',
    icon: <SmartToy sx={{ fontSize: 40, color: '#48bb78' }} />,
    targetElement: '[data-tutorial="create-event"]',
    highlightColor: '#48bb78',
    features: [
      'Automatic event classification (business vs hobby)',
      'Intelligent time slot suggestions',
      'Conflict detection and resolution',
      'Multi-step AI pipeline for accuracy',
      'Local fallback when offline'
    ]
  },
  {
    id: 'calendar-views',
    title: 'Flexible Calendar Views 📅',
    description: 'Switch between different calendar views to see your schedule from multiple perspectives.',
    icon: <CalendarMonth sx={{ fontSize: 40, color: '#ed8936' }} />,
    targetElement: '[data-tutorial="calendar-views"]',
    highlightColor: '#ed8936',
    features: [
      'Month view for overview planning',
      'Week view for detailed scheduling',
      'Day view for focused daily planning',
      'Agenda view for task management',
      'Easy navigation between dates'
    ]
  },
  {
    id: 'gmail-integration',
    title: 'Gmail Integration 📧',
    description: 'Connect your Gmail to automatically import meetings and sync your workflow.',
    icon: <Email sx={{ fontSize: 40, color: '#db4437' }} />,
    targetElement: '[data-tutorial="gmail-integration"]',
    highlightColor: '#db4437',
    features: [
      'Import meetings from Gmail automatically',
      'Sync calendar events with email invites',
      'Smart email classification and sorting',
      'Seamless workflow integration',
      'Privacy-focused secure connection'
    ]
  },
  {
    id: 'analytics',
    title: 'Productivity Analytics 📊',
    description: 'Track your productivity patterns and get insights into how you spend your time.',
    icon: <Analytics sx={{ fontSize: 40, color: '#9f7aea' }} />,
    targetElement: '[data-tutorial="analytics"]',
    highlightColor: '#9f7aea',
    features: [
      'Real-time app usage tracking',
      'Productivity pattern analysis',
      'Time distribution insights',
      'Focus session metrics',
      'Goal tracking and progress'
    ]
  },
  {
    id: 'notifications',
    title: 'Smart Notifications 🔔',
    description: 'Stay on top of your schedule with intelligent, context-aware notifications.',
    icon: <NotificationsActive sx={{ fontSize: 40, color: '#38b2ac' }} />,
    targetElement: '[data-tutorial="notifications"]',
    highlightColor: '#38b2ac',
    features: [
      'Smart reminder timing',
      'Context-aware notifications',
      'Custom notification rules',
      'Cross-platform sync',
      'Focus mode integration'
    ]
  }
];

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ open, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showHighlight, setShowHighlight] = useState(false);
  const theme = useTheme();

  const currentStepData = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (open && currentStepData.targetElement) {
      // Add highlight effect to target elements
      const element = document.querySelector(currentStepData.targetElement);
      if (element) {
        setShowHighlight(true);
        element.classList.add('tutorial-highlight');
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      // Cleanup highlight effects
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
      setShowHighlight(false);
    };
  }, [currentStep, currentStepData.targetElement, open]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    // Mark tutorial as completed in localStorage
    localStorage.setItem('flowgenius-tutorial-completed', 'true');
    localStorage.setItem('flowgenius-tutorial-completed-date', new Date().toISOString());
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <>
      {/* Tutorial Modal */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            minHeight: '500px',
            background: `linear-gradient(135deg, ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.paper} 100%)`,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {/* Header */}
          <Box sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight="bold" color="text.primary">
              FlowGenius Tutorial
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>

          {/* Progress Stepper */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Stepper activeStep={currentStep} alternativeLabel>
              {tutorialSteps.map((step, index) => (
                <Step key={step.id} completed={index < currentStep}>
                  <StepLabel 
                    onClick={() => handleStepClick(index)}
                    sx={{ cursor: 'pointer', '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}
                  >
                    {step.title.split(' ')[0]}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Main Content */}
          <Fade in={true} key={currentStep} timeout={500}>
            <Box sx={{ px: 4, pb: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  background: `linear-gradient(135deg, ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
                  border: `2px solid ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3,
                }}
              >
                {/* Step Icon */}
                <Grow in={true} timeout={800}>
                  <Box sx={{ mb: 3 }}>
                    {currentStepData.icon}
                  </Box>
                </Grow>

                {/* Step Content */}
                <Typography variant="h4" gutterBottom fontWeight="bold" color="text.primary">
                  {currentStepData.title}
                </Typography>
                
                <Typography variant="body1" paragraph color="text.secondary" sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
                  {currentStepData.description}
                </Typography>

                {/* Features List */}
                <Box sx={{ mt: 3, textAlign: 'left' }}>
                  <Typography variant="h6" gutterBottom color="text.primary" sx={{ textAlign: 'center', mb: 2 }}>
                    Key Features:
                  </Typography>
                  {currentStepData.features.map((feature, index) => (
                    <Fade in={true} timeout={600 + (index * 100)} key={feature}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 1,
                          p: 1,
                          borderRadius: 1,
                          background: alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.05),
                        }}
                      >
                        <CheckCircle 
                          sx={{ 
                            mr: 2, 
                            color: currentStepData.highlightColor || theme.palette.primary.main,
                            fontSize: '1.2rem'
                          }} 
                        />
                        <Typography variant="body2" color="text.primary">
                          {feature}
                        </Typography>
                      </Box>
                    </Fade>
                  ))}
                </Box>
              </Paper>
            </Box>
          </Fade>
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleSkip} 
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Skip Tutorial
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handlePrevious}
              disabled={isFirstStep}
              startIcon={<NavigateBefore />}
              variant="outlined"
              sx={{ textTransform: 'none' }}
            >
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              variant="contained"
              endIcon={isLastStep ? <CheckCircle /> : <NavigateNext />}
              sx={{ 
                textTransform: 'none',
                background: `linear-gradient(45deg, ${currentStepData.highlightColor || theme.palette.primary.main} 30%, ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.8)} 90%)`,
                minWidth: '120px'
              }}
            >
              {isLastStep ? 'Get Started!' : 'Next'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Global CSS for tutorial highlights */}
      <style>
        {`
          .tutorial-highlight {
            position: relative;
            z-index: 1000;
            box-shadow: 0 0 0 4px ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.3)} !important;
            border-radius: 8px !important;
            animation: tutorialPulse 2s infinite;
          }
          
          @keyframes tutorialPulse {
            0% { box-shadow: 0 0 0 4px ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.3)}; }
            50% { box-shadow: 0 0 0 8px ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.1)}; }
            100% { box-shadow: 0 0 0 4px ${alpha(currentStepData.highlightColor || theme.palette.primary.main, 0.3)}; }
          }
        `}
      </style>
    </>
  );
};

export default OnboardingTutorial;
