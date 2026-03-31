import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const escapeCsv = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

const isoDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const triggerDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadReceivablesCsv = (rows) => {
  const header = ['Invoice Number', 'Client', 'Issue Date', 'Due Date', 'Status', 'Days Overdue', 'Amount'];
  const bodyRows = rows.map((row) => [
    row.invoice_number || `#${row.id}`,
    row.client_name || row.client_company || '-',
    row.issue_date || '-',
    row.due_date || '-',
    row.status || 'Pending',
    String(Number(row.days_overdue || 0)),
    Number(row.total || 0).toFixed(2)
  ]);

  const csv = [header, ...bodyRows].map((line) => line.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `receivables-${isoDate()}.csv`);
};

export const downloadReceivablesPdf = (rows) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedOn = isoDate();
  const total = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  doc.setFontSize(16);
  doc.text('Receivables Report', 14, 18);

  doc.setFontSize(11);
  doc.text(`Generated on: ${generatedOn}`, 14, 26);
  doc.text(
    `Total open receivables: INR ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    14,
    32
  );

  autoTable(doc, {
    startY: 38,
    head: [['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Status', 'Days', 'Amount']],
    body: rows.map((row) => [
      row.invoice_number || `#${row.id}`,
      row.client_name || row.client_company || '-',
      row.issue_date || '-',
      row.due_date || '-',
      row.status || 'Pending',
      String(Number(row.days_overdue || 0)),
      `INR ${Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ])
  });

  doc.save(`receivables-${generatedOn}.pdf`);
};
