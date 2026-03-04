import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { Building, Package, ShoppingBag, Filter, Search, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SuppliersReportProps {
    currency: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const SuppliersReport: React.FC<SuppliersReportProps> = ({ currency }) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

    const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

    const data = useLiveQuery(async () => {
        const products = await db.products.toArray();
        const sales = await db.sales.toArray();
        const supplierList = await db.suppliers.toArray();

        const supplierStats: Record<string, { name: string, productsCount: number, unitsCount: number, salesCount: number, revenue: number }> = {};
        
        supplierList.forEach(s => {
            supplierStats[s.id!.toString()] = { name: s.name, productsCount: 0, unitsCount: 0, salesCount: 0, revenue: 0 };
        });

        // Calculate product and unit counts per supplier
        products.forEach(p => {
            if (p.supplierId && supplierStats[p.supplierId.toString()]) {
                supplierStats[p.supplierId.toString()].productsCount += 1;
                supplierStats[p.supplierId.toString()].unitsCount += p.variants.reduce((sum, v) => sum + v.stock, 0);
            }
        });

        // Calculate sales per supplier
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product?.supplierId && supplierStats[product.supplierId.toString()]) {
                    supplierStats[product.supplierId.toString()].salesCount += Math.abs(item.quantity);
                    supplierStats[product.supplierId.toString()].revenue += item.totalPrice;
                }
            });
        });

        const statsArray = Object.entries(supplierStats).map(([id, stats]) => ({ id, ...stats }));
        const filteredStats = selectedSupplierId === 'all' ? statsArray : statsArray.filter(s => s.id === selectedSupplierId);

        return {
            totalSuppliers: supplierList.length,
            statsArray,
            filteredStats,
            topSuppliersByRevenue: statsArray.sort((a, b) => b.revenue - a.revenue).slice(0, 10)
        };
    }, [selectedSupplierId]);

    if (!data) return <div className="p-20 text-center">Loading supplier data...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Filter */}
            <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex items-center gap-4">
                <Filter className="text-secondary-500" size={20} />
                <span className="font-bold text-sm uppercase tracking-wider">Filter Supplier:</span>
                <select 
                    value={selectedSupplierId} 
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 text-sm min-w-[200px]"
                >
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Suppliers</p>
                            <p className="text-2xl font-black">{data.totalSuppliers}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><TrendingUp className="text-primary-500" /> Revenue by Supplier</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topSuppliersByRevenue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Package className="text-emerald-500" /> Stock Units by Supplier</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.statsArray} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="unitsCount" nameKey="name">
                                    {data.statsArray.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Suppliers Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold">Supplier Performance Metrics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Supplier Name</th>
                                <th className="p-4 text-center">Products</th>
                                <th className="p-4 text-center">Units In Stock</th>
                                <th className="p-4 text-center">Total Units Sold</th>
                                <th className="p-4 text-right">Total Revenue Generated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                            {data.filteredStats.map((s: any) => (
                                <tr key={s.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                    <td className="p-4 font-bold">{s.name}</td>
                                    <td className="p-4 text-center font-medium">{s.productsCount}</td>
                                    <td className="p-4 text-center font-medium">{s.unitsCount}</td>
                                    <td className="p-4 text-center font-medium">{s.salesCount}</td>
                                    <td className="p-4 text-right font-black text-primary-600">{currency}{s.revenue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
