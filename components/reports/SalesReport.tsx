import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import type { Product } from '../../types';
import { TrendingUp, Package, BarChart2, PieChart as PieChartIcon, Filter, Search, Award, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface SalesReportProps {
    dateRange: { start: Date; end: Date };
    currency: string;
    isPreview?: boolean;
    onDataReady?: (data: any) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const SalesReport: React.FC<SalesReportProps> = ({ dateRange, currency, isPreview, onDataReady }) => {
    const [filterBrand, setFilterBrand] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSupplier, setFilterSupplier] = useState<string>('all');

    const brands = useLiveQuery(() => db.brands.toArray()) || [];
    const categories = useLiveQuery(() => db.productCategories.toArray()) || [];
    const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

    const data = useLiveQuery(async () => {
        let sales = await db.sales.where('timestamp').between(dateRange.start, dateRange.end, true, true).toArray();
        const products = await db.products.toArray();
        const productMap = new Map(products.map(p => [p.id, p]));

        // Filter sales items based on product attributes
        const filteredSales = sales.map(sale => {
            const filteredItems = sale.items.filter(item => {
                const product = productMap.get(item.productId) as Product | undefined;
                if (!product) return false;
                
                const brandMatch = filterBrand === 'all' || product.brandId === parseInt(filterBrand);
                const categoryMatch = filterCategory === 'all' || product.categoryId === parseInt(filterCategory);
                const supplierMatch = filterSupplier === 'all' || product.supplierId === parseInt(filterSupplier);
                
                return brandMatch && categoryMatch && supplierMatch;
            });

            if (filteredItems.length === 0) return null;

            // Recalculate total for filtered items
            const filteredTotal = filteredItems.reduce((sum, i) => sum + i.totalPrice, 0);
            return { ...sale, items: filteredItems, totalAmount: filteredTotal };
        }).filter(s => s !== null) as any[];

        const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const productsSold = filteredSales.flatMap(s => s.items).reduce((sum, i) => sum + Math.abs(i.quantity), 0);
        const cogs = filteredSales.flatMap(s => s.items).reduce((sum, i) => sum + (Number(i.costPrice) || 0) * Math.abs(Number(i.quantity) || 0), 0);
        const grossProfit = totalSales - cogs;
        const avgMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

        // Top Selling Products
        const productSales: Record<string, { name: string, qty: number, revenue: number }> = {};
        filteredSales.flatMap(s => s.items).forEach(item => {
            if (!productSales[item.productId]) productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
            productSales[item.productId].qty += Math.abs(item.quantity);
            productSales[item.productId].revenue += item.totalPrice;
        });
        const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Sales by Category
        const categorySales: Record<string, number> = {};
        filteredSales.flatMap(s => s.items).forEach(item => {
            const product = productMap.get(item.productId);
            const catName = categories.find(c => c.id === product?.categoryId)?.name || 'Uncategorized';
            categorySales[catName] = (categorySales[catName] || 0) + item.totalPrice;
        });

        const result = {
            stats: [
                { title: "Total Sales", value: `${currency}${totalSales.toLocaleString()}`, icon: ShoppingBag, color: 'text-blue-600' },
                { title: "Products Sold", value: productsSold.toLocaleString(), icon: Package, color: 'text-indigo-600' },
                { title: "Gross Profit", value: `${currency}${grossProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' },
                { title: "Avg Margin", value: `${avgMargin.toFixed(1)}%`, icon: BarChart2, color: 'text-orange-600' },
            ],
            topProducts,
            categoryData: Object.entries(categorySales).map(([name, value]) => ({ name, value })),
            salesTable: filteredSales.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
            tableHeaders: ['Invoice', 'Date', 'Customer', 'Items', 'Total'],
            tableData: filteredSales.map(s => ({
                Invoice: s.invoiceNumber,
                Date: format(s.timestamp, 'yyyy-MM-dd HH:mm'),
                Customer: s.customerName || 'Walk-in',
                Items: s.items.length,
                Total: s.totalAmount
            }))
        };

        if (onDataReady) {
            onDataReady(result);
        }

        return result;
    }, [dateRange, filterBrand, filterCategory, filterSupplier, categories, onDataReady]);

    if (!data) return <div className="p-20 text-center">Loading sales data...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Filters */}
            <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-secondary-500 mr-2">
                    <Filter size={20} />
                    <span className="font-bold text-sm uppercase tracking-wider">Filters:</span>
                </div>
                <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 text-sm">
                    <option value="all">All Brands</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 text-sm">
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="p-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 text-sm">
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.stats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 bg-secondary-50 dark:bg-secondary-800 rounded-xl`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-secondary-500 uppercase">{stat.title}</p>
                                <p className="text-xl font-black">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Award className="text-yellow-500" /> Top 10 Products by Revenue</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><PieChartIcon className="text-primary-500" /> Sales by Category</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {data.categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Recent Sales</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Invoice</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Items</th>
                                <th className="p-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                            {data.salesTable.slice(0, isPreview ? 100 : 20).map((sale: any) => (
                                <tr key={sale.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                    <td className="p-4 font-bold text-primary-600">#{sale.invoiceNumber}</td>
                                    <td className="p-4">{format(sale.timestamp, 'MMM dd, yyyy HH:mm')}</td>
                                    <td className="p-4">{sale.customerName || 'Walk-in Customer'}</td>
                                    <td className="p-4">{sale.items.length} items</td>
                                    <td className="p-4 text-right font-black">{currency}{sale.totalAmount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
