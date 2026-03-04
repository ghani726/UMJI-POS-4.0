import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { ShoppingBag, Banknote, TrendingDown, Filter, Search, Building, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface PurchasesReportProps {
    dateRange: { start: Date; end: Date };
    currency: string;
    isPreview?: boolean;
    onDataReady?: (data: any) => void;
}

export const PurchasesReport: React.FC<PurchasesReportProps> = ({ dateRange, currency, isPreview, onDataReady }) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

    const data = useLiveQuery(async () => {
        let purchases = await db.purchases.where('purchaseDate').between(dateRange.start, dateRange.end, true, true).toArray();
        const supplierList = await db.suppliers.toArray();
        const supplierMap = new Map<number, string>(supplierList.map(s => [s.id!, s.name]));

        if (selectedSupplierId !== 'all') {
            purchases = purchases.filter(p => p.supplierId === parseInt(selectedSupplierId));
        }

        const totalPurchases = purchases.length;
        const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalPaid = purchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const totalDebt = totalAmount - totalPaid;

        const purchasesBySupplier: Record<string, number> = {};
        purchases.forEach(p => {
            const name = supplierMap.get(p.supplierId as number) || 'Unknown';
            purchasesBySupplier[name] = (purchasesBySupplier[name] || 0) + p.totalAmount;
        });

        const dailyPurchases: Record<string, number> = {};
        purchases.forEach(p => {
            const day = format(p.purchaseDate, 'MMM dd');
            dailyPurchases[day] = (dailyPurchases[day] || 0) + p.totalAmount;
        });

        const filteredPurchases = purchases.filter(p => {
            const supplierName = (supplierMap.get(p.supplierId as number) || '').toLowerCase();
            return supplierName.includes(searchTerm.toLowerCase()) || (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
        });

        const result = {
            totalPurchases,
            totalAmount,
            totalPaid,
            totalDebt,
            supplierData: Object.entries(purchasesBySupplier).map(([name, value]) => ({ name, value })),
            dailyData: Object.entries(dailyPurchases).map(([name, value]) => ({ name, value })),
            purchasesTable: filteredPurchases.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()),
            supplierMap,
            tableHeaders: ['Supplier', 'Date', 'Total', 'Paid', 'Debt'],
            tableData: filteredPurchases.map(p => ({
                Supplier: supplierMap.get(p.supplierId as number) || 'Unknown',
                Date: format(p.purchaseDate, 'yyyy-MM-dd'),
                Total: p.totalAmount,
                Paid: p.amountPaid || 0,
                Debt: p.totalAmount - (p.amountPaid || 0)
            }))
        };

        if (onDataReady) {
            onDataReady(result);
        }

        return result;
    }, [dateRange, selectedSupplierId, searchTerm, onDataReady]);

    if (!data) return <div className="p-20 text-center">Loading purchase data...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Filters */}
            <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-secondary-500 mr-2">
                    <Filter size={20} />
                    <span className="font-bold text-sm uppercase tracking-wider">Filters:</span>
                </div>
                <select 
                    value={selectedSupplierId} 
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 text-sm min-w-[200px]"
                >
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search purchases..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 text-sm"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Purchases</p>
                            <p className="text-2xl font-black">{data.totalPurchases}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                            <Banknote className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Paid</p>
                            <p className="text-2xl font-black">{currency}{data.totalPaid.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <TrendingDown className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Remaining Debt</p>
                            <p className="text-2xl font-black">{currency}{data.totalDebt.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Calendar className="text-primary-500" /> Purchase Trend</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Building className="text-emerald-500" /> Purchases by Supplier</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.supplierData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Purchases Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold">Purchase History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Supplier</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-right">Paid</th>
                                <th className="p-4 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                            {data.purchasesTable.slice(0, isPreview ? 100 : 20).map((p: any) => (
                                <tr key={p.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                    <td className="p-4">{format(p.purchaseDate, 'MMM dd, yyyy')}</td>
                                    <td className="p-4 font-bold">{data.supplierMap.get(p.supplierId) || 'Unknown'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {p.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold">{currency}{p.totalAmount.toLocaleString()}</td>
                                    <td className="p-4 text-right text-emerald-600">{currency}{(p.amountPaid || 0).toLocaleString()}</td>
                                    <td className="p-4 text-right font-black text-red-500">{currency}{(p.totalAmount - (p.amountPaid || 0)).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
