import { BudgetData, InvoiceConfig } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 },
};

// Ajustes finos (solo números):
const TITLE_SIZE = 38;
const TITLE_MARGIN_Y = 6; // aire para centrar visualmente sobre la Y detectada
const TITLE_WIPE_HEIGHT = 54; // alto del borrado del título PRESUPUESTO
const TITLE_WIPE_EXTRA_UP = 10;

const FIELD_FONT_SIZE = 12;
const FIELD_WIPE_H = 18;
const FIELD_TEXT_X = 135; // donde empieza a escribirse el valor tras "Cliente:" / "Fecha:"
const FIELD_WIPE_X = 120;
const FIELD_WIPE_W = 420;

const LATERAL_CODE = {
  x: 16, // más a la izquierda para evitar solapes
  y: 535,
  size: 13,
  rotateDeg: 90,
};

// Tapado del bloque inferior (IMPORTANTE / notas):
const SAFE_GAP_UNDER_IVA = 28; // aire por debajo del bloque IVA/TOTAL antes de empezar a tapar
const FALLBACK_Y = 160; // si no detectamos IVA, tapamos desde aquí hacia abajo

// Banda central (debajo del encabezado) donde la plantilla base deja texto
// (p.ej. "PRESUPUESTO") que en FACTURAS debe desaparecer.
// Ajustes finos (solo números):
const MID_WIPE_Y = 680; // inicio (desde abajo) de la banda a limpiar
const MID_WIPE_H = 85;  // alto de la banda a limpiar

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function generatePdf(
  budget: BudgetData,
  config: InvoiceConfig,
  invoiceCode: string
): Promise<string> {
  const PDFLib = (window as any).PDFLib;
  if (!PDFLib) throw new Error('PDF-Lib no cargada.');

  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

  if (!budget.originalBuffer) throw new Error('No hay buffer original.');

  const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), {
    ignoreEncryption: true,
  });

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ============================================================
  // 1) BORRAR SOLO DONDE HACE FALTA (NO TOCAR LOGO/ENCABEZADO)
  //    - Borramos "PRESUPUESTO" (arriba y abajo) para poner "FACTURA"
  // ============================================================

  const wipePresupuestoAtY = (y: number | undefined) => {
    if (y === undefined) return;
    const y0 = clamp(y - TITLE_MARGIN_Y, 0, LAYOUT.height);
    firstPage.drawRectangle({
      x: 0,
      y: clamp(y0 - TITLE_WIPE_EXTRA_UP, 0, LAYOUT.height),
      width: LAYOUT.width,
      height: clamp(TITLE_WIPE_HEIGHT, 0, LAYOUT.height),
      color: rgb(1, 1, 1),
      opacity: 1,
    });
  };

  wipePresupuestoAtY(budget.presupuestoTopY);
  wipePresupuestoAtY(budget.presupuestoBottomY);

  // ============================================================
  // 2) ESCRIBIR "FACTURA" EN LA MISMA POSICIÓN DEL TÍTULO
  // ============================================================

  const drawCenteredTitle = (y: number) => {
    const titleText = 'FACTURA';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, TITLE_SIZE);
    firstPage.drawText(titleText, {
      x: (LAYOUT.width - titleWidth) / 2,
      y: clamp(y + TITLE_MARGIN_Y, 0, LAYOUT.height - 1),
      size: TITLE_SIZE,
      font: fontBold,
      color: rgb(LAYOUT.blueColor.r, LAYOUT.blueColor.g, LAYOUT.blueColor.b),
    });
  };

  // Si no detectamos PRESUPUESTO, usamos fallback cercano a donde suele estar.
  drawCenteredTitle(budget.presupuestoTopY ?? 802);
  // El de abajo solo si existe (para no inventar si la plantilla no lo lleva)
  if (budget.presupuestoBottomY !== undefined) {
    drawCenteredTitle(budget.presupuestoBottomY);
  }

  // ============================================================
  // 2b) LIMPIAR BANDA CENTRAL (NO DEBE VERSE TEXTO DE PRESUPUESTO)
  //     - Se hace aquí para NO tocar logo/encabezado
  //     - No depende del detector (robusto)
  // ============================================================

  firstPage.drawRectangle({
    x: 0,
    y: clamp(MID_WIPE_Y, 0, LAYOUT.height),
    width: LAYOUT.width,
    height: clamp(MID_WIPE_H, 0, LAYOUT.height),
    color: rgb(1, 1, 1),
    opacity: 1,
  });

  // ============================================================
  // 3) CLIENTE / FECHA (SIN SUPERPONER)
  //    - Limpiamos solo el área de escritura y escribimos el valor al lado.
  // ============================================================

  const dateFormatted = config.date.split('-').reverse().join('/');
  const client = (budget.clientName || '').toUpperCase();

  const writeFieldAtLabelY = (labelY: number | undefined, text: string) => {
    if (!labelY) return;
    const y = clamp(labelY - 2, 0, LAYOUT.height - 1);

    // borrar zona donde escribimos (sin tocar la palabra "Cliente:" / "Fecha:")
    firstPage.drawRectangle({
      x: FIELD_WIPE_X,
      y,
      width: FIELD_WIPE_W,
      height: FIELD_WIPE_H,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    firstPage.drawText(text, {
      x: FIELD_TEXT_X,
      y: y + 2,
      size: FIELD_FONT_SIZE,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  };

  // Si por algún motivo no detectamos las etiquetas, caemos a posiciones típicas de esta plantilla.
  const clienteY = budget.clienteLabelY ?? 706;
  const fechaY = budget.fechaLabelY ?? 682;

  writeFieldAtLabelY(clienteY, client);
  writeFieldAtLabelY(fechaY, dateFormatted);

  // ============================================================
  // 4) CÓDIGO LATERAL (más a la izquierda)
  // ============================================================

  firstPage.drawText(invoiceCode, {
    x: LATERAL_CODE.x,
    y: LATERAL_CODE.y,
    size: LATERAL_CODE.size,
    font: fontBold,
    rotate: degrees(LATERAL_CODE.rotateDeg),
    color: rgb(0, 0, 0),
  });

  // ============================================================
  // 5) TAPADO FINAL DEL BLOQUE "IMPORTANTE" / NOTAS (FIABLE)
  //    - NO usamos CropBox
  //    - Se dibuja LO ÚLTIMO
  // ============================================================

  let yStart = FALLBACK_Y;
  if (budget.ivaMarkerY !== undefined) {
    yStart = budget.ivaMarkerY - SAFE_GAP_UNDER_IVA;
  }

  // Si detectamos IMPORTANTE y está por encima del yStart, subimos el tapado para cubrirlo.
  if (budget.footerMarkerY !== undefined) {
    const mustCover = budget.footerMarkerY + 40;
    if (yStart < mustCover) yStart = mustCover;
  }

  yStart = clamp(yStart, 0, LAYOUT.height);

  firstPage.drawRectangle({
    x: 0,
    y: 0,
    width: LAYOUT.width,
    height: yStart,
    color: rgb(1, 1, 1),
    opacity: 1,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export async function generateDocx(
  _budget: BudgetData,
  _config: InvoiceConfig,
  _invoiceCode: string
) {
  alert('El modo Word no está disponible.');
}
