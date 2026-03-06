import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { Clock, User, Banknote, ShoppingBag, Eye, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ShiftsReportProps {
    dateRange: { start: Date; end: Date };
    currency: string;
}

export const ShiftsReport: React.FC<ShiftsReportProps> = ({ dateRange, currency }) => {
    const [selectedShift, setSelectedShift] = useState<any>(null);

    const data = useLiveQuery(async () => {
        const shifts = await db.shifts.where('startTime').between(dateRange.start, dateRange.end, true, true).toArray();
        const users = await db.users.toArray();
        const userMap = new Map(users.map(u => [u.id, u.username]));

        // For each shift, calculate total sales
        const shiftsWithSales = await Promise.all(shifts.map(async (shift) => {
            const sales = await db.sales
                .where('timestamp')
                .between(shift.startTime, shift.endTime || new Date(), true, true)
                .toArray();
            
            // Filter sales by shift user if needed, but usually shifts are user-specific
            const shiftSales = sales.filter(s => s.shiftId === shift.id);
            const totalSales = shiftSales.reduce((sum, s) => sum + s.totalAmount, 0);
            
            return {
                ...shift,
                totalSales,
                salesCount: shiftSales.length,
                username: userMap.get(shift.userId) || 'Unknown'
            };
        }));

        return {
            totalShifts: shifts.length,
            shifts: shiftsWithSales.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        };
    }, [dateRange]);

    if (!data) return <div className="p-20 text-center">Loading shift data...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Stats */}
            <div className="report-summary-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-secondary-900 p-6 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <Clock className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary-500 uppercase">Total Shifts</p>
                            <p className="text-2xl font-black">{data.totalShifts}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shifts Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-100 dark:border-secondary-800 overflow-hidden">
                <div className="p-6 border-b border-secondary-100 dark:border-secondary-800">
                    <h3 className="text-lg font-bold">Shift History & Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Start Time</th>
                                <th className="p-4">End Time</th>
                                <th className="p-4 text-center">Sales Count</th>
                                <th className="p-4 text-right">Total Sales</th>
                                <th className="p-4 text-right">Cash Balance</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                            {data.shifts.map((shift: any) => (
                                <tr key={shift.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xs">
                                                {shift.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold">{shift.username}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs">{format(shift.startTime, 'MMM dd, HH:mm')}</td>
                                    <td className="p-4 text-xs">{shift.endTime ? format(shift.endTime, 'MMM dd, HH:mm') : <span className="text-emerald-500 font-bold animate-pulse">ACTIVE</span>}</td>
                                    <td className="p-4 text-center font-medium">{shift.salesCount}</td>
                                    <td className="p-4 text-right font-black text-primary-600">{currency}{shift.totalSales.toLocaleString()}</td>
                                    <td className="p-4 text-right">
                                        <div className="text-xs">
                                            <p className="text-secondary-500">Exp: {currency}{shift.expectedCash?.toLocaleString() || 0}</p>
                                            <p className="font-bold">Act: {currency}{shift.actualCash?.toLocaleString() || 0}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => setSelectedShift(shift)}
                                            className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-primary-600 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Shift Detail Modal (Simplified) */}
            {selectedShift && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
                    <div className="bg-white dark:bg-secondary-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Shift Details - {selectedShift.username}</h2>
                            <button onClick={() => setSelectedShift(null)} className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-full">
                                <Eye className="rotate-180" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                                    <p className="text-xs font-bold text-secondary-500 uppercase">Start Time</p>
                                    <p className="font-bold">{format(selectedShift.startTime, 'PPpp')}</p>
                                </div>
                                <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                                    <p className="text-xs font-bold text-secondary-500 uppercase">End Time</p>
                                    <p className="font-bold">{selectedShift.endTime ? format(selectedShift.endTime, 'PPpp') : 'Still Active'}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="font-bold border-b pb-2">Financial Summary</h3>
                                <div className="flex justify-between items-center">
                                    <span>Opening Cash:</span>
                                    <span className="font-bold">{currency}{selectedShift.openingCash?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Total Sales (System):</span>
                                    <span className="font-bold text-emerald-600">{currency}{selectedShift.totalSales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Expected Cash:</span>
                                    <span className="font-bold">{currency}{selectedShift.expectedCash?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center border-t pt-2">
                                    <span>Actual Cash Counted:</span>
                                    <span className="font-bold">{currency}{selectedShift.actualCash?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Difference:</span>
                                    <span className={`font-black ${(selectedShift.actualCash - selectedShift.expectedCash) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {currency}{(selectedShift.actualCash - selectedShift.expectedCash || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-secondary-50 dark:bg-secondary-800 flex justify-end gap-3">
                            <button onClick={() => setSelectedShift(null)} className="px-6 py-2 bg-secondary-200 dark:bg-secondary-700 rounded-xl font-bold">Close</button>
                            <button className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2">
                                <FileText size={18} /> Print Shift Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
