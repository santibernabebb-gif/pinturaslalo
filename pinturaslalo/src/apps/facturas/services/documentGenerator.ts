import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

// Nota: NO tocamos la cabecera (logo/emisor). Solo tapamos zonas concretas.
const OVERLAY = {
  // Rectángulos por defecto (fallback) si no se detectan marcadores en el PDF.
  // Coordenadas en puntos PDF (origen abajo-izquierda).
  fallback: {
    // Zona del título "PRESUPUESTO" (sin tocar la cabecera superior)
    titleWipe: { x: 0, y: 700, w: 595, h: 60 },
    // Zona central donde va el bloque Cliente/Fecha (caja grande)
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

  // 1) TAPAR SOLO el título "PRESUPUESTO" y escribir "FACTURA" en el mismo sitio.
  //    (No tocamos cabecera)
  const titleY = typeof budget.titleMarkerY === 'number' ? budget.titleMarkerY : undefined;
  // Tapamos SOLO la zona del texto "PRESUPUESTO" (sin subir a cabecera).
  // Y = baseline del texto en coordenadas PDF; bajamos el wipe para no tocar arriba.
  const titleWipe = titleY !== undefined
    ? (() => {
      // Tapar "PRESUPUESTO" sin tocar la cabecera superior (logo/datos)
      const HEADER_LIMIT = 720; // techo del rectángulo de borrado
      const WIPE_H = 62;
      let y = Math.max(0, titleY - 32);
      // Si el rectángulo sube demasiado, lo bajamos
      if (y + WIPE_H > HEADER_LIMIT) y = Math.max(0, HEADER_LIMIT - WIPE_H);
      return { x: 0, y, w: 595, h: WIPE_H };
    })()
    : OVERLAY.fallback.titleWipe;

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
  // Dibujamos FACTURA un poco más abajo que el PRESUPUESTO original para que no tape cabecera
  const drawTitleY = titleY !== undefined ? (titleY - 25) : (OVERLAY.fallback.titleWipe.y + 10);

  firstPage.drawText(titleText, {
    x: (LAYOUT.width - titleWidth) / 2,
    y: drawTitleY,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 2) TAPAR la zona central del cliente original y escribir el cliente/fecha de la app
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

  // 3. Escribir código de factura lateral
  firstPage.drawText(invoiceCode, {
    x: OVERLAY.texts.num_lateral.x,
    y: OVERLAY.texts.num_lateral.y,
    size: OVERLAY.texts.num_lateral.size,
    font: fontBold,
    rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
    color: rgb(0, 0, 0)
  });

  // 4) BORRAR DESDE "NOTAS" HACIA ABAJO (sin tapar Base/IVA/Total)
  // ✅ CAMBIO ÚNICO: aseguramos que "NOTAS:" desaparece SIEMPRE.
  // - Si hay marcador notesMarkerY, lo usamos.
  // - Si no hay marcador, usamos una Y fija (porque en esta plantilla NOTAS está siempre en el mismo sitio).
  // - Y luego protegemos el bloque de totales para no cortarlo nunca.

  // Y fija (plantilla): altura aproximada de la raya encima de NOTAS.
  // Esto hace que, aunque falle el detector, NO se vea NOTAS nunca.
  const FIXED_NOTES_CUT_Y = 145;

  // Margen para cubrir letras y la raya (subimos un poco para tapar "NOTAS:" completo)
  const NOTES_COVER_MARGIN = 45;

  const markerY =
    (typeof budget.notesMarkerY === 'number' ? budget.notesMarkerY : undefined) ??
    (typeof budget.footerMarkerY === 'number' ? budget.footerMarkerY : undefined);

  // Queremos tapar desde abajo hasta justo "a la altura de NOTAS / raya".
  // En pdf-lib: drawRectangle con y=0 y height=yStart tapa la parte inferior.
  // Para que NOTAS desaparezca, yStart debe estar por ENCIMA del texto "NOTAS:".
  let yStart = typeof markerY === 'number'
    ? (markerY + NOTES_COVER_MARGIN)
    : FIXED_NOTES_CUT_Y;

  // Protección: no cortar totales nunca
  // (Si los detectores fallan, este límite evita tapar Base/IVA/Total).
  if (typeof budget.totalBlockMarkerY === 'number') {
    const maxAllowed = budget.totalBlockMarkerY - 20;
    if (yStart > maxAllowed) yStart = maxAllowed;
  }

  if (typeof budget.ivaMarkerY === 'number') {
    const maxAllowed = budget.ivaMarkerY - 20;
    if (yStart > maxAllowed) yStart = maxAllowed;
  }

  // Clamp
  yStart = Math.max(0, Math.min(LAYOUT.height, yStart));

  // Tapado final (DEBE ser lo último que se dibuja)
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
