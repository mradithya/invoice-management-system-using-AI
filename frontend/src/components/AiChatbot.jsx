import React, { useEffect, useRef, useState } from 'react';
import { clientService, dashboardService, invoiceService } from '../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Fab,
  IconButton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { formatCurrencyINR } from '../utils/currency';
import { downloadReceivablesCsv, downloadReceivablesPdf } from '../utils/exportHelpers';

const DEFAULT_DUE_DAYS = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const INTENT_KEYWORDS = {
  createInvoice: ['create', 'make', 'generate', 'raise', 'new', 'draft', 'invoice', 'bill'],
  createClient: ['create', 'add', 'new', 'register', 'client', 'customer'],
  followUp: ['follow', 'followup', 'follow-up', 'remind', 'reminder', 'nudge', 'chase'],
  export: ['download', 'export', 'report', 'save', 'file', 'csv', 'pdf'],
  overdue: ['overdue', 'late', 'delay', 'delayed', 'unpaid', 'pending', 'outstanding', 'due'],
  topClients: ['top', 'best', 'highest', 'biggest', 'clients', 'client', 'customers', 'customer'],
  riskyClients: ['risky', 'risk', 'defaulter', 'defaulters', 'late payer', 'late payers'],
  summary: ['health', 'score', 'summary', 'overview', 'dashboard', 'status', 'performance']
};

const starterMessages = [
  {
    role: 'assistant',
    text: 'Hi! I can answer dashboard queries, create clients, draft invoices, generate payment follow-ups, and export receivables. Try: "create client named Rahul", "overdue above 50000", "top 5 clients this quarter", "create invoice for Acme with Design x 1 at 25000 due in 10 days", "generate payment follow-up", or "download receivables csv/pdf".'
  }
];

const toStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (baseDate, days) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
};

const parseDate = (rawValue) => {
  if (!rawValue || typeof rawValue !== 'string') {
    return null;
  }

  const value = rawValue.trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (value === 'today') return toStartOfDay(new Date());
  if (value === 'tomorrow') return toStartOfDay(addDays(new Date(), 1));

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const localMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : toStartOfDay(parsed);
};

const parseAmount = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (!value || typeof value !== 'string') {
    return null;
  }

  const compact = value
    .toLowerCase()
    .replace(/inr|rs\.?|₹/g, '')
    .replace(/,/g, '')
    .trim();

  const numberMatch = compact.match(/-?\d+(?:\.\d+)?/);
  if (!numberMatch) {
    return null;
  }

  let amount = Number(numberMatch[0]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  if (/(crore|cr)\b/.test(compact)) amount *= 10000000;
  else if (/(lakh|lac)\b/.test(compact)) amount *= 100000;
  else if (/\bk\b/.test(compact)) amount *= 1000;
  else if (/\bm\b/.test(compact)) amount *= 1000000;

  return amount;
};

const parseTopLimit = (query) => {
  const digitMatch = query.match(/top\s+(\d{1,2})/i);
  if (digitMatch) {
    return Math.max(1, Math.min(20, Number(digitMatch[1])));
  }

  const words = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10
  };
  const wordMatch = query.toLowerCase().match(/top\s+(one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (wordMatch) {
    return words[wordMatch[1]];
  }

  return 5;
};

const parseOverdueDays = (query) => {
  const daysMatch = query.match(/(\d{1,3})\s*days?/i);
  if (!daysMatch) {
    return 0;
  }
  const parsed = Number(daysMatch[1]);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[.,!?()[\]{}:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) => normalizeText(value).split(' ').filter(Boolean);

const containsAnyKeyword = (text, keywords) => {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(keyword));
};

const scoreIntent = (text, keywords) => {
  const normalized = normalizeText(text);
  const tokens = tokenize(text);
  let score = 0;

  keywords.forEach((keyword) => {
    if (normalized.includes(keyword)) {
      score += keyword.includes(' ') ? 2 : 1;
      return;
    }

    if (!keyword.includes(' ')) {
      const keywordPrefix = keyword.slice(0, Math.max(3, keyword.length - 1));
      if (tokens.some((token) => token.startsWith(keywordPrefix) || keywordPrefix.startsWith(token))) {
        score += 0.75;
      }
    }
  });

  return score;
};

const parseQuarterToken = (query) => {
  if (/this\s+quarter/i.test(query)) {
    return 'this';
  }
  const quarterMatch = query.match(/\b(q[1-4])(?:[\s-]*(\d{4}))?/i);
  if (!quarterMatch) {
    return null;
  }
  const q = quarterMatch[1].toUpperCase();
  const year = quarterMatch[2] || String(new Date().getFullYear());
  return `${year}-${q}`;
};

const detectIntent = (question) => {
  const normalized = normalizeText(question);

  const wantsHelp =
    containsAnyKeyword(normalized, ['help', 'what can you do', 'commands', 'how to use', 'assist']) ||
    normalized.length < 3;

  if (wantsHelp) {
    return 'help';
  }

  const createScore = scoreIntent(normalized, INTENT_KEYWORDS.createInvoice);
  const createClientScore = scoreIntent(normalized, INTENT_KEYWORDS.createClient) + scoreIntent(normalized, ['name', 'email', 'phone', 'company', 'address']);
  const followScore = scoreIntent(normalized, INTENT_KEYWORDS.followUp) + scoreIntent(normalized, ['payment', 'invoice', 'due']);
  const exportScore = scoreIntent(normalized, INTENT_KEYWORDS.export) + scoreIntent(normalized, ['receivable', 'outstanding', 'unpaid', 'pending']);
  const overdueScore = scoreIntent(normalized, INTENT_KEYWORDS.overdue) + scoreIntent(normalized, ['who owes', 'pending invoices', 'open invoices']);
  const topScore = scoreIntent(normalized, INTENT_KEYWORDS.topClients);
  const riskScore = scoreIntent(normalized, INTENT_KEYWORDS.riskyClients);
  const summaryScore = scoreIntent(normalized, INTENT_KEYWORDS.summary);

  const strongInvoicePhrase = /(create|make|generate|raise|draft)\s+(an?\s+)?(invoice|bill)\b/.test(normalized)
    || /\binvoice\b.*\b(due|client|customer|for|to|with)\b/.test(normalized);
  const strongClientPhrase = /(create|add|register|new)\s+(an?\s+)?(client|customer)\b/.test(normalized)
    || /(client|customer)\b.*\b(name|email|phone|company|address)\b/.test(normalized);

  if (createScore >= 2 || strongInvoicePhrase) {
    return 'create_invoice';
  }
  if (createClientScore >= 2.2 || strongClientPhrase) {
    return 'create_client';
  }
  if (followScore >= 2.2) {
    return 'follow_up';
  }
  if (exportScore >= 2) {
    return 'export';
  }
  if (topScore >= 2) {
    return 'top_clients';
  }
  if (riskScore >= 1.5) {
    return 'risky_clients';
  }
  if (overdueScore >= 1.8) {
    return 'overdue';
  }
  if (summaryScore >= 1.5) {
    return 'summary';
  }

  return 'unknown';
};

const safeNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickFirstAmountFromText = (question) => {
  const match = String(question || '').match(/(?:₹|rs\.?|inr|\$)?\s*([\d,]+(?:\.\d+)?)(?:\s*(k|lakh|lac|cr|crore|m))?/i);
  if (!match) {
    return null;
  }

  let amount = Number(String(match[1]).replace(/,/g, ''));
  if (!Number.isFinite(amount)) {
    return null;
  }

  const suffix = String(match[2] || '').toLowerCase();
  if (suffix === 'k') amount *= 1000;
  else if (suffix === 'lakh' || suffix === 'lac') amount *= 100000;
  else if (suffix === 'cr' || suffix === 'crore') amount *= 10000000;
  else if (suffix === 'm') amount *= 1000000;

  return amount;
};

const parseItemLines = (text) => {
  const source = String(text || '').trim();
  if (!source) {
    return [];
  }

  const items = [];
  const normalizeQuantityToken = (rawQty) => {
    const token = String(rawQty || '').trim();
    if (!token) {
      return NaN;
    }
    const corrected = token.replace(/[lIi]/g, '1');
    return Number(corrected);
  };

  const itemPattern = /([^,;]+?)\s*x\s*([\dliI]+(?:\.\d+)?)\s*at\s*([^,;]+?)(?=(?:,|;|$))/gi;
  let match;
  while ((match = itemPattern.exec(source)) !== null) {
    const description = String(match[1] || '').trim();
    const quantity = normalizeQuantityToken(match[2]);
    const unitPrice = parseAmount(match[3]);

    if (description && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice > 0) {
      items.push({ description, quantity, unit_price: unitPrice });
    }
  }

  if (!items.length) {
    const fallbackAmount = pickFirstAmountFromText(source);
    if (Number.isFinite(fallbackAmount) && fallbackAmount > 0) {
      const descriptionMatch = source.match(/(?:for|item|service)\s+(.+?)(?=\s+(?:for|at)\s*(?:₹|rs|inr|\$|\d)|$)/i);
      const description = descriptionMatch ? descriptionMatch[1].trim() : 'Services';
      items.push({ description: description || 'Services', quantity: 1, unit_price: fallbackAmount });
    }
  }

  return items;
};

const parseDueDateInput = (text) => {
  const dueInMatch = String(text || '').match(/(?:due\s+)?in\s+(\d{1,3})\s*days?/i);
  if (dueInMatch) {
    const days = Number(dueInMatch[1]);
    if (Number.isFinite(days) && days > 0) {
      return addDays(new Date(), days);
    }
  }

  const dueOnMatch = String(text || '').match(/(?:due\s+on|by)\s+(.+)$/i);
  if (dueOnMatch) {
    return parseDate(dueOnMatch[1].trim());
  }

  return parseDate(text);
};

const parseClientInput = (text) => {
  const direct = String(text || '').trim();
  if (!direct) {
    return '';
  }

  const match = direct.match(/(?:for|to|client(?:\s+is)?)\s+(.+)$/i);
  return (match ? match[1] : direct).trim();
};

const parseEmailInput = (text) => {
  const match = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : '';
};

const parsePhoneInput = (text) => {
  const labeled = String(text || '').match(/(?:phone|mobile|contact)\s*(?:is|:)?\s*([+\d][\d\s-]{6,})/i);
  if (labeled) {
    return labeled[1].trim();
  }

  const generic = String(text || '').match(/\+?\d[\d\s-]{6,}/);
  return generic ? generic[0].trim() : '';
};

const parseClientDraftCommand = (question) => {
  const source = String(question || '').trim();

  const nameFromCreate = source.match(/(?:create|add|register|new)\s+(?:an?\s+)?(?:client|customer)(?:\s+(?:named|name|called|for))?\s+(.+?)(?=\s+(?:email|phone|mobile|contact|company|address)\b|$)/i);
  const nameLabeled = source.match(/\bname\s*(?:is|:)?\s+(.+?)(?=\s+(?:email|phone|mobile|contact|company|address)\b|$)/i);
  const companyMatch = source.match(/\bcompany\s*(?:is|:)?\s+(.+?)(?=\s+(?:email|phone|mobile|contact|address)\b|$)/i);
  const addressMatch = source.match(/\baddress\s*(?:is|:)?\s+(.+?)$/i);

  return {
    name: (nameFromCreate?.[1] || nameLabeled?.[1] || '').trim(),
    email: parseEmailInput(source),
    phone: parsePhoneInput(source),
    company: (companyMatch?.[1] || '').trim(),
    address: (addressMatch?.[1] || '').trim()
  };
};

const parseClientNameInput = (text) => {
  const direct = String(text || '').trim();
  if (!direct) {
    return '';
  }

  const byLabel = direct.match(/\bname\s*(?:is|:)?\s+(.+)$/i);
  const byVerb = direct.match(/(?:client|customer)\s+(?:is|named|called)\s+(.+)$/i);
  return (byLabel?.[1] || byVerb?.[1] || direct).trim();
};

const parseCompanyInput = (text) => {
  const direct = String(text || '').trim();
  if (!direct) {
    return '';
  }

  const match = direct.match(/\bcompany\s*(?:is|:)?\s+(.+)$/i);
  return (match ? match[1] : direct).trim();
};

const parseAddressInput = (text) => {
  const direct = String(text || '').trim();
  if (!direct) {
    return '';
  }

  const match = direct.match(/\baddress\s*(?:is|:)?\s+(.+)$/i);
  return (match ? match[1] : direct).trim();
};

const isSkipResponse = (text) => /^(skip|no|none|na|n\/a|not now|later)$/i.test(String(text || '').trim());

const isOverdue = (invoice) => {
  const status = String(invoice.status || '').toLowerCase();
  if (status === 'paid') {
    return false;
  }
  if (status === 'overdue') {
    return true;
  }
  const dueDate = parseDate(String(invoice.due_date || ''));
  if (!dueDate) {
    return false;
  }
  return dueDate < toStartOfDay(new Date());
};

const AiChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoiceFlow, setInvoiceFlow] = useState(null);
  const [clientFlow, setClientFlow] = useState(null);
  const messageEndRef = useRef(null);

  const addMessage = (role, text) => {
    setMessages((prev) => [...prev, { role, text }]);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, isOpen]);

  const getReceivables = async () => {
    const response = await invoiceService.getReceivables();
    if (!response.success) {
      throw new Error('Could not fetch receivables data');
    }
    return Array.isArray(response.data) ? response.data : [];
  };

  const summarizeStats = async () => {
    const response = await dashboardService.getStats();
    if (!response.success) {
      throw new Error('Could not fetch dashboard stats');
    }

    const data = response.data;
    const healthScore = data.health_score ?? 'N/A';
    const totalRevenue = formatCurrencyINR(data.total_revenue || 0);
    const outstanding = formatCurrencyINR((data.pending_amount || 0) + (data.overdue_amount || 0));
    const overdueCount = data.overdue_count ?? 0;

    return `Health Score: ${healthScore}/100. Total Revenue: ${totalRevenue}. Outstanding: ${outstanding}. Overdue Invoices: ${overdueCount}.`;
  };

  const summarizeRiskyClients = async () => {
    const response = await dashboardService.getRiskyClients();
    if (!response.success) {
      throw new Error('Could not fetch risky clients');
    }

    if (!response.data.length) {
      return 'Great news: no risky clients detected right now.';
    }

    const top = response.data.slice(0, 3).map((client) => {
      const name = client.name || client.client_name || 'Unknown client';
      const score = client.risk_score ?? 'N/A';
      return `${name} (risk ${score})`;
    });

    return `Top risky clients: ${top.join(', ')}.`;
  };

  const summarizeTopClients = async () => {
    const response = await dashboardService.getTopClients();
    if (!response.success) {
      throw new Error('Could not fetch top clients');
    }

    if (!response.data.length) {
      return 'No top clients available yet. Add invoices and payments to generate insights.';
    }

    const top = response.data.slice(0, 3).map((client) => {
      const name = client.name || client.client_name || 'Unknown client';
      const value = formatCurrencyINR(client.total_revenue || client.revenue || 0);
      return `${name} (${value})`;
    });

    return `Top clients by revenue: ${top.join(', ')}.`;
  };

  const handleOverdueQuery = async (question) => {
    const dayThreshold = parseOverdueDays(question);
    const amountMatch = question.match(/(?:above|over|more than|at least|min(?:imum)?)\s+([^,.;\n]+)/i);
    const minAmount = amountMatch ? parseAmount(amountMatch[1]) : null;

    const response = await dashboardService.getOverdueByThreshold(dayThreshold);
    if (!response.success) {
      throw new Error('Could not fetch overdue invoices');
    }

    let rows = Array.isArray(response.data) ? response.data : [];
    if (Number.isFinite(minAmount)) {
      rows = rows.filter((row) => safeNumber(row.total) >= minAmount);
    }

    if (!rows.length) {
      if (dayThreshold > 0 && Number.isFinite(minAmount)) {
        return `No invoices found overdue by at least ${dayThreshold} day(s) above ${formatCurrencyINR(minAmount)}.`;
      }
      if (dayThreshold > 0) {
        return `No invoices found overdue by at least ${dayThreshold} day(s).`;
      }
      if (Number.isFinite(minAmount)) {
        return `No overdue invoices found above ${formatCurrencyINR(minAmount)}.`;
      }
      return 'No overdue invoices found right now.';
    }

    const total = rows.reduce((sum, row) => sum + safeNumber(row.total), 0);
    const preview = rows.slice(0, 5).map((row) => {
      const number = row.invoice_number || `#${row.id}`;
      const client = row.client_name || row.client_company || 'Unknown client';
      const amount = formatCurrencyINR(row.total || 0);
      const overdueDays = Number(row.overdue_days || 0);
      return `${number} (${client}, ${amount}, ${overdueDays}d)`;
    });

    return `Found ${rows.length} overdue invoices totaling ${formatCurrencyINR(total)}. ${preview.join(', ')}.`;
  };

  const handleTopClientsQuarterQuery = async (question) => {
    const quarterToken = parseQuarterToken(question);
    const limit = parseTopLimit(question);

    const response = quarterToken
      ? await dashboardService.getTopClientsByQuarter(quarterToken, limit)
      : await dashboardService.getTopClients();

    if (!response.success) {
      throw new Error('Could not fetch top clients');
    }

    const rows = (Array.isArray(response.data) ? response.data : []).slice(0, limit);
    if (!rows.length) {
      return quarterToken ? 'No client revenue data found for the selected quarter.' : 'No top clients available yet.';
    }

    const label = quarterToken ? `Top ${rows.length} clients for ${quarterToken === 'this' ? 'this quarter' : quarterToken}` : `Top ${rows.length} clients`;
    const entries = rows.map((row, index) => {
      const name = row.name || row.client_name || row.company || `Client ${row.id}`;
      return `${index + 1}. ${name} (${formatCurrencyINR(row.total_revenue || row.revenue || 0)})`;
    });

    return `${label}: ${entries.join(' | ')}`;
  };

  const parseInvoiceDraftCommand = (question) => {
    const clientMatch =
      question.match(/(?:create|make|raise|generate|draft)?\s*(?:an?\s+)?(?:invoice|bill)\s+(?:for|to)\s+(.+?)(?=\s+(?:with|for|due\s+in|due\s+on|by)\b|$)/i) ||
      question.match(/(?:for|to)\s+(.+?)(?=\s+(?:with|for|due\s+in|due\s+on|by)\b|$)/i);
    const itemsMatch = question.match(/\bwith\s+(.+?)(?=\s+due\s+in\b|\s+due\s+on\b|\s+by\b|$)/i);
    const serviceMatch = question.match(/\bfor\s+(?!\d)(.+?)(?=\s+for\s+(?:₹|rs|inr|\$|\d)|\s+at\s+(?:₹|rs|inr|\$|\d)|\s+due\s+in|\s+due\s+on|$)/i);
    const dueInMatch = question.match(/due\s+in\s+(\d{1,3})\s*days?/i);
    const dueOnMatch = question.match(/due\s+on\s+(.+)$/i);
    const byMatch = question.match(/\bby\s+(.+)$/i);

    const clientQuery = clientMatch ? clientMatch[1].trim() : '';
    const itemsRaw = itemsMatch ? itemsMatch[1].trim() : '';

    const items = itemsRaw ? parseItemLines(itemsRaw) : [];

    // Fallback for natural phrasing like "make invoice to Acme for consulting for 25000 due in 10 days".
    if (!items.length) {
      const fallbackAmount = pickFirstAmountFromText(question);
      if (Number.isFinite(fallbackAmount) && fallbackAmount > 0) {
        const fallbackDescription = serviceMatch ? serviceMatch[1].trim() : 'Services';
        items.push({
          description: fallbackDescription || 'Services',
          quantity: 1,
          unit_price: fallbackAmount
        });
      }
    }

    let dueDate = null;
    if (dueInMatch) {
      const days = Number(dueInMatch[1]);
      if (Number.isFinite(days) && days > 0) {
        dueDate = addDays(new Date(), days);
      }
    } else if (dueOnMatch) {
      dueDate = parseDate(dueOnMatch[1].trim());
    } else if (byMatch) {
      dueDate = parseDate(byMatch[1].trim());
    }

    if (!dueDate) {
      dueDate = addDays(new Date(), DEFAULT_DUE_DAYS);
    }

    return { clientQuery, items, dueDate };
  };

  const resolveClientByName = async (clientQuery) => {
    const response = await clientService.getAll();
    if (!response.success) {
      throw new Error('Could not fetch clients');
    }

    const clients = Array.isArray(response.data) ? response.data : [];
    const normalized = String(clientQuery || '').trim().toLowerCase();
    if (!normalized) {
      return { client: null, suggestions: clients.slice(0, 5) };
    }

    const exact = clients.find((client) => {
      const name = String(client.name || '').toLowerCase();
      const company = String(client.company || '').toLowerCase();
      return name === normalized || company === normalized;
    });
    if (exact) {
      return { client: exact, suggestions: [] };
    }

    const fuzzy = clients.find((client) => {
      const name = String(client.name || '').toLowerCase();
      const company = String(client.company || '').toLowerCase();
      return name.includes(normalized) || company.includes(normalized) || normalized.includes(name);
    });
    if (fuzzy) {
      return { client: fuzzy, suggestions: [] };
    }

    return { client: null, suggestions: clients.slice(0, 5) };
  };

  const handleInvoiceCreateCommand = async (question) => {
    const parsed = parseInvoiceDraftCommand(question);

    const askNextInvoiceField = (draft) => {
      if (!draft.clientQuery) {
        return 'Sure, let us create an invoice. Please provide the client name.';
      }
      if (!draft.items.length) {
        return 'Got it. Please provide at least one item in this format: Design x 1 at 25000';
      }
      if (!draft.dueDate) {
        return 'What is the due date? You can say "in 10 days" or "2026-04-10".';
      }
      return null;
    };

    const createInvoiceFromDraft = async (draft) => {
      const { client, suggestions } = await resolveClientByName(draft.clientQuery);
      if (!client) {
        const hint = suggestions.length
          ? `Try one of: ${suggestions.map((c) => c.name || c.company || `Client ${c.id}`).join(', ')}.`
          : 'Please verify the client name in your client list.';
        return `Client "${draft.clientQuery}" was not found. ${hint}`;
      }

      const payload = {
        client_id: client.id,
        issue_date: toIsoDate(toStartOfDay(new Date())),
        due_date: toIsoDate(draft.dueDate),
        tax_rate: 0,
        notes: 'Drafted via AI chat assistant',
        items: draft.items
      };

      const response = await invoiceService.create(payload);
      if (!response.success) {
        throw new Error('Could not create invoice from chat command');
      }

      const invoiceNumber = response.data?.invoice_number || response.data?.id || 'new invoice';
      const total = draft.items.reduce((sum, item) => sum + (safeNumber(item.quantity) * safeNumber(item.unit_price)), 0);
      return `Invoice ${invoiceNumber} created for ${client.name || client.company || 'client'} with ${draft.items.length} item(s), total ${formatCurrencyINR(total)}, due on ${payload.due_date}.`;
    };

    const nextPrompt = askNextInvoiceField(parsed);
    if (nextPrompt) {
      setInvoiceFlow({
        clientQuery: parsed.clientQuery || '',
        items: parsed.items || [],
        dueDate: parsed.dueDate || null
      });
      return nextPrompt;
    }

    setInvoiceFlow(null);
    return createInvoiceFromDraft(parsed);
  };

  const handleClientCreateCommand = async (question) => {
    const parsed = parseClientDraftCommand(question);

    const askNextClientField = (draft) => {
      if (!draft.name) {
        return 'Sure, let us create a client. What is the client name?';
      }
      if (draft.email === null) {
        return 'Please share email (or type "skip").';
      }
      if (draft.phone === null) {
        return 'Please share phone number (or type "skip").';
      }
      if (draft.company === null) {
        return 'Please share company name (or type "skip").';
      }
      if (draft.address === null) {
        return 'Please share address (or type "skip").';
      }
      return null;
    };

    const createClientFromDraft = async (draft) => {
      const payload = {
        name: draft.name,
        email: draft.email || '',
        phone: draft.phone || '',
        company: draft.company || '',
        address: draft.address || ''
      };

      const response = await clientService.create(payload);
      if (!response.success) {
        throw new Error(response.message || 'Could not create client from chat command');
      }

      const clientName = response.data?.name || payload.name;
      return `Client ${clientName} created successfully.`;
    };

    const draft = {
      name: parsed.name || '',
      email: parsed.email || null,
      phone: parsed.phone || null,
      company: parsed.company || null,
      address: parsed.address || null
    };

    const nextPrompt = askNextClientField(draft);
    if (nextPrompt) {
      setClientFlow(draft);
      return nextPrompt;
    }

    setClientFlow(null);
    return createClientFromDraft(draft);
  };

  const continueInvoiceFlow = async (question) => {
    if (!invoiceFlow) {
      return null;
    }

    const normalized = normalizeText(question);
    if (containsAnyKeyword(normalized, ['cancel', 'stop', 'abort', 'nevermind', 'never mind'])) {
      setInvoiceFlow(null);
      return 'Invoice creation cancelled.';
    }

    const draft = {
      clientQuery: invoiceFlow.clientQuery,
      items: [...invoiceFlow.items],
      dueDate: invoiceFlow.dueDate
    };

    if (!draft.clientQuery) {
      draft.clientQuery = parseClientInput(question);
    } else if (!draft.items.length) {
      draft.items = parseItemLines(question);
    } else if (!draft.dueDate) {
      draft.dueDate = parseDueDateInput(question);
    }

    if (!draft.clientQuery) {
      setInvoiceFlow(draft);
      return 'Please provide the client name to continue.';
    }

    if (!draft.items.length) {
      setInvoiceFlow(draft);
      return 'Please provide line item(s). Example: Design x 1 at 25000';
    }

    if (!draft.dueDate) {
      setInvoiceFlow(draft);
      return 'Please provide a valid due date. Example: in 10 days or 2026-04-10';
    }

    const created = await handleInvoiceCreateCommand(
      `create invoice for ${draft.clientQuery} with ${draft.items.map((i) => `${i.description} x ${i.quantity} at ${i.unit_price}`).join(', ')} due on ${toIsoDate(draft.dueDate)}`
    );
    setInvoiceFlow(null);
    return created;
  };

  const continueClientFlow = async (question) => {
    if (!clientFlow) {
      return null;
    }

    const normalized = normalizeText(question);
    if (containsAnyKeyword(normalized, ['cancel', 'stop', 'abort', 'nevermind', 'never mind'])) {
      setClientFlow(null);
      return 'Client creation cancelled.';
    }

    const draft = { ...clientFlow };

    if (!draft.name) {
      draft.name = parseClientNameInput(question);
    } else if (draft.email === null) {
      if (isSkipResponse(question)) {
        draft.email = '';
      } else {
        const parsedEmail = parseEmailInput(question);
        draft.email = parsedEmail || null;
      }
    } else if (draft.phone === null) {
      if (isSkipResponse(question)) {
        draft.phone = '';
      } else {
        const parsedPhone = parsePhoneInput(question);
        draft.phone = parsedPhone || null;
      }
    } else if (draft.company === null) {
      draft.company = isSkipResponse(question) ? '' : parseCompanyInput(question);
    } else if (draft.address === null) {
      draft.address = isSkipResponse(question) ? '' : parseAddressInput(question);
    }

    if (!draft.name) {
      setClientFlow(draft);
      return 'Please provide client name to continue.';
    }

    if (draft.email === null) {
      setClientFlow(draft);
      return 'Please provide a valid email or type "skip".';
    }

    if (draft.phone === null) {
      setClientFlow(draft);
      return 'Please provide a phone number or type "skip".';
    }

    if (draft.company === null) {
      setClientFlow(draft);
      return 'Please provide company name or type "skip".';
    }

    if (draft.address === null) {
      setClientFlow(draft);
      return 'Please provide address or type "skip".';
    }

    const response = await clientService.create({
      name: draft.name,
      email: draft.email || '',
      phone: draft.phone || '',
      company: draft.company || '',
      address: draft.address || ''
    });
    if (!response.success) {
      throw new Error(response.message || 'Could not create client from chat command');
    }

    const created = `Client ${response.data?.name || draft.name} created successfully.`;
    setClientFlow(null);
    return created;
  };

  const handleFollowUpCommand = async () => {
    const receivables = await getReceivables();
    const overdue = receivables.filter(isOverdue);

    if (!overdue.length) {
      return 'No overdue invoices found, so no follow-up is needed right now.';
    }

    const today = toStartOfDay(new Date());
    const lines = overdue.slice(0, 5).map((row, index) => {
      const dueDate = parseDate(String(row.due_date || ''));
      const daysLate = dueDate ? Math.max(0, Math.floor((today - dueDate) / MS_PER_DAY)) : 0;
      const number = row.invoice_number || `#${row.id}`;
      const client = row.client_name || row.client_company || 'Client';
      const amount = formatCurrencyINR(row.total || 0);

      return `${index + 1}) Subject: Payment reminder for ${number}\nBody: Hi ${client}, this is a reminder that invoice ${number} for ${amount} was due on ${row.due_date || '-'} (${daysLate} day(s) overdue). Please share the payment status or expected payment date.`;
    });

    return `Generated follow-up templates for ${Math.min(overdue.length, 5)} overdue invoice(s):\n\n${lines.join('\n\n')}`;
  };

  const handleExportCommand = async (question) => {
    const rows = await getReceivables();
    if (!rows.length) {
      return 'No open receivables found to export.';
    }

    if (/\bpdf\b/i.test(question)) {
      downloadReceivablesPdf(rows);
      return `Receivables PDF exported with ${rows.length} open invoice(s).`;
    }

    downloadReceivablesCsv(rows);
    return `Receivables CSV exported with ${rows.length} open invoice(s).`;
  };

  const handleOutstandingSummary = async () => {
    const rows = await getReceivables();
    if (!rows.length) {
      return 'No outstanding receivables right now.';
    }

    const total = rows.reduce((sum, row) => sum + safeNumber(row.total), 0);
    const top = rows
      .slice()
      .sort((a, b) => safeNumber(b.total) - safeNumber(a.total))
      .slice(0, 5)
      .map((row) => `${row.invoice_number || `#${row.id}`} (${row.client_name || row.client_company || 'Client'}, ${formatCurrencyINR(row.total || 0)})`);

    return `You have ${rows.length} open receivable invoice(s) totaling ${formatCurrencyINR(total)}. Largest open invoices: ${top.join(', ')}.`;
  };

  const helpText =
    'Try natural requests like: "how is my business doing", "who are risky clients", "show top customers this quarter", "who owes me", "show overdue above 50000", "create client named Rahul email rahul@mail.com", "create an invoice to Acme for consulting for 25000 due in 10 days", "send payment reminder drafts", "export outstanding as csv", or "download receivables pdf".';

  const localFallbackReply = (question) => {
    const normalized = normalizeText(question);

    if (containsAnyKeyword(normalized, ['hello', 'hi', 'hey'])) {
      return 'Hi! I am ready. Ask me about overdue invoices, top clients, reminders, exports, client creation, or invoice creation in plain language.';
    }

    if (containsAnyKeyword(normalized, ['thanks', 'thank you'])) {
      return 'You are welcome. Share the next task and I will handle it.';
    }

    if (containsAnyKeyword(normalized, ['what can you do', 'capabilities', 'features', 'help'])) {
      return helpText;
    }

    return `I did not fully understand that yet, but I can still execute business tasks. ${helpText}`;
  };

  const generateReply = async (question) => {
    const normalized = normalizeText(question);
    const intent = detectIntent(normalized);

    if (intent === 'help') {
      return helpText;
    }

    if (intent === 'create_invoice') {
      return handleInvoiceCreateCommand(question);
    }

    if (intent === 'create_client') {
      return handleClientCreateCommand(question);
    }

    if (intent === 'follow_up') {
      return handleFollowUpCommand();
    }

    if (intent === 'export') {
      return handleExportCommand(question);
    }

    if (intent === 'overdue') {
      if (containsAnyKeyword(normalized, ['who owes', 'outstanding', 'pending invoices', 'open invoices'])) {
        return handleOutstandingSummary();
      }
      return handleOverdueQuery(question);
    }

    if (intent === 'top_clients') {
      return handleTopClientsQuarterQuery(question);
    }

    if (intent === 'summary') {
      return summarizeStats();
    }

    if (intent === 'risky_clients') {
      return summarizeRiskyClients();
    }

    if (containsAnyKeyword(normalized, ['best client', 'best customer'])) {
      return summarizeTopClients();
    }

    return localFallbackReply(question);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) {
      return;
    }

    addMessage('user', question);
    setInput('');
    setLoading(true);

    try {
      const reply = invoiceFlow
        ? await continueInvoiceFlow(question)
        : clientFlow
          ? await continueClientFlow(question)
          : await generateReply(question);
      addMessage('assistant', reply);
    } catch (error) {
      addMessage('assistant', error.message || 'I could not complete that request right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: { xs: 12, sm: 20 }, right: { xs: 12, sm: 20 }, zIndex: 1500 }}>
      <AnimatePresence>
        {isOpen && (
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            sx={{ mb: 1.5 }}
          >
            <Card
              sx={{
                width: { xs: 'calc(100vw - 24px)', sm: 360 },
                maxWidth: 420,
                height: { xs: 'min(72vh, 560px)', sm: 500 },
                borderRadius: 4,
                boxShadow: '0 28px 48px rgba(11,18,34,0.28)',
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(8px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1.5,
                    color: 'white',
                    background: 'linear-gradient(120deg, #0f172a 0%, #1d4ed8 50%, #0891b2 100%)'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(255,255,255,0.2)', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}>
                      <SmartToyRoundedIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>AI Assistant</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>Financial insights chat</Typography>
                    </Box>
                  </Stack>
                  <IconButton size="small" sx={{ color: 'white' }} onClick={() => setIsOpen(false)}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack
                  spacing={1.2}
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 1.5,
                    background: 'linear-gradient(180deg, #eef5ff 0%, #f8fafc 100%)',
                    '&::-webkit-scrollbar': {
                      width: 8
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(100,116,139,0.4)',
                      borderRadius: 999
                    }
                  }}
                >
                  {messages.map((message, index) => (
                    <Box
                      key={`${message.role}-${index}`}
                      sx={{
                        alignSelf: message.role === 'assistant' ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        px: 1.5,
                        py: 1.1,
                        borderRadius: message.role === 'assistant' ? '14px 14px 14px 6px' : '14px 14px 6px 14px',
                        fontSize: '0.86rem',
                        lineHeight: 1.5,
                        bgcolor: message.role === 'assistant' ? 'rgba(255,255,255,0.96)' : '#1d4ed8',
                        color: message.role === 'assistant' ? '#0f172a' : '#ffffff',
                        border: message.role === 'assistant' ? '1px solid' : 'none',
                        borderColor: 'rgba(148,163,184,0.24)',
                        boxShadow: message.role === 'assistant' ? '0 4px 10px rgba(15,23,42,0.06)' : '0 6px 14px rgba(29,78,216,0.28)',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {message.text}
                    </Box>
                  ))}
                  {loading && (
                    <Box
                      sx={{
                        maxWidth: '85%',
                        px: 1.4,
                        py: 1,
                        borderRadius: '14px 14px 14px 6px',
                        bgcolor: 'rgba(255,255,255,0.96)',
                        color: '#0f172a',
                        border: '1px solid',
                        borderColor: 'rgba(148,163,184,0.24)'
                      }}
                    >
                      Thinking...
                    </Box>
                  )}
                  <Box ref={messageEndRef} sx={{ height: 1, width: '100%' }} />
                </Stack>

                <Box
                  component="form"
                  onSubmit={handleSend}
                  sx={{ p: 1.3, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#ffffff' }}
                >
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Try: overdue above 50000, top 5 clients this quarter, create invoice..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 999,
                          backgroundColor: '#f8fafc',
                          color: '#0f172a'
                        },
                        '& .MuiInputBase-input': {
                          color: '#0f172a !important',
                          WebkitTextFillColor: '#0f172a'
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: '#64748b !important',
                          opacity: '1 !important'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#3b82f6'
                        },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#2563eb'
                        },
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1d4ed8'
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      sx={{
                        minWidth: 44,
                        px: 1.2,
                        borderRadius: 999,
                        background: 'linear-gradient(120deg, #1d4ed8 0%, #0891b2 100%)'
                      }}
                    >
                      <SendRoundedIcon fontSize="small" />
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </AnimatePresence>

      {!isOpen && (
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setIsOpen(true)}
          sx={{
            borderRadius: 999,
            px: 2,
            background: 'linear-gradient(120deg, #1d4ed8 0%, #0891b2 100%)',
            boxShadow: '0 14px 24px rgba(14,116,144,0.34)'
          }}
        >
          <SmartToyRoundedIcon sx={{ mr: 0.8 }} /> AI Chat
        </Fab>
      )}
    </Box>
  );
};

export default AiChatbot;
