import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, severity = 'info', duration = 4000) => {
    setNotification({ message, severity, duration });
  }, []);

  const notify = {
    success: (message, duration = 4000) => showNotification(message, 'success', duration),
    error: (message, duration = 6000) => showNotification(message, 'error', duration),
    info: (message, duration = 4000) => showNotification(message, 'info', duration),
    warning: (message, duration = 5000) => showNotification(message, 'warning', duration)
  };

  const handleClose = () => {
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={!!notification}
        autoHideDuration={notification?.duration || 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          zIndex: 2200,
          mt: { xs: 1, sm: 2 },
          mr: { xs: 1, sm: 2 }
        }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.severity || 'info'}
          sx={{ width: '100%', maxWidth: 420, boxShadow: 2 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
