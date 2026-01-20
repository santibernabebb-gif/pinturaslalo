
import React from 'react';
import { HistoryItem } from '../types';

interface Props {
  items: HistoryItem[];
  onSelect: (item: HistoryItem, autoDownload?: boolean) => void;
  onDelete: (id: string) => void;
}

const HistoryList: React.FC<Props> = ({ items, onSelect, onDelete }) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-12 w-full max-w-2xl mx-auto px-4">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Historial de Presupuestos
      </h3>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {items.map((item) => (
          <div 
            key={item.id}
            className="p-4 border-b border-gray-50 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
          >
            <div className="flex-grow cursor-pointer" onClick={() => onSelect(item)}>
              <p className="font-black text-gray-900 group-hover:text-blue-600 uppercase tracking-tight">{item.client}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">#{item.data.budgetNumber.split('-').pop()}</span>
                <p className="text-[11px] text-gray-400 font-medium">{new Date(item.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <div className="text-right mr-4 hidden sm:block">
                <p className="font-black text-gray-900 text-lg">{item.total.toFixed(2)}€</p>
              </div>
              
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => onSelect(item)}
                  className="flex items-center space-x-1 px-3 py-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all font-bold text-xs"
                  title="Ver presupuesto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>VER</span>
                </button>
                
                <button
                  onClick={() => onSelect(item, true)}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-red-600 transition-all font-bold text-xs"
                  title="Descargar PDF directo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>PDF</span>
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('¿Estás seguro de que quieres borrar este presupuesto del historial?')) {
                    onDelete(item.id);
                  }
                }}
                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-2"
                title="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
