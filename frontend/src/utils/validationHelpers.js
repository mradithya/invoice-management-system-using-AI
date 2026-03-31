/**
 * Reusable validation helpers for forms
 * Each validator returns { valid: boolean, error: string }
 */

export const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true, error: '' };
};

export const validatePhone = (phone) => {
  if (!phone) return { valid: true, error: '' }; // Phone is optional
  const phoneRegex = /^[0-9\-\+\(\)\s]+$/;
  if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
    return { valid: false, error: 'Invalid phone number' };
  }
  return { valid: true, error: '' };
};

export const validateRequired = (value, fieldName) => {
  if (!value || value.toString().trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true, error: '' };
};

export const validateAmount = (value, fieldName = 'Amount') => {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) {
    return { valid: false, error: `${fieldName} must be greater than 0` };
  }
  return { valid: true, error: '' };
};

export const validateDate = (date, fieldName = 'Date') => {
  if (!date) return { valid: false, error: `${fieldName} is required` };
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: `${fieldName} is invalid` };
  }
  return { valid: true, error: '' };
};

export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    return { valid: false, error: 'Due date must be after issue date' };
  }
  return { valid: true, error: '' };
};

export const validateMinLength = (value, minLength, fieldName = 'Field') => {
  if (!value || value.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  return { valid: true, error: '' };
};

/**
 * Validate invoice items
 * @param {Array} items - Array of invoice items
 * @returns {Object} { valid, errors: {} }
 */
export const validateInvoiceItems = (items) => {
  const errors = {};
  let valid = true;

  items.forEach((item, index) => {
    if (!item.description || item.description.trim() === '') {
      errors[`item_${index}_description`] = 'Description is required';
      valid = false;
    }
    if (!item.quantity || parseFloat(item.quantity) <= 0) {
      errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      valid = false;
    }
    if (item.unit_price === '' || parseFloat(item.unit_price) <= 0) {
      errors[`item_${index}_unit_price`] = 'Unit price must be greater than 0';
      valid = false;
    }
  });

  return { valid, errors };
};
