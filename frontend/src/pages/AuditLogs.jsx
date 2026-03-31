import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { auditService } from '../services/apiService';
import AnimatedPage from '../components/AnimatedPage';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatAuditDateTime = (value) => {
    if (!value) return '-';

    const raw = String(value);

    const match = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, datePart, hh, mm, ss] = match;
      let hours = Number(hh);
      if (Number.isNaN(hours)) return raw;

      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours %= 12;
      if (hours === 0) hours = 12;

      const hh12 = String(hours).padStart(2, '0');
      return `${datePart} ${hh12}:${mm}:${ss} ${ampm}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');

      let hours = parsed.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours %= 12;
      if (hours === 0) hours = 12;

      const hh12 = String(hours).padStart(2, '0');
      const mm = String(parsed.getMinutes()).padStart(2, '0');
      const ss = String(parsed.getSeconds()).padStart(2, '0');

      return `${y}-${m}-${d} ${hh12}:${mm}:${ss} ${ampm}`;
    }

    return raw;
  };

  const formatAuditDateTimeMultiline = (value) => {
    const formatted = formatAuditDateTime(value);
    const match = String(formatted).match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    if (!match) return formatted;
    return `${match[1]}\n${match[2]}`;
  };

  const getActionColor = (action) => {
    switch (String(action || '').toUpperCase()) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'info';
      case 'DELETE':
        return 'error';
      case 'LOGIN':
        return 'success';
      case 'LOGOUT':
        return 'default';
      default:
        return 'default';
    }
  };

  const toTitleWords = (value) => {
    const text = String(value || '').trim();
    if (!text) return '-';

    return text
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatActionLabel = (action) => toTitleWords(action);

  const formatEntityLabel = (entity) => toTitleWords(entity);

  const formatDetailsText = (details) => {
    if (details === null || details === undefined || details === '') {
      return '-';
    }

    const raw = String(details);
    try {
      const parsed = JSON.parse(raw);

      if (parsed === null) {
        return '-';
      }

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).join(', ');
      }

      if (typeof parsed === 'object') {
        const entries = Object.entries(parsed);
        if (entries.length === 0) {
          return '-';
        }

        return entries
          .map(([key, value]) => {
            const label = toTitleWords(key);
            if (Array.isArray(value)) {
              return `${label}: ${value.join(', ')}`;
            }
            if (value && typeof value === 'object') {
              return `${label}: ${JSON.stringify(value)}`;
            }
            return `${label}: ${String(value)}`;
          })
          .join('\n');
      }

      return String(parsed);
    } catch {
      return raw;
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await auditService.getLogs(200);
      if (response.success) {
        setLogs(response.data || []);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const rows = useMemo(() => logs || [], [logs]);

  const escapeCsvValue = (value) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleDownloadCsv = () => {
    if (!rows.length) return;

    const headers = ['Date Time', 'User', 'Action', 'Entity', 'Entity ID', 'Details'];
    const csvLines = [headers.join(',')];

    rows.forEach((log) => {
      const entityIdValue = log?.entity_id;
      const entityIdText = entityIdValue === 0 || entityIdValue ? String(entityIdValue) : '-';

      const fields = [
        formatAuditDateTime(log?.created_at),
        log?.full_name || 'System',
        formatActionLabel(log?.action),
        formatEntityLabel(log?.entity_type),
        entityIdText,
        formatDetailsText(log?.details)
      ];

      csvLines.push(fields.map(escapeCsvValue).join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      <Stack spacing={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="h4" fontWeight="600">
            Audit Logs
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadCsv}
              disabled={!rows.length}
            >
              Download CSV
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadLogs}>
              Refresh
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ tableLayout: 'auto', minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: { xs: 150, md: 170 } }}>Date &amp; Time</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 90 }}>Entity ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((log, index) => {
                  const entityIdValue = log?.entity_id;
                  const entityIdText =
                    entityIdValue === 0 || entityIdValue
                      ? String(entityIdValue)
                      : '';

                  const detailsText = formatDetailsText(log?.details);

                  return (
                    <TableRow
                      key={log?.id ?? `${log?.created_at ?? 'row'}-${index}`}
                      component={motion.tr}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.02 * index }}
                    >
                      <TableCell
                        sx={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '12px',
                          whiteSpace: 'pre-line',
                          lineHeight: 1.25
                        }}
                      >
                        {formatAuditDateTimeMultiline(log?.created_at)}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {log?.full_name || 'System'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={formatActionLabel(log?.action)}
                          color={getActionColor(log?.action)}
                          size="small"
                          variant="filled"
                          sx={{
                            maxWidth: '100%',
                            '& .MuiChip-label': {
                              whiteSpace: 'normal',
                              display: 'block',
                              py: 0.25
                            }
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {formatEntityLabel(log?.entity_type)}
                      </TableCell>

                      <TableCell>
                        {entityIdText ? (
                          entityIdText
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            -
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell
                        sx={{
                          fontSize: '12px',
                          whiteSpace: 'pre-line',
                          wordBreak: 'break-word',
                          lineHeight: 1.4
                        }}
                      >
                        {detailsText !== '-' ? (
                          detailsText
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {rows.length === 0 && (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">No audit logs available.</Typography>
            </Box>
          )}
        </Card>
      </Stack>
    </AnimatedPage>
  );
};

export default AuditLogs;
