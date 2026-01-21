import { GoogleGenAI, Type } from "@google/genai";
import { BudgetData } from "../types";

const budgetSchema = {
  type: Type.OBJECT,
  properties: {
    client: { type: Type.STRING, description: "Nombre del cliente (extraído de cualquiera de las fotos)" },
    date: { type: Type.STRING, description: "Fecha (extraída de cualquiera de las fotos)" },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Descripción del trabajo o concepto" },
          units: { type: Type.NUMBER, description: "Cantidad numérica (si existe)" },
          unitPrice: { type: Type.NUMBER, description: "Precio unitario (si existe)" },
        },
        required: ["description"]
      }
    }
  },
  required: ["client", "date", "lines"]
};

export const extractBudgetData = async (base64Images: string[]): Promise<BudgetData> => {
  // ✅ EN VITE/FRONTEND: las variables deben venir de import.meta.env y empezar por VITE_
  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_PDFSHIFT_API_KEY ||
    (import.meta as any).env?.VITE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "API key no configurada. Define VITE_GEMINI_API_KEY (recomendado) en Cloudflare Pages → Settings → Environment variables."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';

  const prompt = `
    Analiza estas ${base64Images.length} imágenes que corresponden a un mismo presupuesto.
    REQUISITOS DE EXTRACCIÓN:
    - Combina toda la información en un único JSON estructurado.
    - Extrae el cliente y la fecha (usa la fecha de hoy si no se encuentra ninguna).
    - IMPORTANTE: Incluye TODAS las líneas de texto relevantes encontradas en el documento, incluso aquellas que NO tengan valores numéricos (unidades o precio). Estas líneas pueden ser encabezados de sección, anuncios de otros presupuestos internos, subtítulos o notas importantes.
    - Crea una lista de partidas unificada con descripción de TODAS las páginas.
    - Si una línea tiene descripción pero no tiene unidades o precio, pon 0 en esos campos numéricos.
    - Evita duplicar líneas si aparecen en varias fotos por solapamiento de la cámara.
    - Mantén el orden de aparición del documento original.
    - RESPONDE SOLO CON EL JSON.
  `;

  try {
    const imageParts = base64Images.map(base64 => ({
      inlineData: { mimeType: "image/jpeg", data: base64.split(',')[1] }
    }));

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          ...imageParts
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: budgetSchema,
        temperature: 0.1
      }
    });

    if (!response || !response.text) {
      throw new Error("La IA no devolvió contenido.");
    }

    let cleanJson = response.text.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    const rawData = JSON.parse(cleanJson);

    let subtotal = 0;
    const processedLines = rawData.lines
      .filter((l: any) => l.description && l.description.trim() !== "")
      .map((line: any) => {
        const units = parseFloat(line.units) || 0;
        const unitPrice = parseFloat(line.unitPrice) || 0;
        const totalPrice = units * unitPrice;
        subtotal += totalPrice;

        return {
          description: line.description.toUpperCase(),
          units: units > 0 ? units : undefined,
          unitPrice: unitPrice > 0 ? unitPrice : undefined,
          totalPrice: totalPrice > 0 ? totalPrice : undefined
        };
      });

    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    const budgetNumber = `LQ-${Date.now().toString().slice(-6)}`;

    return {
      budgetNumber,
      client: (rawData.client || "CLIENTE").toUpperCase(),
      date: rawData.date || new Date().toLocaleDateString('es-ES'),
      lines: processedLines,
      subtotal,
      iva,
      total
    };
  } catch (error: any) {
    console.error("DEBUG IA:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Error de formato: La IA no pudo combinar los datos correctamente. Reintenta con mejores fotos.");
    }
    throw new Error(error.message || "Error de conexión con la IA.");
  }
};
