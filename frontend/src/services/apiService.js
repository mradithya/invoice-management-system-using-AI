import api from './api';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/index.php?action=register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/index.php?action=login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/index.php?action=logout');
    return response.data;
  },

  checkAuth: async () => {
    const response = await api.get('/auth/index.php?action=check');
    return response.data;
  }
};

export const profileService = {
  get: async () => {
    const response = await api.get('/profile.php');
    return response.data;
  },

  update: async (profileData) => {
    const isFormData = typeof FormData !== 'undefined' && profileData instanceof FormData;
    const response = isFormData
      ? await api.post('/profile.php', profileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      : await api.put('/profile.php', profileData);
    return response.data;
  }
};

export const clientService = {
  getAll: async () => {
    const response = await api.get('/clients.php');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/clients.php/${id}`);
    return response.data;
  },

  create: async (clientData) => {
    const response = await api.post('/clients.php', clientData);
    return response.data;
  },

  update: async (id, clientData) => {
    const response = await api.put(`/clients.php/${id}`, clientData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/clients.php/${id}`);
    return response.data;
  }
};

export const invoiceService = {
  getAll: async () => {
    const response = await api.get('/invoices.php');
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/invoices.php/${id}`);
    return response.data;
  },

  create: async (invoiceData) => {
    const response = await api.post('/invoices.php', invoiceData);
    return response.data;
  },

  update: async (id, invoiceData) => {
    const response = await api.put(`/invoices.php/${id}`, invoiceData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/invoices.php/${id}`);
    return response.data;
  },

  sendEmail: async (id, payload) => {
    const response = await api.post(`/invoices.php/${id}/email`, payload);
    return response.data;
  },

  getReceivables: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.date_from) {
      params.set('date_from', filters.date_from);
    }
    if (filters.date_to) {
      params.set('date_to', filters.date_to);
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/invoices.php/receivables${suffix}`);
    return response.data;
  }
};

export const paymentService = {
  getByInvoice: async (invoiceId) => {
    const response = await api.get(`/payments.php/invoice/${invoiceId}`);
    return response.data;
  },

  create: async (paymentData) => {
    const response = await api.post('/payments.php', paymentData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/payments.php/${id}`);
    return response.data;
  }
};

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard.php/stats');
    return response.data;
  },

  getRiskyClients: async () => {
    const response = await api.get('/dashboard.php/clients/risky');
    return response.data;
  },

  getTopClients: async () => {
    const response = await api.get('/dashboard.php/clients/top');
    return response.data;
  },

  getTopClientsByQuarter: async (quarter = 'this', limit = 5) => {
    const response = await api.get(`/dashboard.php/clients/top?quarter=${encodeURIComponent(quarter)}&limit=${limit}`);
    return response.data;
  },

  getOverdueByThreshold: async (thresholdDays = 0) => {
    const response = await api.get(`/dashboard.php/invoices/overdue?threshold_days=${thresholdDays}`);
    return response.data;
  }
};

export const recurringService = {
  getAll: async () => {
    const response = await api.get('/recurring.php');
    return response.data;
  },

  create: async (templateData) => {
    const response = await api.post('/recurring.php', templateData);
    return response.data;
  },

  update: async (id, templateData) => {
    const response = await api.put(`/recurring.php/${id}`, templateData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/recurring.php/${id}`);
    return response.data;
  },

  runNow: async () => {
    const response = await api.post('/recurring.php/run', {});
    return response.data;
  }
};

export const userService = {
  getAll: async () => {
    const response = await api.get('/users.php');
    return response.data;
  },

  updateRole: async (id, role) => {
    const response = await api.put(`/users.php/${id}`, { role });
    return response.data;
  }
};

export const auditService = {
  getLogs: async (limit = 100) => {
    const response = await api.get(`/audit.php?limit=${limit}`);
    return response.data;
  }
};

export const assistantService = {
  chat: async (payload) => {
    const response = await api.post('/chat.php', payload);
    return response.data;
  }
};
