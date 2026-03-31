import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { InboxOutlined as InboxIcon } from '@mui/icons-material';

/**
 * EmptyState Component
 * Shows a centered empty state message with optional action button
 * 
 * @param {Object} props
 * @param {React.Component} props.icon - Icon component to display
 * @param {string} props.title - Title text
 * @param {string} props.message - Description message
 * @param {string} props.actionLabel - Button label (optional)
 * @param {function} props.onAction - Callback when button is clicked (optional)
 */
const EmptyState = ({ 
  icon: Icon = InboxIcon, 
  title = 'No data found',
  message = 'There is nothing to display.',
  actionLabel = null,
  onAction = null
}) => {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{
        py: 7,
        px: 3,
        background: 'linear-gradient(160deg, rgba(30,41,59,0.95) 0%, rgba(17,24,39,0.95) 100%)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(71,85,105,0.5)',
        minHeight: '300px',
        boxShadow: '0 16px 30px rgba(2, 6, 23, 0.35)'
      }}
    >
      <Icon sx={{ fontSize: 62, color: '#93c5fd', opacity: 0.85 }} />
      <Typography variant="h6" fontWeight={600} align="center" sx={{ color: '#f8fafc' }}>
        {title}
      </Typography>
      <Typography variant="body2" align="center" sx={{ maxWidth: 400, color: '#94a3b8' }}>
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1, px: 3 }}>
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
};

export default EmptyState;
