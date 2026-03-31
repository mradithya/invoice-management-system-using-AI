import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Grid,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { Email as EmailIcon, GetApp as DownloadIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { invoiceService, paymentService } from '../services/apiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import AnimatedPage from '../components/AnimatedPage';
import { formatCurrencyINR } from '../utils/currency';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchInvoiceDetails();
    fetchPayments();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    try {
      const response = await invoiceService.getOne(id);
      if (response.success) {
        setInvoice(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await paymentService.getByInvoice(id);
      if (response.success) {
        setPayments(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const handlePaymentChange = (e) => {
    setPaymentData({
      ...paymentData,
      [e.target.name]: e.target.value
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    try {
      await paymentService.create({
        invoice_id: parseInt(id),
        ...paymentData,
        amount: parseFloat(paymentData.amount)
      });
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        reference_number: '',
        notes: ''
      });
      fetchInvoiceDetails();
      fetchPayments();
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment');
    }
  };

  const getTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  };

  const getBalance = () => {
    if (!invoice) return 0;
    return parseFloat(invoice.total) - getTotalPaid();
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

  const formatCurrencyForPdf = (value) => {
    const amount = Number(value || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `INR ${safeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportPdf = () => {
    if (!invoice) {
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    doc.setFontSize(18);
    doc.text('Invoice', 14, 20);

    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 14, 30);
    doc.text(`Status: ${invoice.status}`, 14, 37);
    doc.text(`Issue Date: ${invoice.issue_date}`, 14, 44);
    doc.text(`Due Date: ${invoice.due_date}`, 14, 51);

    doc.text(`Client: ${invoice.client_name || '-'}`, 14, 62);
    doc.text(`Company: ${invoice.client_company || '-'}`, 14, 69);
    doc.text(`Email: ${invoice.client_email || '-'}`, 14, 76);

    autoTable(doc, {
      startY: 84,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: invoice.items.map((item) => [
        item.description,
        String(item.quantity),
        formatCurrencyForPdf(parseFloat(item.unit_price)),
        formatCurrencyForPdf(parseFloat(item.total))
      ])
    });

    const paid = getTotalPaid();
    const balance = getBalance();
    const summaryY = doc.lastAutoTable.finalY + 12;

    doc.text(`Subtotal: ${formatCurrencyForPdf(parseFloat(invoice.subtotal))}`, 140, summaryY);
    doc.text(`Tax (${invoice.tax_rate}%): ${formatCurrencyForPdf(parseFloat(invoice.tax_amount))}`, 140, summaryY + 7);
    doc.text(`Total: ${formatCurrencyForPdf(parseFloat(invoice.total))}`, 140, summaryY + 14);
    doc.text(`Paid: ${formatCurrencyForPdf(paid)}`, 140, summaryY + 21);
    doc.text(`Balance: ${formatCurrencyForPdf(balance)}`, 140, summaryY + 28);

    if (invoice.notes && String(invoice.notes).trim()) {
      const notesTitleY = summaryY + 42;
      const notesText = String(invoice.notes).trim();
      const wrappedNotes = doc.splitTextToSize(notesText, 182);

      doc.setFontSize(12);
      doc.text('Notes:', 14, notesTitleY);
      doc.setFontSize(11);
      doc.text(wrappedNotes, 14, notesTitleY + 7);
    }

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const handleSendEmail = async () => {
    const defaultEmail = invoice?.client_email || '';
    const to = window.prompt('Send invoice to email address:', defaultEmail);

    if (!to) {
      return;
    }

    try {
      setSendingEmail(true);
      await invoiceService.sendEmail(id, {
        to,
        subject: `Invoice ${invoice.invoice_number}`
      });
      alert('Invoice email sent successfully');
    } catch (error) {
      alert(error.message || 'Failed to send invoice email');
    } finally {
      setSendingEmail(false);
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

  if (!invoice) {
    return (
      <AnimatedPage>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">Invoice not found</Typography>
        </Card>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="h4" fontWeight="600">Invoice Details</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" width={{ xs: '100%', sm: 'auto' }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<EmailIcon />}
              onClick={handleSendEmail}
              disabled={sendingEmail}
              size="small"
            >
              {sendingEmail ? 'Sending...' : 'Email'}
            </Button>
            <Button
              variant="contained"
              color="info"
              startIcon={<DownloadIcon />}
              onClick={handleExportPdf}
              size="small"
            >
              PDF
            </Button>
            <Button
              component={Link}
              to={`/invoices/edit/${id}`}
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              size="small"
            >
              Edit
            </Button>
            <Button
              onClick={() => navigate('/invoices')}
              startIcon={<ArrowBackIcon />}
              size="small"
            >
              Back
            </Button>
          </Box>
        </Box>

        {/* Invoice Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card sx={{ p: 3 }}>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h5" fontWeight="600" mb={1}>
                  {invoice.invoice_number}
                </Typography>
                <Chip
                  label={invoice.status}
                  color={getStatusColor(invoice.status)}
                  variant="filled"
                />
              </Grid>
              <Grid item xs={12} sm={6} textAlign={{ xs: 'left', sm: 'right' }}>
                <Typography variant="body2" color="textSecondary">Issue Date</Typography>
                <Typography fontWeight="500">{invoice.issue_date}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Due Date</Typography>
                <Typography fontWeight="500">{invoice.due_date}</Typography>
              </Grid>
            </Grid>

            <Box mb={3} pb={3} borderBottom="1px solid #e0e0e0">
              <Typography variant="subtitle2" fontWeight="600" mb={1}>Bill To:</Typography>
              <Typography fontWeight="500">{invoice.client_name}</Typography>
              {invoice.client_company && (<Typography color="textSecondary">{invoice.client_company}</Typography>)}
              {invoice.client_email && (<Typography color="textSecondary">{invoice.client_email}</Typography>)}
              {invoice.client_phone && (<Typography color="textSecondary">{invoice.client_phone}</Typography>)}
              {invoice.client_address && (<Typography color="textSecondary">{invoice.client_address}</Typography>)}
            </Box>

            {/* Items Table */}
            <Typography variant="subtitle2" fontWeight="600" mb={2}>Invoice Items</Typography>
            <TableContainer
              component={Paper}
              sx={{
                mb: 2,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                overflowX: 'auto'
              }}
            >
              <Table size="small" sx={{ minWidth: 620 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: 'text.primary' }}>{item.description}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.primary' }}>{item.quantity}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.primary' }}>{formatCurrencyINR(parseFloat(item.unit_price))}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 600 }}>{formatCurrencyINR(parseFloat(item.total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary */}
            <Box display="flex" justifyContent="flex-end">
              <Paper
                sx={{
                  p: 2,
                  width: { xs: '100%', sm: '300px' },
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="textSecondary">Subtotal:</Typography>
                    <Typography variant="body2" fontWeight="500">{formatCurrencyINR(parseFloat(invoice.subtotal))}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="textSecondary">Tax ({invoice.tax_rate}%):</Typography>
                    <Typography variant="body2" fontWeight="500">{formatCurrencyINR(parseFloat(invoice.tax_amount))}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" borderTop="1px solid" borderColor="divider" pt={1}>
                    <Typography variant="h6" fontWeight="600">Total:</Typography>
                    <Typography variant="h6" fontWeight="600">{formatCurrencyINR(parseFloat(invoice.total))}</Typography>
                  </Box>
                  {payments.length > 0 && (
                    <>
                      <Box display="flex" justifyContent="space-between" sx={{ color: 'success.main' }}>
                        <Typography variant="body2">Paid:</Typography>
                        <Typography variant="body2" fontWeight="500">-{formatCurrencyINR(getTotalPaid())}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" borderTop="1px solid" borderColor="divider" pt={1}>
                        <Typography variant="subtitle2" fontWeight="600">Balance Due:</Typography>
                        <Typography
                          variant="subtitle2"
                          fontWeight="600"
                          sx={{ color: getBalance() > 0 ? 'error.main' : 'success.main' }}
                        >
                          {formatCurrencyINR(getBalance())}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              </Paper>
            </Box>

            {invoice.notes && (
              <Box mt={3} pt={3} borderTop="1px solid #e0e0e0">
                <Typography variant="subtitle2" fontWeight="600" mb={1}>Notes</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {invoice.notes}
                </Typography>
              </Box>
            )}
          </Card>
        </motion.div>

        {/* Payment History */}
        <Card sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="600">Payment History</Typography>
            {invoice.status !== 'Paid' && (
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => setShowPaymentModal(true)}
              >
                Record Payment
              </Button>
            )}
          </Box>

          {payments.length === 0 ? (
            <Typography color="textSecondary">No payments recorded yet</Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 500 }}>
                        {formatCurrencyINR(parseFloat(payment.amount))}
                      </TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>{payment.reference_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onClose={() => setShowPaymentModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                inputProps={{ step: '0.01', max: getBalance() }}
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                required
                InputAdornment
                startAdornment={<InputAdornment position="start">₹</InputAdornment>}
                helperText={`Balance due: ${formatCurrencyINR(getBalance())}`}
              />
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <FormControl fullWidth required>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  label="Payment Method"
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Check">Check</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="Credit Card">Credit Card</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Reference Number"
                value={paymentData.reference_number}
                onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
              />
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button
              onClick={handlePaymentSubmit}
              variant="contained"
              color="primary"
            >
              Record
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </AnimatedPage>
  );
};

export default InvoiceDetail;
