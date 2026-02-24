import React from 'react';

const THEME_STYLES = {
    blue: { iconBg: 'bg-blue-50', iconColor: 'text-blue-600', border: 'hover:border-blue-200' },
    red: { iconBg: 'bg-red-50', iconColor: 'text-red-600', border: 'hover:border-red-200' },
    orange: { iconBg: 'bg-orange-50', iconColor: 'text-orange-600', border: 'hover:border-orange-200' },
    yellow: { iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600', border: 'hover:border-yellow-200' },
    purple: { iconBg: 'bg-purple-50', iconColor: 'text-purple-600', border: 'hover:border-purple-200' },
    green: { iconBg: 'bg-green-50', iconColor: 'text-green-600', border: 'hover:border-green-200' },
};

const StatCard = ({ label, value, icon: Icon, colorTheme, onClick }) => {
    const theme = THEME_STYLES[colorTheme];

    return (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md ${theme.border} ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
        >
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme.iconBg} ${theme.iconColor}`}>
                    <Icon size={24} strokeWidth={2} />
                </div>
                <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                </div>
            </div>
        </div>
    );
};

export default StatCard;
