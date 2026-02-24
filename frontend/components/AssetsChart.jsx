import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const AssetsChart = ({ data }) => {
    return (
        <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#1e293b', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend built outside for better control matching the design */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                {data.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }}></div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AssetsChart;
