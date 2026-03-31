import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Stack
} from '@mui/material';
import { clientService } from '../services/apiService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import AnimatedPage from '../components/AnimatedPage';
import FormError from '../components/FormError';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { validateRequired, validateEmail, validatePhone } from '../utils/validationHelpers';
import { BusinessOutlined as BusinessIcon } from '@mui/icons-material';
import { getAdminScopeUserId } from '../utils/adminScope';

const Clients = () => {
  const notify = useNotification();
  const { isAdmin } = useAuth();
  const scopeUserId = getAdminScopeUserId();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin && !scopeUserId) {
      setLoading(false);
      setClients([]);
      return;
    }

    fetchClients();
  }, [scopeUserId, isAdmin]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await clientService.getAll();
      if (response.success) {
        setClients(response.data);
        setCurrentPage(1);
      }
    } catch (error) {
      notify.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client = null) => {
    setErrors({});
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        company: client.company || ''
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setErrors({});
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: ''
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error for this field when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const nameValidation = validateRequired(formData.name, 'Name');
    if (!nameValidation.valid) newErrors.name = nameValidation.error;

    if (formData.email) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.valid) newErrors.email = emailValidation.error;
    }

    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) newErrors.phone = phoneValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      notify.error('Please fix the errors in the form');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        await clientService.update(editingClient.id, formData);
        notify.success('Client updated successfully');
      } else {
        await clientService.create(formData);
        notify.success('Client created successfully');
      }
      fetchClients();
      handleCloseModal();
    } catch (error) {
      notify.error(error.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientService.delete(id);
        notify.success('Client deleted successfully');
        fetchClients();
      } catch (error) {
        notify.error(error.message || 'Failed to delete client');
      }
    }
  };

  if (loading) {
    return (
      <AnimatedPage>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AnimatedPage>
    );
  }

  if (isAdmin && !scopeUserId) {
    return (
      <AnimatedPage>
        <EmptyState
          icon={BusinessIcon}
          title="Select a user"
          message="Choose a user from the top bar to manage clients."
        />
      </AnimatedPage>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(clients.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const displayedClients = clients.slice(startIdx, endIdx);

  return (
    <AnimatedPage>
      <Stack spacing={2.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
          <Stack spacing={0.5}>
            <Typography variant="h4" fontWeight={700} letterSpacing="-0.4px">
              Clients
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep your client records organized and up to date.
            </Typography>
          </Stack>
          <Button variant="contained" color="primary" onClick={() => handleOpenModal()}>
            Add Client
          </Button>
        </Box>

        {clients.length === 0 ? (
          <EmptyState
            icon={BusinessIcon}
            title="No clients found"
            message="Add your first client to get started"
            actionLabel="Add Client"
            onAction={() => handleOpenModal()}
          />
        ) : (
          <>
            <TableContainer
              component={Paper}
              sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
            >
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(15,118,110,0.08)' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedClients.map((client, index) => (
                    <TableRow
                      key={client.id}
                      component={motion.tr}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 * index }}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(15,118,110,0.04)'
                        }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{client.name}</TableCell>
                      <TableCell>{client.company || '-'}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>{client.phone || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                          <Button
                            size="small"
                            variant="text"
                            color="primary"
                            onClick={() => handleOpenModal(client)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={() => handleDelete(client.id)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

        <Dialog
          open={showModal}
          onClose={handleCloseModal}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <Box>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  error={!!errors.name}
                />
                <FormError error={!!errors.name} message={errors.name} />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                />
                <FormError error={!!errors.email} message={errors.email} />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={!!errors.phone}
                />
                <FormError error={!!errors.phone} message={errors.phone} />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  multiline
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingClient ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </AnimatedPage>
  );
};

export default Clients;
