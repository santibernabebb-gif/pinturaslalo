import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

// Nota: NO tocamos la cabecera (logo/emisor). Solo tapamos zonas concretas.
const OVERLAY = {
  fallback: {
    titleWipe: { x: 0, y: 700, w: 595, h: 60 },
    clientWipe: { x: 40, y: 600, w: 515, h: 55 },
  },
  texts: {
    titulo: { size: 34, label: "FACTURA" },
    sub_datos: { size: 11 },
    num_lateral: { x: 14, y: 560, size: 13, rotateDeg: 90 }
  }
};

export async function generatePdf(
  budget: BudgetData,
  config: InvoiceConfig,
  invoiceCode: string
): Promise<string> {
  const PDFLib = (window as any).PDFLib;
  if (!PDFLib) throw new Error("PDF-Lib no cargada.");

  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

  if (!budget.originalBuffer) throw new Error("No hay buffer original.");

  const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), {
    ignoreEncryption: true
  });

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1) TAPAR SOLO el título "PRESUPUESTO" y escribir "FACTURA"
  const titleY = typeof budget.titleMarkerY === 'number' ? budget.titleMarkerY : undefined;

  // Franja segura (no tocar cabecera ni bloque gris)
  const SAFE_TOP = 710;      // techo
  const SAFE_BOTTOM = 650;   // suelo

  // 🔧 AJUSTE: hacemos el blanco ~1cm más grande
  const WIPE_H = 76;         // antes 48 (≈ +28 puntos ~ 1 cm)

  const titleWipe = (() => {
    // base: calculamos igual que antes, pero hacemos crecer hacia ARRIBA:
    // al aumentar la altura, bajamos y la mitad del extra (o todo el extra) para cubrir arriba.
    let yBase = (titleY !== undefined) ? (titleY - 44) : 670;

    // extra respecto a antes (48 -> 76)
    const EXTRA = 76 - 48; // 28

    // bajamos el rectángulo para que el crecimiento sea hacia arriba
    let y = yBase - EXTRA;

    // clamp dentro de la franja segura
    if (y + WIPE_H > SAFE_TOP) y = SAFE_TOP - WIPE_H;
    if (y < SAFE_BOTTOM) y = SAFE_BOTTOM;

    return { x: 0, y, w: 595, h: WIPE_H };
  })();

  firstPage.drawRectangle({
    x: titleWipe.x,
    y: titleWipe.y,
    width: titleWipe.w,
    height: titleWipe.h,
    color: rgb(1, 1, 1),
    opacity: 1,
  });

  const titleText = OVERLAY.texts.titulo.label;
  const titleSize = OVERLAY.texts.titulo.size;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);

  // FACTURA se queda donde estaba (bien centrado dentro del blanco)
  const drawTitleY = titleWipe.y + 10;

  firstPage.drawText(titleText, {
    x: (LAYOUT.width - titleWidth) / 2,
    y: drawTitleY,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 2) TAPAR la zona central del cliente original y escribir cliente/fecha
  const clientY = typeof budget.clientBoxMarkerY === 'number' ? budget.clientBoxMarkerY : undefined;
  const clientWipe = clientY !== undefined
    ? { x: 40, y: Math.max(0, clientY - 28), w: 515, h: 78 }
    : OVERLAY.fallback.clientWipe;

  firstPage.drawRectangle({
    x: clientWipe.x,
    y: clientWipe.y,
    width: clientWipe.w,
    height: clientWipe.h,
    color: rgb(1, 1, 1),
    opacity: 1,
  });

  const dateFormatted = config.date.split('-').reverse().join('/');
  const infoLine = `CLIENTE: ${(budget.clientName || "").toUpperCase()}      FECHA: ${dateFormatted}`;
  const infoSize = OVERLAY.texts.sub_datos.size;
  const infoWidth = fontBold.widthOfTextAtSize(infoLine, infoSize);
  const infoY = clientWipe.y + Math.floor(clientWipe.h / 2) - 4;

  firstPage.drawText(infoLine, {
    x: (LAYOUT.width - infoWidth) / 2,
    y: infoY,
    size: infoSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 3) Lateral factura
  firstPage.drawText(invoiceCode, {
    x: OVERLAY.texts.num_lateral.x,
    y: OVERLAY.texts.num_lateral.y,
    size: OVERLAY.texts.num_lateral.size,
    font: fontBold,
    rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
    color: rgb(0, 0, 0)
  });

  // 4) NOTAS (esto ya está perfecto, NO tocar)
  const NOTES_LINE_Y = 105;
  firstPage.drawRectangle({
    x: 0,
    y: 0,
    width: LAYOUT.width,
    height: NOTES_LINE_Y,
    color: rgb(1, 1, 1),
    opacity: 1,
    borderOpacity: 0,
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
  alert("El modo Word no está disponible.");
}
