import React from 'react';
import { BarChart2, TrendingUp, PieChart, Circle } from 'lucide-react';

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area';

interface ChartTypeSelectorProps {
    currentType: ChartType;
    onChange: (type: ChartType) => void;
    allowedTypes?: ChartType[];
}

export const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({ 
    currentType, 
    onChange, 
    allowedTypes = ['bar', 'line', 'pie', 'donut', 'area'] 
}) => {
    const types = [
        { id: 'bar', icon: BarChart2, label: 'Bar' },
        { id: 'line', icon: TrendingUp, label: 'Line' },
        { id: 'area', icon: TrendingUp, label: 'Area' },
        { id: 'pie', icon: PieChart, label: 'Pie' },
        { id: 'donut', icon: Circle, label: 'Donut' },
    ].filter(t => allowedTypes.includes(t.id as ChartType));

    return (
        <div className="flex items-center bg-secondary-100 dark:bg-secondary-800 p-1 rounded-xl no-print">
            {types.map((type) => (
                <button
                    key={type.id}
                    onClick={() => onChange(type.id as ChartType)}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                        currentType === type.id 
                        ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600' 
                        : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
                    }`}
                    title={type.label}
                >
                    <type.icon size={16} />
                </button>
            ))}
        </div>
    );
};
