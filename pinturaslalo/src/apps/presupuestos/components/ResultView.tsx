
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Send, Home } from 'lucide-react';
import { BudgetData } from '../types';
import { generateDocx, downloadBlob } from '../services/documentService';

interface Props {
  data: BudgetData;
  onReset: () => void;
  autoDownload?: boolean;
  onAutoDownloadComplete?: () => void;
}

const ResultView: React.FC<Props> = ({ data, onReset, autoDownload, onAutoDownloadComplete }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Lógica de densidad basada en el número de líneas
  const rowCount = data.lines.length;
  const isCompact = rowCount > 12;
  const isUltraCompact = rowCount > 22;

  const styles = {
    cellPadding: isUltraCompact ? 'p-1' : isCompact ? 'p-1.5' : 'p-3',
    fontSize: isUltraCompact ? 'text-[9px]' : isCompact ? 'text-[10px]' : 'text-[11px]',
    headerSize: isUltraCompact ? 'text-lg' : 'text-xl',
    sectionGap: isUltraCompact ? 'mb-2' : isCompact ? 'mb-4' : 'mb-8',
    titleSize: isUltraCompact ? 'text-2xl' : isCompact ? 'text-3xl' : 'text-4xl',
    tableLeading: isUltraCompact ? 'leading-[1.1]' : 'leading-tight'
  };

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const padding = window.innerWidth < 768 ? 20 : 48;
        const availableWidth = containerRef.current.offsetWidth - padding;
        const a4WidthPx = 794; 
        
        if (availableWidth < a4WidthPx) {
          setScale(availableWidth / a4WidthPx);
        } else {
          setScale(1);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [data]);

  useEffect(() => {
    if (autoDownload) {
      const timer = setTimeout(() => {
        handleDownloadPdf(true);
        if (onAutoDownloadComplete) onAutoDownloadComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoDownload, data]);

  const handleDownloadDocx = async () => {
    try {
      const blob = await generateDocx(data);
      downloadBlob(blob, `Presupuesto_${data.client.replace(/\s/g, '_')}.docx`);
      // Para DOCX mantenemos el mismo modal de "Presupuesto listo" (sin cambiar nada del flujo)
      setLastBlobUrl(null);
      setShowSuccess(true);
    } catch (e) {
      console.error("Error al generar Word", e);
    }
  };

  const handleDownloadPdf = (isAuto = false) => {
    const element = document.getElementById('template-preview');
    if (!element) return;
    
    const opt = {
      margin: 0,
      filename: `Presupuesto_${data.client.replace(/\s/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollY: 0,
        windowWidth: 794,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: 'avoid-all' }
    };
    
    // @ts-ignore
    window.html2pdf()
      .set(opt)
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        if (totalPages > 1) {
          for (let i = totalPages; i > 1; i--) {
            pdf.deletePage(i);
          }
        }

        // Generar blob para poder compartir/enviar (y descargar como en Facturas)
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        setLastBlobUrl(blobUrl);

        // Descarga forzada
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `Presupuesto_${data.client.replace(/\s/g, '_')}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (!isAuto) setShowSuccess(true);
      })
      .catch((e) => {
        console.error('Error al generar PDF', e);
      });
  };

  const sharePresupuesto = async () => {
    if (!lastBlobUrl) {
      // Si no hay URL (p.ej. descargó DOCX), simplemente cerramos modal
      return;
    }
    try {
      const response = await fetch(lastBlobUrl);
      const blob = await response.blob();
      const file = new File([blob], `Presupuesto_${data.client.replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Presupuesto ${data.client}` });
      } else {
        window.open(lastBlobUrl, '_blank');
      }
    } catch (err) {
      window.open(lastBlobUrl, '_blank');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white rounded-3xl shadow-2xl mt-6 border border-gray-100 relative overflow-hidden">
      {/* Modal post-descarga (igual que en Facturas) */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSuccess(false)}
          ></div>
          <div className="bg-white w-full max-w-[340px] rounded-[36px] p-8 shadow-2xl relative text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-[22px] font-black mb-2 uppercase tracking-tight">Presupuesto Listo</h3>
            <p className="text-slate-500 text-sm font-bold mb-8">El archivo se ha descargado. Puedes compartirlo ahora.</p>
            <div className="space-y-3">
              <button
                onClick={sharePresupuesto}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-[15px] flex items-center justify-center gap-3 uppercase tracking-wider shadow-lg shadow-blue-200"
              >
                <Send className="w-4.5 h-4.5" /> Compartir / Enviar
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  onReset();
                }}
                className="w-full h-14 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[15px] flex items-center justify-center gap-3 uppercase tracking-wider border border-emerald-100"
              >
                <Home className="w-4.5 h-4.5" /> Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Vista Previa Profesional</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Plantilla: Lalo Quilis Oficial (v2.2 Original)</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={onReset}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-black transition flex items-center space-x-2 text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>NUEVA CAPTURA</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <button
          onClick={handleDownloadDocx}
          className="group flex items-center justify-center space-x-3 bg-slate-800 text-white py-4 px-6 rounded-2xl hover:bg-slate-900 transition-all shadow-xl active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-black text-sm uppercase">WORD (.DOCX)</span>
        </button>
        <button
          onClick={() => handleDownloadPdf(false)}
          className="flex items-center justify-center space-x-3 bg-blue-600 text-white py-4 px-6 rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="font-black text-sm uppercase">DESCARGAR PDF</span>
        </button>
      </div>

      <div 
        ref={containerRef}
        className="bg-zinc-200 p-2 sm:p-6 md:p-10 rounded-3xl shadow-inner flex justify-center items-start overflow-hidden border border-gray-300"
        style={{ minHeight: `${scale * 1122}px` }} 
      >
        <div 
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          <div 
            id="template-preview" 
            ref={previewRef}
            className="bg-white shadow-2xl p-10 md:p-12 w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] text-black font-sans relative flex flex-col box-border overflow-hidden"
            style={{ lineHeight: '1.2' }}
          >
            {/* Cabecera idéntica a la plantilla real */}
            <div className={`flex justify-between items-start ${isUltraCompact ? 'mb-4' : 'mb-8'}`}>
              <div className="flex flex-col">
                <h2 className={`${styles.headerSize} font-black uppercase tracking-tighter text-gray-900 mb-1`}>Eduardo Quilis Llorens</h2>
                <div className={`${isUltraCompact ? 'text-[9px]' : 'text-[11px]'} font-bold text-gray-700 space-y-0.5`}>
                  <p>C/ Cervantes 41 • Onil • 03430</p>
                  <p>quilislalo@gmail.com</p>
                  <p className="text-gray-900 font-black pt-1">Tel: 620-944-229 • NIF: 21667776-M</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className={`bg-slate-900 text-white p-2 rounded-xl flex flex-col items-center ${isUltraCompact ? 'w-32' : 'w-40'} shadow-xl`}>
                  <div className="flex items-center space-x-2 w-full justify-center">
                    <div className={`${isUltraCompact ? 'text-sm' : 'text-lg'} font-black leading-tight tracking-tighter text-center`}>LALO<br/>QUILIS</div>
                    <div className={`${isUltraCompact ? 'h-6' : 'h-8'} w-1.5 flex flex-col justify-between`}>
                        <div className="h-1/3 bg-sky-400"></div>
                        <div className="h-1/3 bg-rose-500"></div>
                        <div className="h-1/3 bg-amber-400"></div>
                    </div>
                  </div>
                  <div className="text-[7px] mt-1 border-t border-white/20 pt-1 tracking-[0.2em] uppercase font-black text-blue-300">Pinturas y Decoración</div>
                </div>
              </div>
            </div>
            
            <div className={`text-center ${isUltraCompact ? 'mb-4' : 'mb-6'}`}>
               <h1 className={`${styles.titleSize} font-black text-slate-800 tracking-[0.1em] uppercase border-b-2 border-slate-800 pb-1 inline-block`}>PRESUPUESTO</h1>
            </div>

            {/* Recuadro de Cliente */}
            <div className={`${styles.sectionGap} bg-slate-50 p-3 border-2 border-slate-200 rounded-xl flex justify-between items-center shadow-sm`}>
              <div className="flex-1">
                <p className="text-[8px] uppercase font-black text-slate-400 mb-0.5">PARA EL CLIENTE:</p>
                <p className={`${isUltraCompact ? 'text-sm' : 'text-lg'} font-black uppercase text-slate-900 underline decoration-slate-400 decoration-2 underline-offset-4`}>{data.client}</p>
              </div>
              <div className="text-right pl-6 border-l-2 border-slate-200">
                <p className="text-[8px] uppercase font-black text-slate-400 mb-0.5">FECHA:</p>
                <p className={`${isUltraCompact ? 'text-xs' : 'text-sm'} font-black text-slate-900`}>{data.date}</p>
              </div>
            </div>

            {/* Tabla Principal */}
            <div className="flex-grow overflow-hidden flex flex-col">
              <table className={`w-full border-collapse border-2 border-slate-900 ${styles.fontSize}`}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-800 text-white uppercase text-[9px] font-black tracking-wider">
                    <th className={`border-2 border-slate-900 ${styles.cellPadding} text-left w-[55%]`}>CONCEPTO / DESCRIPCIÓN</th>
                    <th className={`border-2 border-slate-900 ${styles.cellPadding} text-center w-[12%]`}>UDS.</th>
                    <th className={`border-2 border-slate-900 ${styles.cellPadding} text-center w-[15%]`}>P. UNIT (€)</th>
                    <th className={`border-2 border-slate-900 ${styles.cellPadding} text-center w-[18%] bg-slate-700`}>TOTAL (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, i) => (
                    <tr key={i} className={`${styles.tableLeading} ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className={`border-2 border-slate-900 ${styles.cellPadding} font-bold uppercase text-slate-800`}>{line.description}</td>
                      <td className={`border-2 border-slate-900 ${styles.cellPadding} text-center font-black`}>{line.units || ''}</td>
                      <td className={`border-2 border-slate-900 ${styles.cellPadding} text-right font-black`}>{line.unitPrice ? `${line.unitPrice.toFixed(2)}€` : ''}</td>
                      <td className={`border-2 border-slate-900 ${styles.cellPadding} text-right font-black bg-slate-100/30`}>{line.totalPrice ? `${line.totalPrice.toFixed(2)}€` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className={`flex justify-end mt-4 ${styles.sectionGap}`}>
              <div className={`${isUltraCompact ? 'w-48' : 'w-64'} space-y-0`}>
                <div className="flex border-2 border-slate-900 border-b-0">
                  <div className={`w-1/2 ${styles.cellPadding} font-black bg-slate-50 text-[9px] uppercase`}>Base Imp.</div>
                  <div className={`w-1/2 ${styles.cellPadding} font-black text-right border-l-2 border-slate-900 ${isUltraCompact ? 'text-[11px]' : 'text-[13px]'}`}>{data.subtotal.toFixed(2)}€</div>
                </div>
                
                <div className="flex border-2 border-slate-900 border-b-0">
                  <div className={`w-1/2 ${styles.cellPadding} font-black bg-slate-50 text-[9px] uppercase text-slate-500`}>IVA (21%)</div>
                  <div className={`w-1/2 ${styles.cellPadding} font-black text-right border-l-2 border-slate-900 ${isUltraCompact ? 'text-[11px]' : 'text-[13px]'} text-slate-500`}>{data.iva.toFixed(2)}€</div>
                </div>
                
                <div className="flex border-2 border-slate-900 bg-slate-900 text-white shadow-xl">
                  <div className={`w-1/2 ${styles.cellPadding} font-black uppercase text-[10px] tracking-widest flex items-center`}>TOTAL</div>
                  <div className={`w-1/2 ${styles.cellPadding} font-black text-right border-l-2 border-white/20 ${isUltraCompact ? 'text-lg' : 'text-xl'}`}>{data.total.toFixed(2)}€</div>
                </div>
              </div>
            </div>

            {/* NOTAS: Se mantienen idénticas a la plantilla original (Lista vertical) */}
            <div className={`mt-auto border-t-2 border-slate-900 pt-3`}>
              <h3 className={`font-black italic underline mb-1 ${isUltraCompact ? 'text-[9px]' : 'text-[11px]'} text-slate-900 uppercase`}>NOTAS:</h3>
              <div className={`${isUltraCompact ? 'text-[8px] space-y-0' : 'text-[9px] space-y-0.5'} font-bold text-slate-700`}>
                <p>• Los trabajos imprevistos no contemplados en este presupuesto se facturarán aparte.</p>
                <p>• El saneamiento de paramentos en mal estado (grietas ocultas, humedades) no está incluido.</p>
                <p>• Forma de pago: 50% al inicio de los trabajos y el restante 50% a la finalización de los mismos.</p>
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-[7px] text-slate-300 uppercase tracking-[0.4em] font-black">SantiSystems Optic Engine</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultView;
