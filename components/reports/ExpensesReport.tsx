import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { Banknote, TrendingDown, PieChart as PieChartIcon, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ExpensesReportProps {
    dateRange: { start: Date; end: Date };
    currency: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const ExpensesReport: React.FC<ExpensesReportProps> = ({ dateRange, currency }) => {
    const data = useLiveQuery(async () => {
        const expenses = await db.expenses.where('date').between(dateRange.start, dateRange.end, true, true).toArray();
        const categories = await db.expenseCategories.toArray();
        const categoryMap = new Map<number, string>(categories.map(c => [c.id!, c.name]));

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalCategories = categories.length;

        const expensesByCategory: Record<string, number> = {};
        expenses.forEach(e => {
            const catName = categoryMap.get(e.categoryId as number) || 'Uncategorized';
            expensesByCategory[catName] = (expensesByCategory[catName] || 0) + e.amount;
        });

        const categoryCards = Object.entries(expensesByCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));

        return {
            totalExpenses,
            totalCategories,
            categoryCards,
            expensesTable: expenses.sort((a, b) => b.date.getTime() - a.date.getTime()),
            categoryMap
        };
    }, [dateRange]);

    if (!data) return <div className="p-20 text-center">Loading expense data...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <Banknote className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Expenses</p>
                            <p className="text-2xl font-black">{currency}{data.totalExpenses.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Tag className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Categories Used</p>
                            <p className="text-2xl font-black">{data.categoryCards.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.categoryCards.map((cat, i) => (
                    <div key={i} className="bg-secondary-50 dark:bg-secondary-800/50 p-4 rounded-xl border border-secondary-100 dark:border-secondary-800">
                        <p className="text-xs font-bold text-secondary-500 uppercase truncate">{cat.name}</p>
                        <p className="text-lg font-black">{currency}{cat.value.toLocaleString()}</p>
                        <div className="mt-2 w-full bg-secondary-200 dark:bg-secondary-700 h-1 rounded-full overflow-hidden">
                            <div 
                                className="bg-primary-500 h-full" 
                                style={{ width: `${(cat.value / data.totalExpenses) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><TrendingDown className="text-red-500" /> Expense Distribution</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie data={data.categoryCards} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {data.categoryCards.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><PieChartIcon className="text-primary-500" /> Top Expense Categories</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={data.categoryCards}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold">Expense Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Notes</th>
                                <th className="p-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                            {data.expensesTable.map((exp: any) => (
                                <tr key={exp.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                    <td className="p-4">{format(exp.date, 'MMM dd, yyyy')}</td>
                                    <td className="p-4 font-bold">{data.categoryMap.get(exp.categoryId) || 'N/A'}</td>
                                    <td className="p-4 text-secondary-500">{exp.notes || '-'}</td>
                                    <td className="p-4 text-right font-black text-red-500">{currency}{exp.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
