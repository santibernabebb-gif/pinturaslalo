
import { GoogleGenAI, Type } from "@google/genai";

export const onRequest = async (context: any) => {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { text } = await context.request.json() as { text: string };
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extrae los datos de esta FACTURA en formato JSON. 
      Busca el nombre del cliente, la fecha (dd/mm/aaaa), y las líneas de la tabla (descripción, unidades, precio unitario, total). 
      Calcula subtotal, iva (21%) y total final si no están claros.
      
      Texto de la FACTURA:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING },
            date: { type: Type.STRING },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  units: { type: Type.NUMBER },
                  priceUnit: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                },
                required: ["description", "units", "priceUnit", "total"]
              }
            },
            subtotal: { type: Type.NUMBER },
            iva: { type: Type.NUMBER },
            total: { type: Type.NUMBER }
          },
          required: ["clientName", "date", "lines", "subtotal", "iva", "total"]
        }
      }
    });

    const resultText = response.text || "{}";

    return new Response(resultText, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
