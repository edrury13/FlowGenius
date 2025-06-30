import React from 'react';
import { Box, Typography } from '@mui/material';
import { CalendarView as CalendarViewType } from '../../types';

interface CalendarViewProps {
  view: CalendarViewType;
  date: Date;
  onViewChange: (view: CalendarViewType) => void;
  onDateChange: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  view,
  date,
  onViewChange,
  onDateChange,
}) => {
  return (
    <Box sx={{ padding: 2, height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Calendar View ({view})
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Selected Date: {date.toLocaleDateString()}
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        🎉 FlowGenius is successfully running! 
        <br />
        Calendar component will be fully implemented in the next phase.
      </Typography>
    </Box>
  );
};

export default CalendarView; 