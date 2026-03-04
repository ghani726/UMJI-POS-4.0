import React, { useState, useRef, useCallback } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Printer, Calendar, ChevronRight, LayoutDashboard, ShoppingCart, Package, Banknote, Users, Building, ShoppingBag, History } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { ReportPreviewModal } from '../components/ReportPreviewModal';

// Import modular reports
import { SummaryReport } from '../components/reports/SummaryReport';
import { SalesReport } from '../components/reports/SalesReport';
import { InventoryReport } from '../components/reports/InventoryReport';
import { ExpensesReport } from '../components/reports/ExpensesReport';
import { CustomersReport } from '../components/reports/CustomersReport';
import { SuppliersReport } from '../components/reports/SuppliersReport';
import { PurchasesReport } from '../components/reports/PurchasesReport';
import { ShiftsReport } from '../components/reports/ShiftsReport';

type ReportTab = 'summary' | 'sales' | 'inventory' | 'expenses' | 'customers' | 'suppliers' | 'purchases' | 'shifts';

const ReportsPage: React.FC = () => {
    const { storeInfo } = useAppContext();
    const currency = storeInfo?.currency || '$';
    
    const [activeTab, setActiveTab] = useState<ReportTab>('summary');
    const [dateRange, setDateRange] = useState({ 
        start: startOfMonth(new Date()), 
        end: endOfDay(new Date()) 
    });
    
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);

    const tabs: { id: ReportTab; label: string; icon: any }[] = [
        { id: 'summary', label: 'Summary', icon: LayoutDashboard },
        { id: 'sales', label: 'Sales', icon: ShoppingCart },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'expenses', label: 'Expenses', icon: Banknote },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'suppliers', label: 'Suppliers', icon: Building },
        { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
        { id: 'shifts', label: 'Shifts', icon: History },
    ];

    const datePresets = [
        { label: 'Today', range: { start: startOfDay(new Date()), end: endOfDay(new Date()) } },
        { label: 'Yesterday', range: { start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) } },
        { label: 'Last 7 Days', range: { start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) } },
        { label: 'Last 30 Days', range: { start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) } },
        { label: 'This Month', range: { start: startOfMonth(new Date()), end: endOfMonth(new Date()) } },
        { label: 'Last Month', range: { start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) } },
    ];

    const [reportData, setReportData] = useState<{ tableData?: any[], tableHeaders?: string[] }>({});

    const handleDataReady = useCallback((data: any) => {
        if (data.tableData) {
            setReportData({ tableData: data.tableData, tableHeaders: data.tableHeaders });
        }
    }, []);

    const renderActiveReport = (isForPreview = false) => {
        const props = { 
            dateRange, 
            currency,
            onDataReady: isForPreview ? undefined : handleDataReady
        };

        switch (activeTab) {
            case 'summary': return <SummaryReport {...props} />;
            case 'sales': return <SalesReport {...props} />;
            case 'inventory': return <InventoryReport {...props} />;
            case 'expenses': return <ExpensesReport {...props} />;
            case 'customers': return <CustomersReport {...props} />;
            case 'suppliers': return <SuppliersReport {...props} />;
            case 'purchases': return <PurchasesReport {...props} />;
            case 'shifts': return <ShiftsReport {...props} />;
            default: return null;
        }
    };

    const getReportTitle = () => {
        return tabs.find(t => t.id === activeTab)?.label + " Report";
    };

    return (
        <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 p-4 md:p-8 space-y-8 animate-fadeIn">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-secondary-500 text-sm font-bold uppercase tracking-widest">
                        <span>Reports</span>
                        <ChevronRight size={14} />
                        <span className="text-primary-600">{tabs.find(t => t.id === activeTab)?.label}</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-secondary-900 dark:text-white uppercase italic">
                        Business <span className="text-primary-600">Analytics</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsPreviewOpen(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black uppercase tracking-tighter transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                    >
                        <Printer size={20} />
                        Print / Export Report
                    </button>
                </div>
            </div>

            {/* Date Filter Bar */}
            <div className="bg-white dark:bg-secondary-900 p-6 rounded-3xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3 bg-secondary-50 dark:bg-secondary-800 p-2 rounded-2xl border border-secondary-200 dark:border-secondary-700">
                    <Calendar className="text-primary-500 ml-2" size={20} />
                    <input 
                        type="date" 
                        value={format(dateRange.start, 'yyyy-MM-dd')} 
                        onChange={e => setDateRange({ ...dateRange, start: startOfDay(e.target.valueAsDate || new Date()) })}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold"
                    />
                    <span className="text-secondary-400 font-bold">to</span>
                    <input 
                        type="date" 
                        value={format(dateRange.end, 'yyyy-MM-dd')} 
                        onChange={e => setDateRange({ ...dateRange, end: endOfDay(e.target.valueAsDate || new Date()) })}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {datePresets.map((preset) => (
                        <button 
                            key={preset.label} 
                            onClick={() => setDateRange(preset.range)}
                            className="px-4 py-2 text-xs font-bold bg-secondary-100 dark:bg-secondary-800 hover:bg-primary-500 hover:text-white rounded-xl transition-all uppercase tracking-wider"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-secondary-900 dark:bg-white text-white dark:text-secondary-900 shadow-xl scale-105 z-10' 
                            : 'bg-white dark:bg-secondary-900 text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-800 border border-secondary-100 dark:border-secondary-800'
                        }`}
                    >
                        <tab.icon size={20} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Report Content Container */}
            <div className="min-h-[600px]">
                {renderActiveReport()}
            </div>

            {/* Preview Modal */}
            {isPreviewOpen && storeInfo && (
                <ReportPreviewModal 
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    title={getReportTitle()}
                    dateRange={dateRange}
                    storeInfo={storeInfo}
                    tableData={reportData.tableData}
                    tableHeaders={reportData.tableHeaders}
                >
                    {renderActiveReport(true)}
                </ReportPreviewModal>
            )}
        </div>
    );
};

export default ReportsPage;

