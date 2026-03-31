import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Card,
  TextField,
  MenuItem,
  Typography,
  Stack,
  Paper,
  Grid,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { invoiceService, clientService } from '../services/apiService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import AnimatedPage from '../components/AnimatedPage';
import { validateInvoiceItems, validateDateRange } from '../utils/validationHelpers';
import { formatCurrencyINR } from '../utils/currency';
import { getAdminScopeUserId } from '../utils/adminScope';

const formatDateToIso = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayIsoDate = () => formatDateToIso(new Date());

const addDaysToIsoDate = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  date.setDate(date.getDate() + days);
  return formatDateToIso(date);
};

const normalizeToIsoDate = (value) => {
  if (!value || typeof value !== 'string') return '';

  // Keep browser-native yyyy-mm-dd unchanged.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Convert dd-mm-yyyy or dd/mm/yyyy to yyyy-mm-dd.
  const localDateMatch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (localDateMatch) {
    const [, day, month, year] = localDateMatch;
    return `${year}-${month}-${day}`;
  }

  return value;
};

const toDateInputValue = (value) => {
  const normalized = normalizeToIsoDate(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
};

const isoToDateObject = (value) => {
  const safeValue = toDateInputValue(value);
  if (!safeValue) return null;

  const date = new Date(`${safeValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const InvoiceForm = () => {
  const navigate = useNavigate();
  const notify = useNotification();
  const { id } = useParams();
  const isEditing = !!id;
  const { isAdmin } = useAuth();
  const scopeUserId = getAdminScopeUserId();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const initialIssueDate = getTodayIsoDate();
  const [formData, setFormData] = useState({
    client_id: '',
    issue_date: initialIssueDate,
    due_date: addDaysToIsoDate(initialIssueDate, 15),
    tax_rate: 0,
    notes: ''
  });
  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  useEffect(() => {
    if (isAdmin && !scopeUserId) {
      setLoading(false);
      setClients([]);
      return;
    }

    fetchClients();
    if (isEditing) {
      fetchInvoice();
    }
  }, [id, scopeUserId, isAdmin]);

  const fetchClients = async () => {
    try {
      const response = await clientService.getAll();
      if (response.success) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchInvoice = async () => {
    try {
      const response = await invoiceService.getOne(id);
      if (response.success) {
        const invoice = response.data;
        setFormData({
          client_id: invoice.client_id,
          issue_date: normalizeToIsoDate(invoice.issue_date),
          due_date: normalizeToIsoDate(invoice.due_date),
          tax_rate: invoice.tax_rate,
          notes: invoice.notes || ''
        });
        setItems(invoice.items.length > 0 ? invoice.items : [{ description: '', quantity: 1, unit_price: 0 }]);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
      notify.error(error.message || 'Failed to load invoice for editing');
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin && !scopeUserId) {
    return (
      <AnimatedPage>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="600" mb={1}>
            Select a user
          </Typography>
          <Typography color="text.secondary">
            Choose a user from the top bar to create or edit invoices.
          </Typography>
        </Card>
      </AnimatedPage>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleIssueDateChange = (newValue) => {
    const issueDate = formatDateToIso(newValue);

    setFormData((prev) => {
      const currentDueDate = toDateInputValue(prev.due_date);
      const shouldAdjustDueDate = !currentDueDate || (issueDate && currentDueDate < issueDate);

      return {
        ...prev,
        issue_date: issueDate,
        due_date: shouldAdjustDueDate ? addDaysToIsoDate(issueDate, 15) : currentDueDate
      };
    });
  };

  const handleDueDateChange = (newValue) => {
    const dueDate = formatDateToIso(newValue);
    setFormData((prev) => ({
      ...prev,
      due_date: dueDate
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (parseFloat(formData.tax_rate) || 0) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_id) {
      notify.error('Please select a client');
      return;
    }

    if (!formData.due_date) {
      notify.error('Due date is required');
      return;
    }

    // Validate date range
    const dateRangeValidation = validateDateRange(formData.issue_date, formData.due_date);
    if (!dateRangeValidation.valid) {
      notify.error(dateRangeValidation.error);
      return;
    }

    // Validate items
    const itemsValidation = validateInvoiceItems(items);
    if (!itemsValidation.valid) {
      const firstError = Object.values(itemsValidation.errors)[0];
      notify.error(firstError);
      return;
    }

    const invoiceData = {
      ...formData,
      issue_date: toDateInputValue(formData.issue_date),
      due_date: toDateInputValue(formData.due_date),
      items: items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price)
      }))
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await invoiceService.update(id, invoiceData);
        notify.success('Invoice updated successfully');
      } else {
        await invoiceService.create(invoiceData);
        notify.success('Invoice created successfully');
      }
      navigate('/invoices');
    } catch (error) {
      notify.error(error.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
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

  return (
    <AnimatedPage>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Stack spacing={3}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Typography variant="h4" fontWeight="700" letterSpacing="-0.5px" sx={{ color: 'text.primary' }}>
              {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card sx={{
              p: { xs: 2.5, sm: 3, md: 4 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                transition: 'all 0.3s ease'
              }
            }}>
              <form onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  {/* Main Info Grid */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                      <Grid item xs={12} sm={6} md={6}>
                        <TextField
                          select
                          fullWidth
                          required
                          label="Client"
                          name="client_id"
                          value={formData.client_id}
                          onChange={handleChange}
                          InputLabelProps={{ shrink: true }}
                          SelectProps={{
                            displayEmpty: true,
                            renderValue: (selected) => {
                              if (!selected) {
                                return (
                                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    Select Client
                                  </Box>
                                );
                              }

                              const selectedClient = clients.find((client) => String(client.id) === String(selected));
                              return selectedClient
                                ? `${selectedClient.name}${selectedClient.company ? ` (${selectedClient.company})` : ''}`
                                : 'Select Client';
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1
                            },
                            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              transition: 'border-color 0.3s ease'
                            },
                            '& .MuiSelect-select': {
                              fontWeight: 500
                            }
                          }}
                        >
                          <MenuItem value="">Select Client</MenuItem>
                          {clients.map((client) => (
                            <MenuItem key={client.id} value={client.id}>
                              {client.name} {client.company ? `(${client.company})` : ''}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} sm={6} md={6}>
                        <TextField
                          fullWidth
                          label="Tax Rate (%)"
                          type="number"
                          inputProps={{ step: '0.01', min: '0' }}
                          name="tax_rate"
                          value={formData.tax_rate}
                          onChange={handleChange}
                          sx={{
                            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              transition: 'border-color 0.3s ease'
                            }
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={6}>
                        <DatePicker
                          label="Issue Date"
                          value={isoToDateObject(formData.issue_date)}
                          onChange={handleIssueDateChange}
                          minDate={new Date('2000-01-01T00:00:00')}
                          maxDate={new Date('2100-12-31T00:00:00')}
                          format="dd-MM-yyyy"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              sx: {
                                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main',
                                  transition: 'border-color 0.3s ease'
                                }
                              }
                            }
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={6}>
                        <DatePicker
                          label="Due Date"
                          value={isoToDateObject(formData.due_date)}
                          onChange={handleDueDateChange}
                          minDate={isoToDateObject(formData.issue_date) || new Date('2000-01-01T00:00:00')}
                          maxDate={new Date('2100-12-31T00:00:00')}
                          format="dd-MM-yyyy"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              sx: {
                                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main',
                                  transition: 'border-color 0.3s ease'
                                }
                              }
                            }
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Notes"
                          name="notes"
                          multiline
                          rows={3}
                          value={formData.notes}
                          onChange={handleChange}
                          sx={{
                            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              transition: 'border-color 0.3s ease'
                            }
                          }}
                        />
                      </Grid>
                    </Grid>
                  </motion.div>

              <Divider sx={{ my: 1 }} />

              {/* Line Items */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                    <Typography variant="h6" fontWeight="700" letterSpacing="-0.3px">
                      Line Items
                    </Typography>
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={addItem}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 1,
                        px: 2,
                        '&:hover': {
                          backgroundColor: 'success.50',
                          borderColor: 'success.main',
                          transition: 'all 0.3s ease'
                        }
                      }}
                    >
                      Add Item
                    </Button>
                  </Box>

                  <Stack spacing={2}>
                    {items.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * index }}
                        whileHover={{ y: -2 }}
                      >
                        <Paper sx={{
                          p: 2.5,
                          backgroundColor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: 'primary.light',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                          }
                        }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={5}>
                              <TextField
                                fullWidth
                                label="Description"
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                required
                                size="small"
                                sx={{
                                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    transition: 'border-color 0.3s ease'
                                  }
                                }}
                              />
                            </Grid>

                            <Grid item xs={4} sm={2}>
                              <TextField
                                fullWidth
                                label="Quantity"
                                type="number"
                                inputProps={{ min: '1' }}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                required
                                size="small"
                                sx={{
                                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    transition: 'border-color 0.3s ease'
                                  }
                                }}
                              />
                            </Grid>

                            <Grid item xs={4} sm={2}>
                              <TextField
                                fullWidth
                                label="Unit Price"
                                type="number"
                                inputProps={{ step: '0.01', min: '0' }}
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                required
                                size="small"
                                sx={{
                                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    transition: 'border-color 0.3s ease'
                                  }
                                }}
                              />
                            </Grid>

                            <Grid item xs={4} sm={2}>
                              <Box sx={{
                                p: 1.2,
                                backgroundColor: 'action.hover',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                textAlign: 'center',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Typography variant="body2" fontWeight="600" color="primary">
                                  {formatCurrencyINR((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                                </Typography>
                              </Box>
                            </Grid>

                            <Grid item xs={4} sm={1} display="flex" justifyContent="center">
                              {items.length > 1 && (
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeItem(index)}
                                    sx={{
                                      '&:hover': {
                                        backgroundColor: 'error.50',
                                        transition: 'all 0.3s ease'
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </motion.div>
                              )}
                            </Grid>
                          </Grid>
                        </Paper>
                      </motion.div>
                    ))}
                  </Stack>
                </Box>
              </motion.div>

              <Divider sx={{ my: 2 }} />

              {/* Summary */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Box display="flex" justifyContent="flex-end">
                  <Paper sx={{
                    p: { xs: 2.5, sm: 3 },
                    width: { xs: '100%', sm: '320px' },
                    backgroundColor: 'background.paper',
                    border: '2px solid',
                    borderColor: 'primary.light',
                    borderRadius: 2,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                      borderColor: 'primary.main',
                      transition: 'all 0.3s ease'
                    }
                  }}>
                    <Stack spacing={1.5}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="textSecondary" fontWeight="500">
                          Subtotal:
                        </Typography>
                        <Typography variant="body2" fontWeight="600" color="text.primary">
                          {formatCurrencyINR(calculateSubtotal())}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="textSecondary" fontWeight="500">
                          Tax ({formData.tax_rate}%):
                        </Typography>
                        <Typography variant="body2" fontWeight="600" color="text.primary">
                          {formatCurrencyINR(calculateTax())}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight="700" letterSpacing="-0.3px">
                          Total:
                        </Typography>
                        <Typography variant="h6" fontWeight="700" color="primary" letterSpacing="-0.3px">
                          {formatCurrencyINR(calculateTotal())}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <Box display="flex" justifyContent="flex-end" gap={2} pt={2}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/invoices')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 1,
                      px: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={submitting}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 1,
                        px: 4,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(15,118,110,0.25)'
                        }
                      }}
                    >
                      {submitting ? 'Saving...' : isEditing ? 'Update Invoice' : 'Create Invoice'}
                    </Button>
                  </motion.div>
                </Box>
              </motion.div>
            </Stack>
          </form>
        </Card>
      </motion.div>
      </Stack>
    </motion.div>
    </AnimatedPage>
  );
};

export default InvoiceForm;
