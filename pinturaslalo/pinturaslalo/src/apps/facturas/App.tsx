
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Download, 
  Edit3, 
  Save, 
  Plus, 
  FileCheck,
  XCircle,
  Send,
  RefreshCw,
  ArrowLeft,
  Home
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { BudgetList } from './components/BudgetList';
import { BudgetData, MONTHS_ABREV_ES } from './types';
import { generatePdf } from './services/documentGenerator';

enum Step {
  UPLOAD,
  SETUP,
  PREVIEW
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD);
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState({
    // En blanco por defecto: el usuario escribe sin tener que borrar nada.
    number: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Validaciones simples para que el usuario no deje campos obligatorios en blanco
  const [fieldErrors, setFieldErrors] = useState<{ clientName?: string; invoiceNumber?: string }>({});

  // Persistir historial de carga (FACTURAS) aunque vuelvas atrás o recargues la página
  const HISTORY_STORAGE_KEY = 'lalo_facturas_history_v1';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setBudgets(parsed as BudgetData[]);
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar el historial de facturas:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(budgets));
    } catch (e) {
      console.warn('No se pudo guardar el historial de facturas:', e);
    }
  }, [budgets]);

  const handleBudgetsDetected = (newBudgets: BudgetData[]) => {
    setBudgets(prev => [...newBudgets, ...prev]);
    if (newBudgets.length > 0) {
      setSelectedBudget(newBudgets[0]);
    }
  };

  const getFullInvoiceCode = () => {
    try {
      const dateObj = new Date(invoiceConfig.date);
      const monthAbrev = MONTHS_ABREV_ES[dateObj.getMonth()];
      const year = dateObj.getFullYear().toString().slice(-2);
      // Formato vertical/lateral: "ENE-26_FACTURA_222"
      return `${monthAbrev}-${year}_FACTURA_${invoiceConfig.number}`;
    } catch (e) {
      return `???-??_FACTURA_${invoiceConfig.number}`;
    }
  };

  const startConversion = () => {
    if (selectedBudget) {
      // Siempre empezar con los campos vacíos (evita tener que borrar valores previos).
      updateSelectedBudget({ clientName: '' });
      setInvoiceConfig(prev => ({ ...prev, number: '' }));
      setFieldErrors({});
      setCurrentStep(Step.SETUP);
    } else {
      setError("Por favor, sube una FACTURA antes de continuar.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedBudget) return;

    // Validar campos obligatorios
    const nextErrors: { clientName?: string; invoiceNumber?: string } = {};
    if (!selectedBudget.clientName || selectedBudget.clientName.trim() === '') {
      nextErrors.clientName = 'Obligatorio';
    }
    if (!invoiceConfig.number || invoiceConfig.number.toString().trim() === '') {
      nextErrors.invoiceNumber = 'Obligatorio';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setCurrentStep(Step.PREVIEW);
      setIsProcessing(false);
    }, 600);
  };

  const handleDownload = async () => {
    if (!selectedBudget) return;
    setIsProcessing(true);
    try {
      const fullCode = getFullInvoiceCode();
      const blobUrl = await generatePdf(
        selectedBudget, 
        { number: invoiceConfig.number, date: invoiceConfig.date }, 
        fullCode
      );
      
      setLastBlobUrl(blobUrl);

      // Crear link temporal para descarga forzada
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${fullCode.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Error al generar el PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const shareFactura = async () => {
    if (!lastBlobUrl) return;
    try {
      const response = await fetch(lastBlobUrl);
      const blob = await response.blob();
      const file = new File([blob], `Factura_${invoiceConfig.number}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Factura ${invoiceConfig.number}` });
      } else {
        window.open(lastBlobUrl, '_blank');
      }
    } catch (err) {
      window.open(lastBlobUrl, '_blank');
    }
  };

  const handleBack = () => {
    if (currentStep === Step.UPLOAD) {
      setSelectedBudget(null);
    } else if (currentStep === Step.SETUP) {
      setCurrentStep(Step.UPLOAD);
    } else if (currentStep === Step.PREVIEW) {
      setCurrentStep(Step.SETUP);
    }
  };

  const handleReset = () => {
    setSelectedBudget(null);
    setCurrentStep(Step.UPLOAD);
    setShowSuccess(false);
    setLastBlobUrl(null);
    setInvoiceConfig(prev => ({ ...prev, number: '' }));
    setFieldErrors({});
  };

  const handleClearHistory = () => {
    if (budgets.length === 0) return;
    if (!confirm('¿Borrar todo el historial de facturas?')) return;
    setBudgets([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const updateSelectedBudget = (updates: Partial<BudgetData>) => {
    if (selectedBudget) setSelectedBudget({ ...selectedBudget, ...updates });
  };

  const showBackButton = !(currentStep === Step.UPLOAD && !selectedBudget);
  const showHomeButton = currentStep === Step.PREVIEW || showSuccess;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-[420px] bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 flex flex-col h-[880px] relative">
        
        <div className="px-6 pt-8 pb-4 flex items-center justify-between z-10 items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[17px] font-black uppercase tracking-tight leading-tight">
                {currentStep === Step.UPLOAD ? "APP-FACTURAS" : 
                 currentStep === Step.SETUP ? "Revisar Datos" : "Vista Previa"}
              </h2>
              <span className="text-[10px] font-bold text-blue-500 tracking-wider">By SantiSystems</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {showBackButton && (
              <button onClick={handleBack} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-100 group shadow-sm">
                <ArrowLeft className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-500 uppercase tracking-widest">Volver</span>
              </button>
            )}
            
            {showHomeButton && (
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-full group shadow-md transition-all">
                <Home className="w-3 h-3 text-white" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Inicio</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-12">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400"><XCircle className="w-4 h-4" /></button>
            </div>
          )}

          {currentStep === Step.UPLOAD && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {!selectedBudget ? (
                <>
                  <FileUploader 
                    onProcessingStart={() => setIsProcessing(true)}
                    onProcessingEnd={() => setIsProcessing(false)}
                    onBudgetsDetected={handleBudgetsDetected}
                    onError={setError}
                  />
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-slate-800 text-[16px]">Historial de Carga</h3>
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="px-3 py-2 rounded-2xl border border-slate-100 bg-white hover:bg-red-50 hover:border-red-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 active:scale-95 transition-all"
                        title="Borrar todo"
                      >
                        Borrar todo
                      </button>
                    </div>
                    <BudgetList
                      budgets={budgets}
                      onSelect={setSelectedBudget}
                      onDelete={(id) => setBudgets(b => b.filter(x => x.id !== id))}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-6 py-10">
                  <div className="bg-blue-50 rounded-[32px] p-8 border border-blue-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                      <FileCheck className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Archivo Cargado</h3>
                    <p className="text-sm font-bold text-slate-500 truncate w-full max-w-[240px]">{selectedBudget.fileName}</p>
                    <button onClick={() => setSelectedBudget(null)} className="mt-6 flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700">
                      <RefreshCw className="w-3.5 h-3.5" /> Cambiar Archivo
                    </button>
                  </div>
                  <button onClick={startConversion} className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-wider">
                    <Edit3 className="w-5 h-5" /> Configurar Archivo
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === Step.SETUP && selectedBudget && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <h1 className="text-[24px] font-black leading-[1.1]">Convertir a Factura</h1>
              <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Cliente</label>
                    <input
                      type="text"
                      value={selectedBudget.clientName}
                      onFocus={() => {
                        // Quitar aviso de "en blanco" al entrar al campo.
                        if (fieldErrors.clientName) {
                          setFieldErrors(prev => ({ ...prev, clientName: undefined }));
                        }
                      }}
                      onChange={(e) => updateSelectedBudget({ clientName: e.target.value.toUpperCase() })}
                      className="w-full mt-1 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none"
                    />
                    {fieldErrors.clientName && (
                      <p className="mt-1 text-[11px] font-black text-red-600">Nombre Cliente está en blanco</p>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Factura</label>
                      <input
                        type="number"
                        value={invoiceConfig.number}
                        onFocus={() => {
                          // Quitar aviso de "en blanco" al entrar al campo.
                          if (fieldErrors.invoiceNumber) {
                            setFieldErrors(prev => ({ ...prev, invoiceNumber: undefined }));
                          }
                        }}
                        onChange={(e) => setInvoiceConfig({ ...invoiceConfig, number: e.target.value })}
                        className="w-full mt-1 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none"
                      />
                      {fieldErrors.invoiceNumber && (
                        <p className="mt-1 text-[11px] font-black text-red-600">Nº Factura está en blanco</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Factura</label>
                      <input type="date" value={invoiceConfig.date} onChange={(e) => setInvoiceConfig({...invoiceConfig, date: e.target.value})} className="w-full mt-1 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                    </div>
                 </div>
                 <div className="pt-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Vista del Código</p>
                    <p className="text-lg font-black">{getFullInvoiceCode()}</p>
                 </div>
              </div>
              <button onClick={handleGenerate} className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider">
                <Save className="w-5 h-5" /> Confirmar Datos
              </button>
            </div>
          )}

          {currentStep === Step.PREVIEW && selectedBudget && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-[20px] flex items-center justify-center gap-2 text-[11px] font-black border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Datos Listos</span>
              </div>
              <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 shadow-sm text-center">
                 <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Documento Final</p>
                 <p className="text-[18px] font-black truncate mb-4">{getFullInvoiceCode()}</p>
                 <button onClick={handleDownload} className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[22px] font-black text-[16px] shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 uppercase tracking-wider">
                    <Download className="w-4.5 h-4.5" /> Descargar Factura
                 </button>
              </div>
              <button onClick={handleReset} className="w-full h-14 bg-slate-900 text-white rounded-[22px] font-black text-[16px] shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 uppercase tracking-wider">
                  <Plus className="w-4.5 h-4.5" /> NUEVA FACTURA
              </button>
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSuccess(false)}></div>
          <div className="bg-white w-full max-w-[340px] rounded-[36px] p-8 shadow-2xl relative text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
               <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-[22px] font-black mb-2 uppercase tracking-tight">Factura Lista</h3>
            <p className="text-slate-500 text-sm font-bold mb-8">El archivo se ha descargado. Puedes compartirlo ahora.</p>
            <div className="space-y-3">
              <button onClick={shareFactura} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-[15px] flex items-center justify-center gap-3 uppercase tracking-wider shadow-lg shadow-blue-200">
                <Send className="w-4.5 h-4.5" /> Compartir / Enviar
              </button>
              <button onClick={handleReset} className="w-full h-14 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[15px] flex items-center justify-center gap-3 uppercase tracking-wider border border-emerald-100">
                <Home className="w-4.5 h-4.5" /> Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-6 text-white text-center">
          <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl uppercase">Procesando...</h3>
            <p className="text-slate-300 font-bold">Limpiando PDF y aplicando diseño...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
