
import React, { useState } from 'react';
import { Download, Loader2, FileCode, Printer } from 'lucide-react';
// Fix: Import MONTHS_ABREV_ES instead of MONTHS_ABREV as it is the correct exported name in types.ts
import { BudgetData, MONTHS_ABREV_ES } from '../types';
import { generateDocx, generatePdf } from '../services/documentGenerator';

interface InvoiceEditorProps {
  budget: BudgetData;
  onBack: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ budget, onBack }) => {
  const [invoiceNumber, setInvoiceNumber] = useState<number>(1);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Calculate Invoice Code for display
  const getInvoiceCode = () => {
    const dateObj = new Date(invoiceDate);
    const monthIndex = dateObj.getMonth();
    // Fix: Use MONTHS_ABREV_ES instead of MONTHS_ABREV
    const monthStr = MONTHS_ABREV_ES[monthIndex];
    return `FACTURA ${invoiceNumber} ${monthStr}-26`;
  };

  const handleDownloadDocx = async () => {
    setIsGeneratingDocx(true);
    try {
      const code = getInvoiceCode();
      await generateDocx(budget, { number: invoiceNumber, date: invoiceDate }, code);
    } catch (err) {
      alert('Error al generar el DOCX. Revisa que el archivo de plantilla exista en /public.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const code = getInvoiceCode();
      await generatePdf(budget, { number: invoiceNumber, date: invoiceDate }, code);
    } catch (err) {
      alert('Error al generar el PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Datos de la Factura</h3>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Número de Factura</label>
            <input 
              type="number" 
              min="1"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fecha Factura</label>
            <input 
              type="date" 
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="p-4 bg-slate-900 text-white rounded-lg">
            <span className="text-xs text-slate-400 block mb-1 uppercase tracking-widest">CÓDIGO GENERADO:</span>
            <span className="text-xl font-mono font-bold tracking-wider">{getInvoiceCode()}</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Acciones</h3>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleDownloadDocx}
              disabled={isGeneratingDocx || isGeneratingPdf}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 uppercase tracking-tighter"
            >
              {isGeneratingDocx ? <Loader2 className="animate-spin" /> : <FileCode />}
              Generar DOCX (Plantilla)
            </button>
            <button 
              onClick={handleDownloadPdf}
              disabled={isGeneratingDocx || isGeneratingPdf}
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 uppercase tracking-tighter"
            >
              {isGeneratingPdf ? <Loader2 className="animate-spin" /> : <Printer />}
              Generar PDF Final
            </button>
          </div>
          
          <div className="mt-4 border rounded-lg p-4 bg-amber-50 border-amber-100 text-amber-800 text-sm">
            <p className="font-bold mb-1">Aviso:</p>
            <p>La plantilla Word se rellenará manteniendo los estilos originales pero con los datos en <strong>negrita</strong>.</p>
          </div>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="bg-slate-100 p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Previsualización de datos
        </div>
        <div className="p-6">
          <div className="flex justify-between mb-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Cliente</p>
              <p className="text-lg font-bold text-slate-800">{budget.clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Fecha Presupuesto</p>
              <p className="text-lg font-bold text-slate-800">{budget.date}</p>
            </div>
          </div>
          
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold text-slate-400">
                <th className="pb-2">DESCRIPCIÓN</th>
                <th className="pb-2 text-center uppercase">UDS</th>
                <th className="pb-2 text-right uppercase">PRECIO UNIT.</th>
                <th className="pb-2 text-right uppercase">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budget.lines.map((line, idx) => (
                <tr key={idx} className="text-sm">
                  <td className="py-3 font-medium text-slate-700">{line.description}</td>
                  <td className="py-3 text-center">{line.units}</td>
                  <td className="py-3 text-right">{line.priceUnit.toFixed(2)}€</td>
                  <td className="py-3 text-right font-bold text-slate-900">{line.total.toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 border-t pt-4">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{budget.subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-slate-500 uppercase">
                <span>IVA 21%:</span>
                <span>{budget.iva.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 border-t pt-2 uppercase">
                <span>TOTAL:</span>
                <span>{budget.total.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
