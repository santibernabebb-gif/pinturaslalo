import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

const OVERLAY = {
  covers: [
    // IMPORTANTE: NO tocar la cabecera superior (logo/nombre).
    // Solo limpiamos la franja central donde el PDF base trae textos heredados
    // (la zona que en tu captura va desde "SANTI" hasta la fecha heredada).
    // Coordenadas PDF-lib (origen abajo-izquierda).
    { name: "mid_cleaner", x: 0, y: 560, w: 595, h: 170 },
  ],
  texts: {
    titulo: { y: 802, size: 38, label: "FACTURA" },
    sub_datos: { y: 635, size: 11 },
    num_lateral: { x: 48, y: 550, size: 13, rotateDeg: 90 }
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

  // Tipografías: Times para parecerse más a la plantilla final (como tu imagen).
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // 1) Limpieza SOLO de la franja central (NO tocar cabecera superior)
  OVERLAY.covers.forEach(area => {
    firstPage.drawRectangle({
      x: area.x,
      y: area.y,
      width: area.w,
      height: area.h,
      color: rgb(1, 1, 1),
      opacity: 1
    });
  });

  // 2) Título "FACTURA"
  const titleText = OVERLAY.texts.titulo.label;
  const titleSize = OVERLAY.texts.titulo.size;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);

  firstPage.drawText(titleText, {
    x: (LAYOUT.width - titleWidth) / 2,
    y: OVERLAY.texts.titulo.y,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 2.b) Cliente / Fecha (como en tu imagen final: sin "|" y colocados izq/der)
  const dateFormatted = config.date.split('-').reverse().join('/');
  const infoSize = OVERLAY.texts.sub_datos.size;

  const clientText = `CLIENTE: ${(budget.clientName || "AQUI NOMBRE DE CLIENTE").toUpperCase()}`;
  const dateText = `FECHA: ${dateFormatted}`;

  firstPage.drawText(clientText, {
    x: 60,
    y: OVERLAY.texts.sub_datos.y,
    size: infoSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  firstPage.drawText(dateText, {
    x: LAYOUT.width - 230,
    y: OVERLAY.texts.sub_datos.y,
    size: infoSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 3) Código lateral (se queda como estaba)
  firstPage.drawText(invoiceCode, {
    x: OVERLAY.texts.num_lateral.x,
    y: OVERLAY.texts.num_lateral.y,
    size: OVERLAY.texts.num_lateral.size,
    font: fontBold,
    rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
    color: rgb(0, 0, 0)
  });

  // 4) Tapado inferior (NOTAS / IMPORTANTE) como el fix bueno:
  // - Tapar desde la raya encima de notas hacia abajo.
  // Como no tenemos la raya como texto, usamos "IMPORTANTE" si existe.
  // Si falla, fallback fijo seguro por debajo de IVA/TOTAL.
  const FALLBACK_NOTES_START_Y = 220;
  let yStart = FALLBACK_NOTES_START_Y;

  if (budget.footerMarkerY !== undefined) {
    // Tapar todo lo que empieza en IMPORTANTE hacia abajo, con margen
    yStart = Math.max(0, budget.footerMarkerY + 40);
  }

  // Clamp
  yStart = Math.max(0, Math.min(LAYOUT.height, yStart));

  // IMPORTANTE: esto se dibuja al FINAL para asegurar que borra lo inferior siempre
  firstPage.drawRectangle({
    x: 0,
    y: 0,
    width: LAYOUT.width,
    height: yStart,
    color: rgb(1, 1, 1),
    opacity: 1
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