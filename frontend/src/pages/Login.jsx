import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        background: 'radial-gradient(circle at 12% 20%, rgba(59,130,246,0.2), transparent 32%), radial-gradient(circle at 85% 5%, rgba(34,197,94,0.16), transparent 28%), linear-gradient(140deg, #0f172a 0%, #111827 60%, #0b1220 100%)'
      }}
    >
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card sx={{ width: '100%', maxWidth: 460, borderRadius: 4, boxShadow: '0 20px 45px rgba(2,6,23,0.4)' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} component="form" onSubmit={handleSubmit}>
              <Stack spacing={0.5} textAlign="center">
                <Typography variant="h4" color="text.primary">Welcome Back</Typography>
                <Typography variant="body2" color="text.secondary">Sign in to your AI Invoice workspace</Typography>
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Email Address"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
              />

              <TextField
                label="Password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
              />

              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <Typography textAlign="center" variant="body2">
                Need an account?{' '}
                <Link component={RouterLink} to="/register" fontWeight={600}>
                  Register
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default Login;
