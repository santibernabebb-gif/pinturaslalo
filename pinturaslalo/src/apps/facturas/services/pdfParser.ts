
import { BudgetData } from '../types';

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

  // Marcadores adicionales para borrar/posicionar zonas de forma estable
  // - clienteBoxY: etiqueta del bloque de cliente del PDF base (ej. "PARA EL CLIENTE" / "CLIENTE")
  // - tableHeaderY: encabezado de tabla ("CONCEPTO" / "DESCRIPCIÓN")
  // - totalMarkerY: texto "TOTAL" del bloque de totales (para NO taparlo)
  let clienteBoxY: number | undefined = undefined;
  let tableHeaderY: number | undefined = undefined;
  let totalMarkerY: number | undefined = undefined;

  for (const it of allItems) {
    const s = (it.str || '').toString().trim().toUpperCase();
    if (!clienteBoxY && (s.includes('PARA EL CLIENTE') || s === 'CLIENTE:' || s === 'CLIENTE')) {
      clienteBoxY = it.y;
    }
    if (!tableHeaderY && (s.includes('CONCEPTO') || s.includes('DESCRIPCION') || s.includes('DESCRIPCIÓN'))) {
      tableHeaderY = it.y;
    }
    if (!totalMarkerY && s === 'TOTAL') {
      totalMarkerY = it.y;
    }
  }

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
  const sortedItems = [...allItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
    return a.x - b.x;
  });

  let footerMarkerY: number | undefined = undefined;
  let ivaMarkerY: number | undefined = undefined;
  let currentRunText = "";
  let currentRunY = -1;
  let lastXEnd = -1;

  for (const item of sortedItems) {
    const isSameLine = currentRunY === -1 || Math.abs(item.y - currentRunY) < 2;
    const isCloseX = lastXEnd === -1 || (item.x - lastXEnd) < 5;

    if (isSameLine && isCloseX) {
      currentRunText += item.str;
      lastXEnd = item.x + item.width;
      if (currentRunY === -1) currentRunY = item.y;
    } else {
      if (currentRunText) {
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
          break;
        }
      }

      currentRunText = item.str;
      currentRunY = item.y;
      lastXEnd = item.x + item.width;
    }
  }

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
    ivaMarkerY,
    totalMarkerY,
    clienteBoxY,
    tableHeaderY
  };
}