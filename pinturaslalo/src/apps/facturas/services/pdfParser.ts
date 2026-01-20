
import { BudgetData, InvoiceLine } from '../types';

interface PDFTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

export async function parseBudgetPdf(file: File): Promise<BudgetData> {
  const arrayBuffer = await file.arrayBuffer();
  const bufferForPdfJs = arrayBuffer.slice(0);
  
  // @ts-ignore
  const pdf = await window.pdfjsLib.getDocument({ data: bufferForPdfJs }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  
  const allItems: PDFTextItem[] = textContent.items.map((item: any) => ({
    str: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width
  }));

  const textLines = allItems.map(i => i.str).join(' ');
  let detectedClient = "CLIENTE DETECTADO";
  
  const lowerText = textLines.toLowerCase();
  const markers = ["cliente:", "señor/a:", "atn:"];
  
  for (const marker of markers) {
    const idx = lowerText.indexOf(marker);
    if (idx !== -1) {
      const start = idx + marker.length;
      detectedClient = textLines.substring(start, start + 30).trim().split('\n')[0];
      break;
    }
  }

  // DETECCIÓN ROBUSTA DE "IMPORTANTE"
  // 1. Ordenamos items por posición visual: de arriba a abajo (Y desc) y de izquierda a derecha (X asc)
  const sortedItems = [...allItems].sort((a, b) => {
    // Tolerancia de 2 puntos para considerar que están en la misma línea
    if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
    return a.x - b.x;
  });

  let footerMarkerY: number | undefined = undefined;
  let ivaMarkerY: number | undefined = undefined;
  let currentRunText = "";
  let currentRunY = -1;
  let lastXEnd = -1;

  // 2. Agrupamos items en "runs" (cadenas de texto lógicas) basados en proximidad para manejar textos partidos
  for (const item of sortedItems) {
    const isSameLine = currentRunY === -1 || Math.abs(item.y - currentRunY) < 2;
    // Tolerancia de 5 puntos para considerar que los items son parte de la misma palabra/bloque
    const isCloseX = lastXEnd === -1 || (item.x - lastXEnd) < 5;

    if (isSameLine && isCloseX) {
      currentRunText += item.str;
      lastXEnd = item.x + item.width;
      if (currentRunY === -1) currentRunY = item.y;
    } else {
      // Procesar el run completado antes de iniciar el siguiente
      if (currentRunText) {
        const normalized = currentRunText.trim()
          .replace(/\u00A0/g, ' ')      // Normalizar Espacios No Rompibles (NBSP)
          .replace(/\s+/g, ' ')         // Eliminar espacios duplicados
          .toUpperCase()
          .replace(/[^A-Z0-9]+$/, '');  // Eliminar caracteres no alfanuméricos finales (como el ':')

        // Guardar la posición de IVA 21% (si aparece) para proteger el recorte.
        if (ivaMarkerY === undefined && normalized.includes("IVA") && normalized.includes("21")) {
          ivaMarkerY = currentRunY;
        }

        if (normalized.includes("IMPORTANTE")) {
          footerMarkerY = currentRunY;
          break; // Detener búsqueda al encontrar la marca
        }
      }

      // Reiniciar para el siguiente item/run
      currentRunText = item.str;
      currentRunY = item.y;
      lastXEnd = item.x + item.width;
    }
  }

  // Comprobación final por si el match estaba en el último run procesado
  if (footerMarkerY === undefined && currentRunText) {
    const normalized = currentRunText.trim()
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase()
      .replace(/[^A-Z0-9]+$/, '');

    if (ivaMarkerY === undefined && normalized.includes("IVA") && normalized.includes("21")) {
      ivaMarkerY = currentRunY;
    }

    if (normalized.includes("IMPORTANTE")) {
      footerMarkerY = currentRunY;
    }
  }

  // Fallback extra (muy importante): algunos PDFs devuelven "IMPORTANTE" como item suelto
  // o con separaciones raras que no entran bien en la lógica de "runs".
  // Si no lo hemos detectado, buscamos de forma directa en los items.
  if (footerMarkerY === undefined) {
    for (const it of allItems) {
      const s = (it.str || '').toString().toUpperCase();
      if (s.includes('IMPORTANTE')) {
        footerMarkerY = it.y;
        break;
      }
    }
  }

  // Fallback IVA 21% directo (para proteger el recorte en generatePdf)
  if (ivaMarkerY === undefined) {
    for (const it of allItems) {
      const s = (it.str || '').toString().toUpperCase();
      if (s.includes('IVA') && s.includes('21')) {
        ivaMarkerY = it.y;
        break;
      }
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    clientName: detectedClient,
    date: new Date().toLocaleDateString('es-ES'),
    lines: [],
    subtotal: 0,
    iva: 0,
    total: 0,
    originalBuffer: arrayBuffer,
    footerMarkerY,
    ivaMarkerY
  };
}
