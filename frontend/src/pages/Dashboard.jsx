import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import { dashboardService, invoiceService, clientService } from '../services/apiService';
import SummaryCard from '../components/dashboard/SummaryCard';
import InsightsPanel from '../components/dashboard/InsightsPanel';
import DataTableCard from '../components/dashboard/DataTableCard';
import { formatCurrencyINR } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { getAdminScopeUserId } from '../utils/adminScope';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const scopeUserId = getAdminScopeUserId();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [clients, setClients] = useState([]);

  const loadDashboard = useCallback(async (showLoader = false) => {
    if (isAdmin && !scopeUserId) {
      setLoading(false);
      setStats(null);
      setRecentInvoices([]);
      setClients([]);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    try {
      const [statsRes, invoicesRes, clientsRes] = await Promise.all([
        dashboardService.getStats(),
        invoiceService.getAll(),
        clientService.getAll()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (invoicesRes.success) setRecentInvoices(invoicesRes.data || []);
      if (clientsRes.success) setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, scopeUserId]);

  useEffect(() => {
    if (isAdmin && !scopeUserId) {
      return undefined;
    }

    loadDashboard(true);

    // Keep summary cards/charts in near real-time sync.
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDashboard(false);
      }
    }, 1000);

    const handleFocus = () => {
      loadDashboard(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadDashboard]);

  if (isAdmin && !scopeUserId) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-6 text-slate-100 shadow-lg shadow-black/20">
        <h3 className="text-base font-semibold text-white">Select a user</h3>
        <p className="mt-2 text-sm text-slate-300">Choose a user from the top bar to view the dashboard.</p>
      </div>
    );
  }

  const monthlyRevenueData = useMemo(() => {
    if (!stats?.monthly_revenue) return [];
    return [...stats.monthly_revenue]
      .map((item) => ({ month: item.month, revenue: Number(item.revenue || 0) }))
      .reverse();
  }, [stats]);

  const invoiceStatusData = useMemo(() => {
    const paid = Number(stats?.paid_amount || 0);
    const pending = Number(stats?.pending_amount || 0);

    return [
      { status: 'Paid', amount: paid },
      { status: 'Pending', amount: pending }
    ];
  }, [stats]);

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: formatCurrencyINR(stats?.total_revenue || 0),
      trend: '+8.2% from last month',
      trendType: 'up',
      icon: <AttachMoneyRoundedIcon fontSize="small" />
    },
    {
      title: 'Pending Payments',
      value: formatCurrencyINR(stats?.pending_amount || 0),
      trend: 'Needs follow-up',
      trendType: 'neutral',
      icon: <PendingActionsRoundedIcon fontSize="small" />
    },
    {
      title: 'Overdue Invoices',
      value: formatCurrencyINR(stats?.overdue_amount || 0),
      trend: 'Overdue ratio rising',
      trendType: 'down',
      icon: <WarningAmberRoundedIcon fontSize="small" />
    },
    {
      title: 'Total Clients',
      value: `${Number(stats?.client_count || 0)}`,
      trend: 'Active portfolio',
      trendType: 'up',
      icon: <GroupRoundedIcon fontSize="small" />
    }
  ];

  const insights = [
    {
      id: 'health',
      type: Number(stats?.health_score || 0) >= 70 ? 'good' : 'info',
      message:
        Number(stats?.health_score || 0) >= 70
          ? 'Your business is financially healthy.'
          : 'Financial score indicates room for improvement.'
    },
    {
      id: 'overdue',
      type: Number(stats?.overdue_amount || 0) > 0 ? 'info' : 'good',
      message:
        Number(stats?.overdue_amount || 0) > 0
          ? 'Overdue invoices are increasing. Prioritize follow-ups this week.'
          : 'Great job. No overdue invoices detected right now.'
    }
  ];

  const invoiceTableRows = recentInvoices.slice(0, 6).map((invoice) => ({
    id: invoice.id,
    values: [
      invoice.invoice_number,
      invoice.client_name || '-',
      formatCurrencyINR(invoice.total || 0),
      invoice.status || '-',
      invoice.due_date || '-'
    ]
  }));

  const clientTableRows = clients.slice(0, 6).map((client) => ({
    id: client.id,
    values: [
      client.name,
      client.company || '-',
      client.email || '-',
      client.phone || '-'
    ]
  }));

  if (loading) {
    return (
      <div className="animate-pulse text-slate-200">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 rounded-2xl bg-slate-800/70" />
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="h-80 rounded-2xl bg-slate-800/70 xl:col-span-2" />
          <div className="h-80 rounded-2xl bg-slate-800/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-100">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5 shadow-lg shadow-black/20 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Monthly Revenue Trend</h3>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#e2e8f0'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5 shadow-lg shadow-black/20">
          <h3 className="mb-4 text-base font-semibold text-white">Invoice Status</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invoiceStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="status" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => formatCurrencyINR(value || 0)}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#e2e8f0'
                  }}
                />
                <Legend />
                <Bar dataKey="amount" name="Amount" radius={[8, 8, 0, 0]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <InsightsPanel insights={insights} />
        </div>
        <div className="xl:col-span-2">
          <DataTableCard
            title="Recent Invoices"
            columns={['Invoice #', 'Client', 'Amount', 'Status', 'Due Date']}
            rows={invoiceTableRows}
          />
        </div>
      </section>

      <section className="mt-6">
        <DataTableCard
          title="Client List"
          columns={['Name', 'Company', 'Email', 'Phone']}
          rows={clientTableRows}
        />
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/invoices/new"
          className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 hover:shadow-blue-400/30"
        >
          Create Invoice
        </Link>
        <Link
          to="/clients"
          className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-lg shadow-black/20 transition hover:border-emerald-400 hover:text-emerald-300"
        >
          Manage Clients
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
