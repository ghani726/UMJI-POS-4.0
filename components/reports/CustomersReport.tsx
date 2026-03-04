import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { Users, Award, TrendingUp, Banknote, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomersReportProps {
    currency: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const CustomersReport: React.FC<CustomersReportProps> = ({ currency }) => {
    const data = useLiveQuery(async () => {
        const customers = await db.customers.toArray();
        const sales = await db.sales.toArray();

        const totalCustomers = customers.length;
        const totalDebits = customers.reduce((sum, c) => sum + (c.dueBalance || 0), 0);

        const customerSales: Record<string, { name: string, revenue: number, count: number }> = {};
        sales.forEach(s => {
            const customerId = s.customerId;
            const name = s.customerName || 'Walk-in Customer';
            const key = customerId ? customerId.toString() : 'walk-in';
            
            if (!customerSales[key]) customerSales[key] = { name, revenue: 0, count: 0 };
            customerSales[key].revenue += s.totalAmount;
            customerSales[key].count += 1;
        });

        const topCustomers = Object.values(customerSales)
            .filter(c => c.name !== 'Walk-in Customer')
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        const customerDebits = customers
            .filter(c => (c.dueBalance || 0) > 0)
            .sort((a, b) => (b.dueBalance || 0) - (a.dueBalance || 0))
            .slice(0, 10);

        return {
            totalCustomers,
            totalDebits,
            topCustomers,
            customerDebits,
            allCustomers: customers.sort((a, b) => (b.dueBalance || 0) - (a.dueBalance || 0))
        };
    }, []);

    if (!data) return <div className="p-20 text-center">Loading customer data...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Customers</p>
                            <p className="text-2xl font-black">{data.totalCustomers.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <Banknote className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Outstanding Debits</p>
                            <p className="text-2xl font-black">{currency}{data.totalDebits.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Award className="text-yellow-500" /> Top Customers by Revenue</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topCustomers} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><TrendingUp className="text-primary-500" /> Highest Debits</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.customerDebits.map(c => ({ name: c.name, debit: c.dueBalance }))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <Tooltip formatter={(val: number) => `${currency}${val.toLocaleString()}`} />
                                <Bar dataKey="debit" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold">Customer Directory & Balances</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Customer Name</th>
                                <th className="p-4">Phone</th>
                                <th className="p-4">Email</th>
                                <th className="p-4 text-right">Outstanding Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                            {data.allCustomers.map((customer: any) => (
                                <tr key={customer.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                    <td className="p-4 font-bold">{customer.name}</td>
                                    <td className="p-4 text-secondary-500">{customer.phone}</td>
                                    <td className="p-4 text-secondary-500">{customer.email || '-'}</td>
                                    <td className={`p-4 text-right font-black ${customer.dueBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {currency}{(customer.dueBalance || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
