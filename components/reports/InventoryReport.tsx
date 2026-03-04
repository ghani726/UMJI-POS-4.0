import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { Package, Archive, TrendingUp, TrendingDown, Filter, Layers, Building, Tag, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface InventoryReportProps {
    currency: string;
    isPreview?: boolean;
    onDataReady?: (data: any) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const InventoryReport: React.FC<InventoryReportProps> = ({ currency, isPreview, onDataReady }) => {
    const [filterBrand, setFilterBrand] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSupplier, setFilterSupplier] = useState<string>('all');

    const brands = useLiveQuery(() => db.brands.toArray()) || [];
    const categories = useLiveQuery(() => db.productCategories.toArray()) || [];
    const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

    const data = useLiveQuery(async () => {
        const products = await db.products.toArray();
        const sales = await db.sales.toArray();
        
        // Calculate average profit margin from all sales
        const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalSalesCogs = sales.flatMap(s => s.items).reduce((sum, i) => sum + (Number(i.costPrice) || 0) * Math.abs(Number(i.quantity) || 0), 0);
        const avgMargin = totalSalesRevenue > 0 ? (totalSalesRevenue - totalSalesCogs) / totalSalesRevenue : 0;

        const filteredProducts = products.filter(p => {
            const brandMatch = filterBrand === 'all' || p.brandId === parseInt(filterBrand);
            const categoryMatch = filterCategory === 'all' || p.categoryId === parseInt(filterCategory);
            const supplierMatch = filterSupplier === 'all' || p.supplierId === parseInt(filterSupplier);
            return brandMatch && categoryMatch && supplierMatch;
        });

        const totalProducts = filteredProducts.length;
        const allVariants = filteredProducts.flatMap(p => p.variants.map(v => ({ ...v, productName: p.name })));
        const totalUnits = allVariants.reduce((sum, v) => sum + v.stock, 0);
        const totalCostValue = allVariants.reduce((sum, v) => sum + (v.stock * v.costPrice), 0);
        const expectedRevenue = allVariants.reduce((sum, v) => sum + (v.stock * v.sellingPrice), 0);
        const expectedRevenueWithAvgMargin = totalCostValue / (1 - avgMargin);

        const stockByCategory: Record<string, number> = {};
        filteredProducts.forEach(p => {
            const catName = categories.find(c => c.id === p.categoryId)?.name || 'Uncategorized';
            const productStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
            stockByCategory[catName] = (stockByCategory[catName] || 0) + productStock;
        });

        const lowStockItems = allVariants.filter(v => v.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 10);

        const result = {
            stats: [
                { title: "Total Products", value: totalProducts.toLocaleString(), icon: Archive, color: 'text-blue-600' },
                { title: "Total Units", value: totalUnits.toLocaleString(), icon: Package, color: 'text-indigo-600' },
                { title: "Stock Cost Value", value: `${currency}${totalCostValue.toLocaleString()}`, icon: TrendingDown, color: 'text-orange-600' },
                { title: "Expected Revenue", value: `${currency}${expectedRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' },
                { title: "Revenue (Avg Margin)", value: `${currency}${expectedRevenueWithAvgMargin.toLocaleString()}`, icon: BarChart2, color: 'text-cyan-600' },
                { title: "Total Brands", value: brands.length.toString(), icon: Tag, color: 'text-purple-600' },
                { title: "Total Categories", value: categories.length.toString(), icon: Layers, color: 'text-pink-600' },
                { title: "Total Suppliers", value: suppliers.length.toString(), icon: Building, color: 'text-slate-600' },
            ],
            categoryData: Object.entries(stockByCategory).map(([name, value]) => ({ name, value })),
            lowStockItems,
            inventoryTable: allVariants.sort((a, b) => a.stock - b.stock),
            tableHeaders: ['Product', 'Variant', 'Stock', 'Cost', 'Selling'],
            tableData: allVariants.map(v => ({
                Product: v.productName,
                Variant: Object.values(v.attributes).join(' / ') || 'Standard',
                Stock: v.stock,
                Cost: v.costPrice,
                Selling: v.sellingPrice
            }))
        };

        if (onDataReady) {
            onDataReady(result);
        }

        return result;
    }, [filterBrand, filterCategory, filterSupplier, categories, brands, suppliers, onDataReady]);

    if (!data) return <div className="p-20 text-center">Loading inventory data...</div>;

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
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Package className="text-primary-500" /> Stock by Category</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.categoryData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><TrendingDown className="text-red-500" /> Low Stock Alert (Top 10)</h3>
                    <div className="space-y-4">
                        {data.lowStockItems.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold">{item.productName}</p>
                                    <p className="text-xs text-secondary-500">{Object.values(item.attributes).join(' / ')}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${item.stock <= 2 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {item.stock} in stock
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold">Full Inventory List</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Product</th>
                                <th className="p-4">Variant</th>
                                <th className="p-4">SKU</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4">Cost</th>
                                <th className="p-4">Price</th>
                                <th className="p-4 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                            {data.inventoryTable.slice(0, isPreview ? 100 : 20).map((item: any, i: number) => (
                                <tr key={i} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                    <td className="p-4 font-bold">{item.productName}</td>
                                    <td className="p-4 text-secondary-500">{Object.values(item.attributes).join(' / ') || 'Standard'}</td>
                                    <td className="p-4 font-mono text-xs">{item.sku || 'N/A'}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${item.stock <= 5 ? 'text-red-500' : ''}`}>{item.stock}</span>
                                    </td>
                                    <td className="p-4">{currency}{item.costPrice.toFixed(2)}</td>
                                    <td className="p-4">{currency}{item.sellingPrice.toFixed(2)}</td>
                                    <td className="p-4 text-right font-black">{currency}{(item.stock * item.costPrice).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
