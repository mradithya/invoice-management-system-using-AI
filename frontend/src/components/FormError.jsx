import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * FormError Component
 * Displays validation error message under form fields
 * 
 * @param {Object} props
 * @param {boolean} props.error - Whether there's an error
 * @param {string} props.message - Error message to display
 */
const FormError = ({ error, message }) => {
  if (!error || !message) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          color: '#d32f2f',
          fontWeight: 500,
          display: 'block'
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default FormError;
