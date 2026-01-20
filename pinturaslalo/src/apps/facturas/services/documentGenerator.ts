import { BudgetData, InvoiceConfig } from '../types';

// New strategy: generate the invoice PDF via a Pages Function (Browser Rendering)
// to avoid modifying a pre-made PDF template.
export async function generatePdf(
  budget: BudgetData,
  config: InvoiceConfig,
  invoiceCode: string
): Promise<string> {
  const payload = {
    invoiceCode,
    clientName: budget.clientName || '',
    date: (config.date ? config.date.split('-').reverse().join('/') : budget.date) || '',
    lines: budget.lines || [],
    subtotal: budget.subtotal || 0,
    iva: budget.iva || 0,
    total: budget.total || 0,
  };

  const res = await fetch('/api/invoice-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`No se pudo generar el PDF (${res.status}). ${t}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function generateDocx() {
  alert('El modo Word no está disponible.');
}
