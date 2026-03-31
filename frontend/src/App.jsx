import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { useTheme as useAppTheme } from './context/ThemeContext';
import {
  Box,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  Typography,
  createTheme
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import RecurringInvoices from './pages/RecurringInvoices';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import Layout from './components/Layout';

const LoadingScreen = ({ message = 'Loading...' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
    style={{ width: '100%', minHeight: '100vh' }}
  >
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        background: 'radial-gradient(circle at 20% 10%, rgba(59,130,246,0.15), transparent 34%), radial-gradient(circle at 80% 0%, rgba(34,197,94,0.12), transparent 28%), linear-gradient(135deg, #0f172a 0%, #111827 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <CircularProgress size={48} thickness={3} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Typography variant="h6" fontWeight={600}>{message}</Typography>
      </motion.div>
    </Box>
  </motion.div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading your workspace..." />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Preparing authentication..." />;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return isAdmin ? children : <Navigate to="/dashboard" />;
};

function App() {
  const { theme } = useAppTheme();

  const muiTheme = useMemo(() => createTheme({
    palette: {
      mode: theme,
      primary: {
        main: '#3b82f6'
      },
      secondary: {
        main: '#22c55e'
      },
      warning: {
        main: '#f59e0b'
      },
      background: {
        default: theme === 'dark' ? '#0f172a' : '#eaf0ff',
        paper: theme === 'dark' ? '#1f2937' : '#ffffff'
      }
    },
    typography: {
      fontFamily: 'Poppins, sans-serif',
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 }
    },
    shape: {
      borderRadius: 14
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: theme === 'dark' ? '#1f2937' : undefined,
            border: theme === 'dark' ? '1px solid rgba(100,116,139,0.28)' : undefined,
            boxShadow: theme === 'dark' ? '0 12px 28px rgba(2,6,23,0.28)' : undefined
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundColor: theme === 'dark' ? '#1f2937' : undefined,
            border: theme === 'dark' ? '1px solid rgba(100,116,139,0.26)' : undefined
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            fontWeight: 600,
            transition: 'all 0.25s ease'
          },
          containedPrimary: {
            boxShadow: theme === 'dark' ? '0 10px 24px rgba(59,130,246,0.26)' : undefined,
            '&:hover': {
              boxShadow: theme === 'dark' ? '0 14px 30px rgba(59,130,246,0.34)' : undefined
            }
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: theme === 'dark' ? '1px solid rgba(71,85,105,0.35)' : undefined,
            color: theme === 'dark' ? '#e5e7eb' : undefined
          },
          head: {
            fontWeight: 700,
            color: theme === 'dark' ? '#cbd5e1' : undefined,
            backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.95)' : undefined
          }
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: theme === 'dark' ? 'rgba(59,130,246,0.08) !important' : undefined
            }
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: theme === 'dark' ? '#111827' : undefined,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme === 'dark' ? 'rgba(71,85,105,0.6)' : undefined
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme === 'dark' ? 'rgba(59,130,246,0.7)' : undefined
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme === 'dark' ? '#3b82f6' : undefined
            }
          },
          input: {
            color: theme === 'dark' ? '#f8fafc' : undefined
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: theme === 'dark' ? '#94a3b8' : undefined
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundColor: theme === 'dark' ? '#1f2937' : undefined,
            border: theme === 'dark' ? '1px solid rgba(71,85,105,0.4)' : undefined
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 10
          }
        }
      }
    }
  }), [theme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <NotificationProvider>
          <BrowserRouter>
            <AuthProvider>
          <Routes>
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/new" element={<InvoiceForm />} />
              <Route path="invoices/edit/:id" element={<InvoiceForm />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="recurring" element={<RecurringInvoices />} />
              <Route
                path="admin/users"
                element={
                  <AdminRoute>
                    <UserManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/audit"
                element={
                  <AdminRoute>
                    <AuditLogs />
                  </AdminRoute>
                }
              />
            </Route>
          </Routes>
            </AuthProvider>
          </BrowserRouter>
        </NotificationProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
