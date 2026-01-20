import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

const OVERLAY = {
  covers: [
    // NOTA: Ya NO limpiamos la cabecera superior (logo/nombre) para evitar cortes.
    // La limpieza del bloque central se calcula dinámicamente a partir de marcadores del PDF.
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

  // 1) LIMPIEZA FIABLE DE LA ZONA CENTRAL
  // Objetivo: borrar SIEMPRE el bloque heredado del PDF base donde aparecen textos dentro
  // del recuadro de cliente/fecha heredados.
  // Se calcula con:
  // - tableHeaderY: encabezado de tabla (CONCEPTO/DESCRIPCIÓN)
  // - clienteBoxY: etiqueta del bloque cliente (PARA EL CLIENTE/CLIENTE)
  const headerY = typeof budget.tableHeaderY === 'number' ? budget.tableHeaderY : 510;
  const boxY = typeof budget.clienteBoxY === 'number' ? budget.clienteBoxY : 640;

  // Inferior del borrado: justo por encima del encabezado de tabla
  const midBottomY = Math.min(LAYOUT.height, Math.max(0, headerY + 22));
  // Superior del borrado: por encima del bloque cliente pero sin invadir el título
  const midTopY = Math.min(LAYOUT.height, Math.max(midBottomY + 40, boxY + 120));
  const midHeight = midTopY - midBottomY;

  if (midHeight > 10) {
    firstPage.drawRectangle({
      x: 0,
      y: midBottomY,
      width: LAYOUT.width,
      height: midHeight,
      color: rgb(1, 1, 1),
      opacity: 1,
      borderOpacity: 0,
    });
  }

  // 2) Título FACTURA (sin tocar cabecera superior)
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

  // 2.b) Cliente y fecha encima del blanco (sin superposiciones)
  const dateFormatted = config.date.split('-').reverse().join('/');
  const infoSize = OVERLAY.texts.sub_datos.size;

  const clientText = `CLIENTE: ${(budget.clientName || 'AQUI NOMBRE DE CLIENTE').toUpperCase()}`;
  const dateText = `FECHA: ${dateFormatted}`;

  // Colocación derivada del bloque cliente para ser consistente entre facturas
  const infoY = Math.min(OVERLAY.texts.sub_datos.y, Math.max(0, boxY + 15));

  firstPage.drawText(clientText, {
    x: 60,
    y: infoY,
    size: infoSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  firstPage.drawText(dateText, {
    x: LAYOUT.width - 230,
    y: infoY,
    size: infoSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 3) Código lateral (se mantiene)
  firstPage.drawText(invoiceCode, {
    x: OVERLAY.texts.num_lateral.x,
    y: OVERLAY.texts.num_lateral.y,
    size: OVERLAY.texts.num_lateral.size,
    font: fontBold,
    rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
    color: rgb(0, 0, 0)
  });

  // 4) BORRADO FIABLE DEL PIE (NOTAS/IMPORTANTE) SIN TAPAR TOTALES
  // Tapar desde IMPORTANTE/NOTAS hacia abajo, pero NUNCA tapar el TOTAL.
  const FALLBACK_Y = 160;
  let yStart = typeof budget.footerMarkerY === 'number' ? (budget.footerMarkerY + 60) : FALLBACK_Y;

  // Protección de TOTAL: si tenemos su Y, el tapado debe quedar por debajo del texto TOTAL.
  if (typeof budget.totalMarkerY === 'number') {
    const maxY = budget.totalMarkerY - 18;
    yStart = Math.min(yStart, maxY);
  }

  // Si por protección quedara demasiado bajo y no tapara "IMPORTANTE", relajamos el margen.
  if (typeof budget.footerMarkerY === 'number' && yStart < budget.footerMarkerY + 12) {
    yStart = budget.footerMarkerY + 12;
    if (typeof budget.totalMarkerY === 'number') {
      yStart = Math.min(yStart, budget.totalMarkerY - 18);
    }
  }

  // Clamp
  yStart = Math.max(0, Math.min(LAYOUT.height, yStart));

  // Tapado final (DEBE ser lo último)
  firstPage.drawRectangle({
    x: 0,
    y: 0,
    width: LAYOUT.width,
    height: yStart,
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