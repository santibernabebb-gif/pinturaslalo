
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle, VerticalAlign } from 'docx';
import { BudgetData } from '../types';

export const generateDocx = async (data: BudgetData): Promise<Blob> => {
  const formatCurrency = (val: number) => `${val.toFixed(2)}€`;
  const borderStyle = { style: BorderStyle.SINGLE, size: 2, color: "000000" };

  // Lógica de densidad para Word
  const rowCount = data.lines.length;
  const isCompact = rowCount > 15;
  const fontSize = isCompact ? 16 : 18; // docx size is half-points (18 = 9pt)
  const titleSize = isCompact ? 32 : 44;

  const tableHeader = new TableRow({
    children: [
      new TableCell({ 
        shading: { fill: "1e293b" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DESCRIPCION", bold: true, color: "FFFFFF", size: fontSize })] })] 
      }),
      new TableCell({ 
        shading: { fill: "1e293b" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "UDS.", bold: true, color: "FFFFFF", size: fontSize })] })] 
      }),
      new TableCell({ 
        shading: { fill: "1e293b" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PRECIO", bold: true, color: "FFFFFF", size: fontSize })] })] 
      }),
      new TableCell({ 
        shading: { fill: "334155" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOTAL", bold: true, color: "FFFFFF", size: fontSize })] })] 
      }),
    ],
  });

  const dataRows = data.lines.map(line => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: line.description.toUpperCase(), bold: true, size: fontSize + 2 })] })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: line.units?.toString() || "", bold: true, size: fontSize + 2 })] })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: line.unitPrice ? formatCurrency(line.unitPrice) : "", bold: true, size: fontSize + 2 })] })] }),
      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: line.totalPrice ? formatCurrency(line.totalPrice) : "", bold: true, size: fontSize + 2 })] })] }),
    ],
  }));

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 500, right: 500, bottom: 500, left: 500 },
        },
      },
      children: [
        new Paragraph({ children: [new TextRun({ text: "EDUARDO QUILIS LLORENS", bold: true, size: isCompact ? 24 : 32 })] }),
        new Paragraph({ children: [new TextRun({ text: "Tel: 620-944-229 • NIF: 21667776-M", bold: true, size: 14 })] }),

        new Paragraph({ spacing: { before: isCompact ? 100 : 200 } }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "PRESUPUESTO", bold: true, size: titleSize, underline: {} })],
        }),

        new Paragraph({ spacing: { before: isCompact ? 100 : 200 } }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: "f8fafc" },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "CLIENTE:", size: 12, bold: true })] }),
                    new Paragraph({ children: [new TextRun({ text: data.client.toUpperCase(), bold: true, size: isCompact ? 20 : 24 })] })
                  ]
                }),
                new TableCell({
                  shading: { fill: "f8fafc" },
                  children: [
                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "FECHA:", size: 12, bold: true })] }),
                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: data.date, bold: true, size: isCompact ? 18 : 22 })] })
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: isCompact ? 100 : 300 } }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle,
            insideHorizontal: borderStyle, insideVertical: borderStyle,
          },
          rows: [tableHeader, ...dataRows],
        }),

        new Paragraph({ spacing: { before: isCompact ? 100 : 300 } }),

        new Table({
          alignment: AlignmentType.RIGHT,
          width: { size: 40, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ shading: { fill: "f8fafc" }, children: [new Paragraph({ children: [new TextRun({ text: "SUBTOTAL", bold: true, size: 14 })] })] }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(data.subtotal), bold: true, size: 16 })] })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ shading: { fill: "0f172a" }, children: [new Paragraph({ children: [new TextRun({ text: "TOTAL NETO", bold: true, size: 16, color: "FFFFFF" })] })] }),
                new TableCell({ shading: { fill: "0f172a" }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(data.total), bold: true, size: 20, color: "FFFFFF" })] })] }),
              ]
            }),
          ]
        }),

        new Paragraph({ spacing: { before: isCompact ? 200 : 400 } }),
        new Paragraph({ children: [new TextRun({ text: "NOTAS:", bold: true, underline: {}, size: 14 })] }),
        new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: "• Los trabajos imprevistos no contemplados se facturarán aparte.", size: 12 })] }),
        new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: "• El saneamiento de paramentos en mal estado no está incluido.", size: 12 })] }),
        new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: "• Forma de pago: 50% al inicio / 50% a la finalización.", size: 12 })] }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
