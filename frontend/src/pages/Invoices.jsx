import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/apiService';
import { motion } from 'framer-motion';
import {
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import AnimatedPage from '../components/AnimatedPage';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { ReceiptOutlined as ReceiptIcon } from '@mui/icons-material';
import { formatCurrencyINR } from '../utils/currency';

const Invoices = () => {
  const navigate = useNavigate();
  const notify = useNotification();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState('issue_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortField, sortDirection]);

  const fetchInvoices = async () => {
    try {
      const response = await invoiceService.getAll();
      if (response.success) {
        setInvoices(response.data);
      }
    } catch (error) {
      notify.error(error.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoiceService.delete(id);
        notify.success('Invoice deleted successfully');
        setCurrentPage(1);
        fetchInvoices();
      } catch (error) {
        notify.error(error.message || 'Failed to delete invoice');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = invoices.filter((invoice) => {
      const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;

      if (!query) {
        return matchesStatus;
      }

      const searchable = [
        invoice.invoice_number,
        invoice.client_name,
        invoice.client_company,
        invoice.status,
        invoice.issue_date,
        invoice.due_date
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && searchable.includes(query);
    });

    return filtered.sort((a, b) => {
      let left = a[sortField];
      let right = b[sortField];

      if (sortField === 'total') {
        left = parseFloat(left || 0);
        right = parseFloat(right || 0);
      }

      if (sortField === 'issue_date' || sortField === 'due_date') {
        left = new Date(left).getTime();
        right = new Date(right).getTime();
      }

      if (typeof left === 'string') {
        left = left.toLowerCase();
      }
      if (typeof right === 'string') {
        right = right.toLowerCase();
      }

      if (left < right) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      if (left > right) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      return 0;
    });
  }, [invoices, searchTerm, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const displayedInvoices = filteredInvoices.slice(startIdx, endIdx);

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: 360 }}>
        <CircularProgress />
        <Typography>Loading invoices...</Typography>
      </Stack>
    );
  }

  return (
    <AnimatedPage>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Stack spacing={0.5}>
            <Typography variant="h4" fontWeight={700} letterSpacing="-0.4px">Invoices</Typography>
            <Typography variant="body2" color="text.secondary">
              Search, sort, and manage all issued invoices.
            </Typography>
          </Stack>
          <Button component={Link} to="/invoices/new" variant="contained">Create Invoice</Button>
        </Stack>

        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Invoice, client, status"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <FormControl sx={{ minWidth: { xs: '100%', md: 150 } }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: { xs: '100%', md: 170 } }}>
              <InputLabel>Sort By</InputLabel>
              <Select label="Sort By" value={sortField} onChange={(e) => setSortField(e.target.value)}>
                <MenuItem value="issue_date">Issue Date</MenuItem>
                <MenuItem value="due_date">Due Date</MenuItem>
                <MenuItem value="total">Total</MenuItem>
                <MenuItem value="client_name">Client</MenuItem>
                <MenuItem value="invoice_number">Invoice #</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </Stack>
        </Paper>

        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title="No invoices found"
            message="Create your first invoice to get started"
            actionLabel="Create Invoice"
            onAction={() => navigate('/invoices/new')}
          />
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <TableContainer
                component={Paper}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
              >
                <Table sx={{ minWidth: 860 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(15,118,110,0.08)' }}>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Issue Date</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedInvoices.map((invoice) => (
                      <TableRow key={invoice.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(15,118,110,0.04)' } }}>
                        <TableCell>
                          <Button component={Link} to={`/invoices/${invoice.id}`} variant="text" sx={{ fontWeight: 700 }}>
                            {invoice.invoice_number}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{invoice.client_name}</Typography>
                          {invoice.client_company && <Typography variant="caption" color="text.secondary">{invoice.client_company}</Typography>}
                        </TableCell>
                        <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{formatCurrencyINR(invoice.total || 0)}</TableCell>
                        <TableCell>
                          <Chip label={invoice.status} color={getStatusColor(invoice.status)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                            <Button component={Link} to={`/invoices/${invoice.id}`} size="small">View</Button>
                            <Button component={Link} to={`/invoices/edit/${invoice.id}`} size="small" color="secondary">Edit</Button>
                            <Button size="small" color="error" onClick={() => handleDelete(invoice.id)}>Delete</Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </motion.div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </Stack>
    </AnimatedPage>
  );
};

export default Invoices;
