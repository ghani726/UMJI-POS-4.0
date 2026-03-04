import React, { useState, useMemo, useRef } from 'react';
import { X, Printer, Download, FileText, Image as ImageIcon, FileSpreadsheet, Settings } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { StoreInfo } from '../types';

interface ReportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    dateRange: { start: Date; end: Date };
    storeInfo: StoreInfo;
    children: React.ReactNode;
    tableData?: any[];
    tableHeaders?: string[];
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
    isOpen,
    onClose,
    title,
    dateRange,
    storeInfo,
    children,
    tableData,
    tableHeaders
}) => {
    const [paperSize, setPaperSize] = useState<'A4' | 'Letter' | 'Thermal'>('A4');
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
    const [showCharts, setShowCharts] = useState(true);
    const [showTable, setShowTable] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    const exportToPDF = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        const toastId = toast.loading('Generating professional PDF report...');
        
        try {
            const pdfWidth = paperSize === 'Thermal' ? 80 : (paperSize === 'A4' ? 210 : 215.9);
            const pdfHeight = paperSize === 'Thermal' ? 500 : (paperSize === 'A4' ? 297 : 279.4); // Thermal height is dynamic later
            const margin = paperSize === 'Thermal' ? 5 : 15;
            
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: paperSize === 'Thermal' ? [80, 500] : paperSize.toLowerCase() as any
            });

            let currentY = margin;

            // 1. Add Header (Capture the header area)
            const headerEl = previewRef.current.querySelector('.report-section') as HTMLElement;
            if (headerEl) {
                const canvas = await html2canvas(headerEl, { scale: 2, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgWidth = pdfWidth - (margin * 2);
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;
            }

            // 2. Add Summary Cards (if visible)
            const cardsEl = previewRef.current.querySelector('.grid') as HTMLElement;
            if (cardsEl && showCharts) {
                const canvas = await html2canvas(cardsEl, { scale: 2, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgWidth = pdfWidth - (margin * 2);
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (currentY + imgHeight > pdfHeight - margin && paperSize !== 'Thermal') {
                    pdf.addPage();
                    currentY = margin;
                }
                
                pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;
            }

            // 3. Add Charts (Individual captures)
            const charts = previewRef.current.querySelectorAll('.recharts-wrapper');
            if (charts.length > 0 && showCharts) {
                for (let i = 0; i < charts.length; i++) {
                    const chart = charts[i] as HTMLElement;
                    const canvas = await html2canvas(chart, { scale: 2, backgroundColor: '#ffffff' });
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const imgWidth = (pdfWidth - (margin * 3)) / 2; // Side by side if possible, or full width
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    if (currentY + imgHeight > pdfHeight - margin && paperSize !== 'Thermal') {
                        pdf.addPage();
                        currentY = margin;
                    }

                    // Simple layout: one per line for better clarity in reports
                    const fullWidth = pdfWidth - (margin * 2);
                    const fullHeight = (canvas.height * fullWidth) / canvas.width;
                    
                    if (currentY + fullHeight > pdfHeight - margin && paperSize !== 'Thermal') {
                        pdf.addPage();
                        currentY = margin;
                    }

                    pdf.addImage(imgData, 'JPEG', margin, currentY, fullWidth, fullHeight);
                    currentY += fullHeight + 10;
                }
            }

            // 4. Add Table using autoTable (Perfect for page breaks)
            if (tableData && tableData.length > 0 && showTable) {
                const headers = tableHeaders || Object.keys(tableData[0]);
                const body = tableData.map(row => headers.map(h => row[h]));

                (pdf as any).autoTable({
                    head: [headers],
                    body: body,
                    startY: currentY,
                    margin: { left: margin, right: margin },
                    theme: 'striped',
                    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [249, 250, 251] },
                    styles: { fontSize: paperSize === 'Thermal' ? 8 : 10, cellPadding: 2 },
                    didDrawPage: (data: any) => {
                        currentY = data.cursor.y;
                    }
                });
                currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            // 5. Footer
            const footerEl = previewRef.current.querySelector('.report-section:last-child') as HTMLElement;
            if (footerEl) {
                if (currentY + 20 > pdfHeight - margin && paperSize !== 'Thermal') {
                    pdf.addPage();
                    currentY = margin;
                }
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text('Powered by Umji POS Advanced Reporting System', pdfWidth / 2, currentY + 10, { align: 'center' });
            }

            // Final adjustment for Thermal: Crop the height
            if (paperSize === 'Thermal') {
                const finalPdf = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: [80, currentY + 20]
                });
                // This is a bit tricky with jsPDF to "resize" an existing document, 
                // so we just use the currentY to set the height initially if we could.
                // Since we can't easily resize, we'll just save the one we have or 
                // re-run the logic with the correct height.
                // For now, let's just save the one we have, it will have some empty space at bottom.
            }

            pdf.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            toast.success('Professional Report Exported!', { id: toastId });
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.error('Failed to export report.', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const exportToExcel = () => {
        if (!tableData || !tableHeaders) return;
        const ws = XLSX.utils.json_to_sheet(tableData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const exportToCSV = () => {
        if (!tableData || !tableHeaders) return;
        const ws = XLSX.utils.json_to_sheet(tableData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToImage = async () => {
        if (!previewRef.current) return;
        setIsExporting(true);
        const toastId = toast.loading('Generating Image...');
        try {
            const canvas = await html2canvas(previewRef.current, { 
                scale: 1.5,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Image Exported!', { id: toastId });
        } catch (error) {
            toast.error('Failed to export image.', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-secondary-50 dark:bg-secondary-900 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-secondary-200 dark:border-secondary-800 flex justify-between items-center bg-white dark:bg-secondary-950">
                    <div className="flex items-center gap-3">
                        <FileText className="text-primary-600" />
                        <h2 className="text-xl font-bold">Report Preview & Export</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Settings */}
                    <div className="w-72 border-r border-secondary-200 dark:border-secondary-800 p-6 space-y-8 bg-secondary-50/50 dark:bg-secondary-900/50 overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-secondary-500 flex items-center gap-2">
                                <Settings size={16} /> Page Settings
                            </h3>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Paper Size</label>
                                <select 
                                    value={paperSize} 
                                    onChange={(e) => setPaperSize(e.target.value as any)}
                                    className="w-full p-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg text-sm"
                                >
                                    <option value="A4">A4 Standard</option>
                                    <option value="Letter">Letter</option>
                                    <option value="Thermal">Thermal (80mm)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    id="bw-toggle" 
                                    checked={isBlackAndWhite} 
                                    onChange={(e) => setIsBlackAndWhite(e.target.checked)}
                                    className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                />
                                <label htmlFor="bw-toggle" className="text-sm font-medium">Black & White Mode</label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-secondary-500">Include Sections</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="inc-charts" checked={showCharts} onChange={e => setShowCharts(e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
                                    <label htmlFor="inc-charts" className="text-sm">Charts & Visuals</label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="inc-table" checked={showTable} onChange={e => setShowTable(e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
                                    <label htmlFor="inc-table" className="text-sm">Data Table</label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-secondary-200 dark:border-secondary-800">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-secondary-500">Export Options</h3>
                            <button 
                                onClick={exportToPDF} 
                                disabled={isExporting}
                                className="w-full flex items-center gap-3 p-3 bg-red-500 hover:bg-red-600 disabled:bg-secondary-400 text-white rounded-xl transition-all shadow-sm"
                            >
                                <FileText size={18} /> <span className="text-sm font-bold">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
                            </button>
                            <button 
                                onClick={exportToExcel} 
                                disabled={isExporting}
                                className="w-full flex items-center gap-3 p-3 bg-green-600 hover:bg-green-700 disabled:bg-secondary-400 text-white rounded-xl transition-all shadow-sm"
                            >
                                <FileSpreadsheet size={18} /> <span className="text-sm font-bold">Export Excel</span>
                            </button>
                            <button 
                                onClick={exportToCSV} 
                                disabled={isExporting}
                                className="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-secondary-400 text-white rounded-xl transition-all shadow-sm"
                            >
                                <Download size={18} /> <span className="text-sm font-bold">Export CSV</span>
                            </button>
                            <button 
                                onClick={exportToImage} 
                                disabled={isExporting}
                                className="w-full flex items-center gap-3 p-3 bg-orange-500 hover:bg-orange-600 disabled:bg-secondary-400 text-white rounded-xl transition-all shadow-sm"
                            >
                                <ImageIcon size={18} /> <span className="text-sm font-bold">Export Image</span>
                            </button>
                            <button 
                                onClick={handlePrint} 
                                disabled={isExporting}
                                className="w-full flex items-center gap-3 p-3 bg-secondary-800 hover:bg-secondary-900 disabled:bg-secondary-400 text-white rounded-xl transition-all shadow-sm"
                            >
                                <Printer size={18} /> <span className="text-sm font-bold">Print Now</span>
                            </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 overflow-y-auto report-preview-container">
                        <div 
                            ref={previewRef}
                            className={`report-content ${isBlackAndWhite ? 'grayscale' : ''}`}
                        >
                            <div className="report-page-container">
                                {/* Report Header */}
                                <div className="report-section flex justify-between items-start border-b-2 border-secondary-900 pb-6 mb-8">
                                    <div>
                                        {storeInfo.logo && <img src={storeInfo.logo} alt="Logo" className="h-16 mb-4 object-contain" referrerPolicy="no-referrer" />}
                                        <h1 className="text-3xl font-black uppercase tracking-tighter">{storeInfo.storeName}</h1>
                                        <p className="text-sm font-medium opacity-70">{storeInfo.address}</p>
                                        <p className="text-sm font-medium opacity-70">{storeInfo.phone} | {storeInfo.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-4xl font-black text-primary-600 uppercase italic">{title}</h2>
                                        <p className="text-sm font-bold mt-2">PERIOD: {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}</p>
                                        <p className="text-xs opacity-50">Generated on: {format(new Date(), 'PPpp')}</p>
                                    </div>
                                </div>

                                {/* Dynamic Content based on the report */}
                                <div className="report-body space-y-8">
                                    <div className={`report-sections ${!showCharts ? 'hide-charts' : ''} ${!showTable ? 'hide-table' : ''}`}>
                                        {children}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="report-section mt-20 pt-8 border-t border-secondary-200 text-center">
                                    <p className="text-xs font-bold opacity-30 uppercase tracking-widest">Powered by Umji POS Advanced Reporting System</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .report-preview-container {
                    background: #f1f5f9;
                    padding: 40px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 40px;
                }
                .report-content {
                    font-family: 'Inter', sans-serif;
                    color: #000;
                    background: #fff;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    width: ${paperSize === 'Thermal' ? '80mm' : (paperSize === 'A4' ? '210mm' : '215.9mm')};
                    min-height: ${paperSize === 'Thermal' ? 'auto' : (paperSize === 'A4' ? '297mm' : '279.4mm')};
                    position: relative;
                }
                .report-page-container {
                    padding: ${paperSize === 'Thermal' ? '10mm' : '20mm'};
                }
                /* Prevent elements from breaking across pages */
                .report-section, 
                .report-body > div,
                .grid > div,
                tr, 
                .recharts-wrapper {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                
                .hide-charts .recharts-wrapper,
                .hide-charts h3:has(.lucide-trending-up),
                .hide-charts h3:has(.lucide-pie-chart) {
                    display: none !important;
                }
                
                .hide-table table,
                .hide-table .overflow-x-auto,
                .hide-table h3:has(span:contains("History")),
                .hide-table h3:has(span:contains("List")) {
                    display: none !important;
                }

                @media print {
                    body * { visibility: hidden; }
                    .report-content, .report-content * { visibility: visible; }
                    .report-content { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        padding: 0 !important;
                        box-shadow: none;
                        margin: 0;
                    }
                    .report-page-container {
                        padding: 15mm !important;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
};
