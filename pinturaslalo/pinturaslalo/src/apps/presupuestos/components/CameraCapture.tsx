
import React, { useRef } from 'react';

interface Props {
  /** Recibe la imagen en base64 (dataURL) lista para enviarla a la IA */
  onCapture: (base64: string) => void;
  /** Opcional: máximo de tamaño (en píxeles) del lado mayor para reducir peso */
  maxSidePx?: number;
  /** Opcional: calidad JPEG (0-1). Por defecto 0.92 */
  jpegQuality?: number;
}

/**
 * Cámara con integración nativa:
 * usa <input type="file" capture="environment"> para que el móvil abra la app de cámara real.
 * Esto ofrece el mejor enfoque y nitidez posible para documentos.
 */
const CameraCapture: React.FC<Props> = ({
  onCapture,
  maxSidePx = 2200,
  jpegQuality = 0.95,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const downscaleIfNeeded = (dataUrl: string) =>
    new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return resolve(dataUrl);

        const maxSide = Math.max(w, h);
        if (maxSide <= maxSidePx) return resolve(dataUrl);

        const scale = maxSidePx / maxSide;
        const nw = Math.round(w * scale);
        const nh = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, nw, nh);
        resolve(canvas.toDataURL('image/jpeg', jpegQuality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1) File -> DataURL
      const dataUrl = await fileToDataUrl(file);
      // 2) Reducir tamaño (optimiza el envío a Gemini)
      const optimized = await downscaleIfNeeded(dataUrl);
      onCapture(optimized);
    } catch (err) {
      console.error("Error procesando imagen:", err);
    } finally {
      // Limpiar input para permitir capturas consecutivas
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full px-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      <div className="relative group">
        {/* Efecto de brillo detrás del botón */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        
        <button
          onClick={openPicker}
          className="relative flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-black py-8 px-16 rounded-3xl shadow-[0_20px_50px_rgba(37,99,235,0.4)] transition-all transform active:scale-95 border-b-8 border-blue-800"
        >
          <div className="bg-white/20 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <span className="text-2xl uppercase tracking-tighter italic">HACER FOTO HD</span>
        </button>
      </div>

      <div className="flex flex-col items-center space-y-2 text-center max-w-sm">
        <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
           <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Óptica Nativa Activada</span>
        </div>
        <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] font-bold">
          Se abrirá la cámara de tu móvil para garantizar el máximo enfoque y resolución.
        </p>
      </div>
      
      <p className="text-gray-300 text-[9px] uppercase tracking-widest font-black italic mt-4">SantiSystems Optic Engine v4.0</p>
    </div>
  );
};

export default CameraCapture;
