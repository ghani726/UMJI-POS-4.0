import React, { useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { TrendingUp, TrendingDown, Package, CreditCard, Users, Building, Banknote, Archive, ShoppingCart, BarChart2, PieChart as PieChartIcon, Award } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface SummaryReportProps {
    dateRange: { start: Date; end: Date };
    currency: string;
    onDataReady?: (data: any) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const SummaryReport: React.FC<SummaryReportProps> = ({ dateRange, currency, onDataReady }) => {
    const data = useLiveQuery(async () => {
        const sales = await db.sales.where('timestamp').between(dateRange.start, dateRange.end, true, true).toArray();
        const expenses = await db.expenses.where('date').between(dateRange.start, dateRange.end, true, true).toArray();
        const products = await db.products.toArray();
        const customers = await db.customers.count();
        const suppliers = await db.suppliers.count();
        const purchases = await db.purchases.toArray();

        const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const productsSold = sales.flatMap(s => s.items).reduce((sum, i) => sum + Math.abs(i.quantity), 0);
        const cogs = sales.flatMap(s => s.items).reduce((sum, i) => sum + (Number(i.costPrice) || 0) * Math.abs(Number(i.quantity) || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const grossProfit = totalSales - cogs;
        const netProfit = grossProfit - totalExpenses;

        const totalProductsInStock = products.length;
        const totalUnitsInStock = products.flatMap(p => p.variants).reduce((sum, v) => sum + v.stock, 0);
        
        const totalPayables = purchases.reduce((sum, p) => sum + (p.totalAmount - (p.amountPaid || 0)), 0);

        // Daily sales for line chart
        const dailyData: Record<string, { date: string, sales: number, profit: number }> = {};
        sales.forEach(s => {
            const day = format(s.timestamp, 'MMM dd');
            if (!dailyData[day]) dailyData[day] = { date: day, sales: 0, profit: 0 };
            dailyData[day].sales += s.totalAmount;
            const saleCogs = s.items.reduce((sum, i) => sum + (Number(i.costPrice) || 0) * Math.abs(Number(i.quantity) || 0), 0);
            dailyData[day].profit += (s.totalAmount - saleCogs);
        });

        // Top Products
        const productSales: Record<string, { name: string, qty: number, revenue: number }> = {};
        sales.flatMap(s => s.items).forEach(item => {
            if (!productSales[item.productId]) productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
            productSales[item.productId].qty += Math.abs(item.quantity);
            productSales[item.productId].revenue += item.totalPrice;
        });
        const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        const result = {
            cards: [
                { title: "Total Sales", value: `${currency}${totalSales.toLocaleString()}`, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-100' },
                { title: "Products Sold", value: productsSold.toLocaleString(), icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                { title: "Cost of Goods Sold", value: `${currency}${cogs.toLocaleString()}`, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-100' },
                { title: "Gross Profit", value: `${currency}${grossProfit.toLocaleString()}`, icon: BarChart2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                { title: "Net Profit", value: `${currency}${netProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
                { title: "Expenses", value: `${currency}${totalExpenses.toLocaleString()}`, icon: Banknote, color: 'text-red-600', bg: 'bg-red-100' },
                { title: "Products In Stock", value: totalProductsInStock.toLocaleString(), icon: Archive, color: 'text-purple-600', bg: 'bg-purple-100' },
                { title: "Total Units", value: totalUnitsInStock.toLocaleString(), icon: Package, color: 'text-cyan-600', bg: 'bg-cyan-100' },
                { title: "Total Customers", value: customers.toLocaleString(), icon: Users, color: 'text-pink-600', bg: 'bg-pink-100' },
                { title: "Total Suppliers", value: suppliers.toLocaleString(), icon: Building, color: 'text-slate-600', bg: 'bg-slate-100' },
                { title: "Total Payables", value: `${currency}${totalPayables.toLocaleString()}`, icon: Banknote, color: 'text-rose-600', bg: 'bg-rose-100' },
            ],
            chartData: Object.values(dailyData),
            profitDistribution: [
                { name: 'Net Profit', value: netProfit > 0 ? netProfit : 0 },
                { name: 'Expenses', value: totalExpenses },
                { name: 'COGS', value: cogs }
            ],
            topProducts,
            tableHeaders: ['Metric', 'Value'],
            tableData: [
                { Metric: 'Total Sales', Value: totalSales },
                { Metric: 'Products Sold', Value: productsSold },
                { Metric: 'COGS', Value: cogs },
                { Metric: 'Gross Profit', Value: grossProfit },
                { Metric: 'Net Profit', Value: netProfit },
                { Metric: 'Expenses', Value: totalExpenses }
            ]
        };

        return result;
    }, [dateRange]);

    useEffect(() => {
        if (data && onDataReady) {
            onDataReady(data);
        }
    }, [data, onDataReady]);

    if (!data) return <div className="p-20 text-center animate-pulse">Calculating overview...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Cards Grid */}
            <div className="report-summary-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.cards.map((card, i) => (
                    <div key={i} className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-secondary-500">{card.title}</p>
                                <p className="text-2xl font-black">{card.value}</p>
                            </div>
                            <div className={`p-3 ${card.bg} rounded-xl group-hover:scale-110 transition-transform`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="report-charts-section bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-primary-500" /> Sales & Profit Trend
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={data.chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={val => `${currency}${val}`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="report-top-items-section bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Award className="text-yellow-500" /> Top Performing Products
                    </h3>
                    <div className="space-y-4">
                        {data.topProducts.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xs">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{item.name}</p>
                                        <p className="text-xs text-secondary-500">{item.qty} units sold</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary-600">{currency}{item.revenue.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Revenue Distribution */}
            <div className="report-charts-section bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <PieChartIcon className="text-primary-500" /> Revenue Distribution
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                            <Pie
                                data={data.profitDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.profitDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${currency}${value.toLocaleString()}`} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
