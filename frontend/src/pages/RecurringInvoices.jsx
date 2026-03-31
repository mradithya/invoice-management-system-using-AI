import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Card,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Grid,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Pause as PauseIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { clientService, recurringService } from '../services/apiService';
import { useNotification } from '../context/NotificationContext';
import AnimatedPage from '../components/AnimatedPage';
import { useAuth } from '../context/AuthContext';
import { getAdminScopeUserId } from '../utils/adminScope';

const defaultItem = { description: '', quantity: 1, unit_price: 0 };
const formatDateTimeLocal = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getCurrentDateTimeLocal = () => formatDateTimeLocal(new Date());

const formatRunDateTime = (value) => {
  if (!value || typeof value !== 'string') {
    return '-';
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const RecurringInvoices = () => {
  const notify = useNotification();
  const { isAdmin } = useAuth();
  const scopeUserId = getAdminScopeUserId();
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [formData, setFormData] = useState({
    template_name: '',
    client_id: '',
    frequency: 'monthly',
    interval_hours: 1,
    due_after_days: 15,
    tax_rate: 0,
    next_run_date: getCurrentDateTimeLocal(),
    notes: '',
    is_active: 1
  });
  const [items, setItems] = useState([defaultItem]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, clientsRes] = await Promise.all([
        recurringService.getAll(),
        clientService.getAll()
      ]);

      if (templatesRes.success) {
        setTemplates(templatesRes.data);
      }

      if (clientsRes.success) {
        setClients(clientsRes.data);
      }
    } catch (error) {
      notify.error(error.message || 'Failed to load recurring invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && !scopeUserId) {
      setLoading(false);
      setTemplates([]);
      setClients([]);
      return;
    }

    loadData();
  }, [scopeUserId, isAdmin]);

  const onChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onItemChange = (index, key, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...defaultItem }]);
  };

  const removeItem = (index) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const createTemplate = async (e) => {
    e.preventDefault();

    if (!formData.client_id) {
      notify.error('Please select a client');
      return;
    }

    if (items.some((item) => !item.description || Number(item.quantity) <= 0 || Number(item.unit_price) < 0)) {
      notify.error('Please fill all line items correctly');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        client_id: Number(formData.client_id),
        interval_hours: Number(formData.interval_hours || 1),
        due_after_days: Number(formData.due_after_days),
        tax_rate: Number(formData.tax_rate),
        is_active: Number(formData.is_active),
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price)
        }))
      };

      const response = await recurringService.create(payload);
      if (response.success) {
        notify.success('Recurring template created successfully');
        setFormData({
          template_name: '',
          client_id: '',
          frequency: 'monthly',
          interval_hours: 1,
          due_after_days: 15,
          tax_rate: 0,
          next_run_date: getCurrentDateTimeLocal(),
          notes: '',
          is_active: 1
        });
        setItems([{ ...defaultItem }]);
        await loadData();
      }
    } catch (error) {
      notify.error(error.message || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (template) => {
    try {
      await recurringService.update(template.id, {
        ...template,
        is_active: template.is_active ? 0 : 1,
        items: template.items || []
      });
      notify.success('Template updated successfully');
      await loadData();
    } catch (error) {
      notify.error(error.message || 'Failed to update template');
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this recurring template?')) {
      return;
    }

    try {
      await recurringService.delete(id);
      notify.success('Template deleted successfully');
      await loadData();
    } catch (error) {
      notify.error(error.message || 'Failed to delete template');
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const response = await recurringService.runNow();
      if (response.success) {
        notify.success(`Generated ${response.data.created_count} invoice(s)`);
      }
    } catch (error) {
      notify.error(error.message || 'Failed to process recurring templates');
    } finally {
      setRunning(false);
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
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="600" mb={1}>
            Select a user
          </Typography>
          <Typography color="text.secondary">
            Choose a user from the top bar to manage recurring invoices.
          </Typography>
        </Card>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <Stack spacing={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="h4" fontWeight="600">
            Recurring Invoices
          </Typography>
          <Button
            variant="contained"
            color="success"
            onClick={runNow}
            disabled={running}
          >
            {running ? 'Processing...' : 'Run Now'}
          </Button>
        </Box>

        {/* Template Form */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" mb={2}>
            Create Recurring Template
          </Typography>
          <form onSubmit={createTemplate}>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Template Name"
                    placeholder="e.g., Monthly Retainer"
                    name="template_name"
                    value={formData.template_name}
                    onChange={onChange}
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    required
                    size="small"
                    label="Client"
                    name="client_id"
                    value={formData.client_id}
                    onChange={onChange}
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected) {
                          return <span style={{ color: 'rgba(148, 163, 184, 0.95)' }}>Select Client</span>;
                        }

                        const selectedClient = clients.find((c) => String(c.id) === String(selected));
                        return selectedClient ? selectedClient.name : 'Select Client';
                      }
                    }}
                    sx={{
                      minWidth: { xs: '100%', md: 220 },
                      '& .MuiInputBase-root': {
                        borderRadius: 1.5
                      }
                    }}
                  >
                    <MenuItem value="">Select Client</MenuItem>
                    {clients.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      name="frequency"
                      value={formData.frequency}
                      onChange={onChange}
                      label="Frequency"
                    >
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="is_active"
                      value={formData.is_active}
                      onChange={onChange}
                      label="Status"
                    >
                      <MenuItem value={1}>Active</MenuItem>
                      <MenuItem value={0}>Paused</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                {formData.frequency === 'hourly' && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Every (hours)"
                      type="number"
                      inputProps={{ min: '1', max: '720' }}
                      name="interval_hours"
                      value={formData.interval_hours}
                      onChange={onChange}
                      size="small"
                    />
                  </Grid>
                )}
                {formData.frequency !== 'hourly' && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Due After (days)"
                      type="number"
                      inputProps={{ min: '1', max: '90' }}
                      name="due_after_days"
                      value={formData.due_after_days}
                      onChange={onChange}
                      size="small"
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Tax Rate (%)"
                    type="number"
                    inputProps={{ step: '0.01', min: '0' }}
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={onChange}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Next Run Date & Time"
                    type="datetime-local"
                    name="next_run_date"
                    value={formData.next_run_date}
                    onChange={onChange}
                    size="small"
                    required
                    inputProps={{ step: 60 }}
                    helperText="Select date with hour and minute"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                name="notes"
                value={formData.notes}
                onChange={onChange}
                size="small"
              />

              {/* Line Items */}
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight="600">Line Items</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<AddIcon />}
                    onClick={addItem}
                  >
                    Add
                  </Button>
                </Box>
                <Stack spacing={1}>
                  {items.map((item, index) => (
                    <Grid container spacing={1} key={index} alignItems="flex-end">
                      <Grid item xs={12} sm={5}>
                        <TextField
                          fullWidth
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => onItemChange(index, 'description', e.target.value)}
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField
                          fullWidth
                          label="Quantity"
                          type="number"
                          inputProps={{ min: '1' }}
                          value={item.quantity}
                          onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField
                          fullWidth
                          label="Unit Price"
                          type="number"
                          inputProps={{ step: '0.01', min: '0' }}
                          value={item.unit_price}
                          onChange={(e) => onItemChange(index, 'unit_price', e.target.value)}
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={3} display="flex" gap={1}>
                        {items.length > 1 && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => removeItem(index)}
                            fullWidth
                          >
                            Remove
                          </Button>
                        )}
                      </Grid>
                    </Grid>
                  ))}
                </Stack>
              </Box>

              <Box display="flex" justifyContent="flex-end" pt={1}>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Create Template'}
                </Button>
              </Box>
            </Stack>
          </form>
        </Card>

        {/* Templates Table */}
        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Template</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Frequency</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Next Run</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((template, index) => (
                  <TableRow
                    key={template.id}
                    component={motion.tr}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 * index }}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transition: 'background-color 220ms ease'
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{template.template_name}</TableCell>
                    <TableCell>{template.client_name || '-'}</TableCell>
                    <TableCell>
                      <Chip label={template.frequency} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{formatRunDateTime(template.next_run_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={template.is_active ? 'Active' : 'Paused'}
                        color={template.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color={template.is_active ? 'warning' : 'success'}
                          onClick={() => toggleActive(template)}
                          title={template.is_active ? 'Pause' : 'Activate'}
                        >
                          {template.is_active ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {templates.length === 0 && (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">No recurring templates yet.</Typography>
            </Box>
          )}
        </Card>
      </Stack>
    </AnimatedPage>
  );
};

export default RecurringInvoices;
