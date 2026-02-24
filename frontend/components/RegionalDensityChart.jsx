import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const RegionalDensityChart = ({ data = [] }) => {
    return (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-gray-800 tracking-wide uppercase">Regional Density</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top 5 Cities</span>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
                        barSize={24}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="city"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                            width={100}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#1e293b', borderRadius: '6px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RegionalDensityChart;
