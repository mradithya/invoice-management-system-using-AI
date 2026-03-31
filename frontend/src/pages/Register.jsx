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

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
        background: 'radial-gradient(circle at 88% 15%, rgba(34,197,94,0.16), transparent 32%), radial-gradient(circle at 15% 82%, rgba(59,130,246,0.2), transparent 30%), linear-gradient(140deg, #0f172a 0%, #111827 55%, #0b1220 100%)'
      }}
    >
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card sx={{ width: '100%', maxWidth: 500, borderRadius: 4, boxShadow: '0 22px 48px rgba(2,6,23,0.4)' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2.25} component="form" onSubmit={handleSubmit}>
              <Stack spacing={0.5} textAlign="center">
                <Typography variant="h4" color="text.primary">Create Account</Typography>
                <Typography variant="body2" color="text.secondary">Start managing invoices with smarter analytics</Typography>
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Full Name"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
              />

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

              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
              />

              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Creating account...' : 'Register'}
              </Button>

              <Typography textAlign="center" variant="body2">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login" fontWeight={600}>
                  Sign in
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default Register;
