import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

const OVERLAY = {
  covers: [
    { name: "top_header_cleaner", x: 0, y: 790, w: 595, h: 52 }, 
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

  // 4) BORRADO FIABLE DEL BLOQUE "IMPORTANTE" (SIN CROPBOX)
  // CropBox puede ser ignorado por algunos visores/impresión. Para que SIEMPRE desaparezca,
  // tapamos visualmente con un rectángulo blanco dibujado AL FINAL.
  //
  // Reglas:
  // - Si detectamos "IMPORTANTE", usamos su Y + margen.
  // - Si NO lo detectamos, usamos un FALLBACK_Y fijo situado por debajo de IVA/TOTAL.
  // - Nunca tapar IVA/TOTAL: limitamos el tapado por debajo de la marca de IVA.
  // Fallback pensado para tapar TODO lo inferior sin comerse IVA/TOTAL.
  // Usamos la marca de IVA (si existe) y bajamos lo suficiente como para quedar por debajo del recuadro.
  const FALLBACK_Y = (budget.ivaMarkerY !== undefined)
    ? Math.max(0, budget.ivaMarkerY - 70)
    : 250; // valor seguro para la plantilla actual (entre IVA y "IMPORTANTE")

  const yImportantePdfLib = budget.footerMarkerY;
  // Subimos bastante por encima de "IMPORTANTE" para cubrir también bullets/lineas que puedan quedar más arriba.
  let yStart = (yImportantePdfLib !== undefined)
    ? (yImportantePdfLib + 200)
    : FALLBACK_Y;

  // Protección IVA: el tapado debe quedar SIEMPRE por debajo de IVA
  if (budget.ivaMarkerY !== undefined) {
    const SAFE_GAP = 18;
    const maxYStart = budget.ivaMarkerY - SAFE_GAP;
    yStart = Math.min(yStart, maxYStart);
  }

  // Clamp
  yStart = Math.max(0, Math.min(LAYOUT.height, yStart));

  // Tapado final (dibujar lo último)
  if (yStart > 0) {
    firstPage.drawRectangle({
      x: 0,
      y: 0,
      width: LAYOUT.width,
      height: yStart,
      color: rgb(1, 1, 1),
      opacity: 1,
      borderOpacity: 0,
    });
  }

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