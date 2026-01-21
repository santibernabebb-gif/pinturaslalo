
export interface InvoiceLine {
  description: string;
  units: number;
  priceUnit: number;
  total: number;
}

export interface BudgetData {
  id: string;
  fileName: string;
  clientName: string;
  date: string;
  lines: InvoiceLine[];
  subtotal: number;
  iva: number;
  total: number;
  originalBuffer?: ArrayBuffer; // Almacena el PDF original para el modo overlay
  detectedTotals?: {
    subtotal: number;
    iva: number;
    total: number;
  };
  footerMarkerY?: number; // Coordenada Y de la palabra 'IMPORTANTE'
  ivaMarkerY?: number;    // Coordenada Y del bloque "IVA 21%" (para proteger el recorte)

  // Marcadores adicionales (coordenadas en el sistema PDFJS) para overlays
  titleMarkerY?: number;      // Y del texto "PRESUPUESTO" (título)
  titleMarkerX?: number;      // X aproximada del título
  clientBoxMarkerY?: number;  // Y del bloque "PARA EL CLIENTE" (para tapar...)
  notesMarkerY?: number;      // Y del texto "NOTAS" (para borrar hacia abajo)
  totalBlockMarkerY?: number; // Y del texto "TOTAL" del bloque de totales (para proteger el recorte)
}

export interface InvoiceConfig {
  number: string;
  date: string;
}

export const MONTHS_ABREV_ES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

export const EMISOR_DATA = {
  name: "Eduardo Quilis Llorens",
  nif: "21667776-M",
  address: "C/ Cervantes 41",
  city: "Onil · 03430",
  email: "quilislalo@gmail.com",
  phone: "620-944-229"
};
