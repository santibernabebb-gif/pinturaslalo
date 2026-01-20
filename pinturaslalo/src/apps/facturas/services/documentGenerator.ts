import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

const OVERLAY = {
  covers: [
    // NO tocamos la zona superior (logo/nombre). Solo limpiamos el título "PRESUPUESTO" del PDF base
    // y el recuadro de datos del cliente.
    { name: "presupuesto_title_wipe", x: 0, y: 670, w: 595, h: 85 },
    { name: "info_wipe",  x: 40,  y: 615, w: 515, h: 50 },
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
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Limpieza de cabecera y datos de cliente originales (Overlays superiores)
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

  // 2. Escribir nuevos datos de cabecera
  const titleText = OVERLAY.texts.titulo.label;
  const titleSize = OVERLAY.texts.titulo.size;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  
  firstPage.drawText(titleText, {
    x: (LAYOUT.width - titleWidth) / 2,
    y: OVERLAY.texts.titulo.y,
    size: titleSize,
    font: fontBold,
    color: rgb(LAYOUT.blueColor.r, LAYOUT.blueColor.g, LAYOUT.blueColor.b)
  });

  const dateFormatted = config.date.split('-').reverse().join('/');
  const fullInfoLine = `CLIENTE: ${(budget.clientName || "CLIENTE").toUpperCase()}      |      FECHA: ${dateFormatted}`;
  const infoSize = OVERLAY.texts.sub_datos.size;
  const infoWidth = fontBold.widthOfTextAtSize(fullInfoLine, infoSize);

  firstPage.drawText(fullInfoLine, {
    x: (LAYOUT.width - infoWidth) / 2,
    y: OVERLAY.texts.sub_datos.y,
    size: infoSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 3. Escribir código de factura lateral
  firstPage.drawText(invoiceCode, {
    x: OVERLAY.texts.num_lateral.x,
    y: OVERLAY.texts.num_lateral.y,
    size: OVERLAY.texts.num_lateral.size,
    font: fontBold,
    rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
    color: rgb(0, 0, 0)
  });

  // 4. ELIMINAR SIEMPRE EL BLOQUE "IMPORTANTE" (SIN CROPBOX)
  // CropBox puede fallar según visor/impresora. Para que sea 100% fiable, tapamos al final con un rectángulo blanco.
  // Regla: tapar desde yStart hacia abajo, dejando siempre visibles IVA/TOTAL.
  const SAFE_GAP_UNDER_IVA = 28; // margen en blanco bajo IVA/TOTAL
  const FALLBACK_Y = 160;        // si no detectamos IVA, tapamos a un punto seguro inferior

  let yStart = FALLBACK_Y;
  if (budget.ivaMarkerY !== undefined) {
    yStart = budget.ivaMarkerY - SAFE_GAP_UNDER_IVA;
  }
  if (budget.footerMarkerY !== undefined) {
    // Asegurar que "IMPORTANTE" siempre queda dentro de la zona tapada.
    yStart = Math.max(yStart, budget.footerMarkerY + 40);
  }

  // Clamp a página
  yStart = Math.max(0, Math.min(LAYOUT.height, yStart));

  // IMPORTANTÍSIMO: dibujar lo último para que borre cualquier texto que hubiera debajo.
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
  alert("El modo Word no está disponible.");
}