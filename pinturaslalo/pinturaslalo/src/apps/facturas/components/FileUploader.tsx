
import React from 'react';
import { Upload, Plus } from 'lucide-react';
import { parseBudgetPdf } from '../services/pdfParser';
import { BudgetData } from '../types';

interface FileUploaderProps {
  onProcessingStart: () => void;
  onProcessingEnd: () => void;
  onBudgetsDetected: (budgets: BudgetData[]) => void;
  onError: (msg: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onProcessingStart,
  onProcessingEnd,
  onBudgetsDetected,
  onError
}) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    onProcessingStart();
    const newBudgets: BudgetData[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'application/pdf') continue;

        try {
          const budgetData = await parseBudgetPdf(file);
          newBudgets.push(budgetData);
        } catch (err) {
          console.error(`Error parsing ${file.name}:`, err);
          onError(`Error al leer el archivo ${file.name}.`);
        }
      }

      if (newBudgets.length > 0) {
        onBudgetsDetected(newBudgets);
      }
    } finally {
      onProcessingEnd();
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white p-2 rounded-[32px] border border-slate-100 shadow-sm">
      <label className="flex flex-col items-center justify-center w-full min-h-[220px] border-[2px] border-dashed border-blue-100 rounded-[28px] cursor-pointer bg-slate-50/30 hover:bg-blue-50/40 transition-all group overflow-hidden relative py-6">
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500 shadow-sm shadow-blue-100/50">
             <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <h4 className="text-[16px] font-black text-slate-800 mb-1 tracking-tight uppercase leading-tight max-w-[220px]">
            Subir presupuesto para convertir
          </h4>
          <p className="text-slate-400 text-[11px] leading-tight max-w-[180px] font-bold">
            Arrastra o selecciona tu PDF original.
          </p>
        </div>

        {/* Inner Action Button - Matched with main app buttons */}
        <div className="mt-6 w-full px-6">
           <div className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] flex items-center justify-center gap-3 shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] active:scale-95 transition-all uppercase tracking-wider">
             <Plus className="w-5 h-5" /> Seleccionar Archivo
           </div>
        </div>

        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept=".pdf"
          onChange={handleFileChange} 
        />
      </label>
    </div>
  );
};
