"use client";

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type BarChartProps = {
  data: { status: string; count: number }[];
};

export function BarChart({ data }: BarChartProps) {
  return (
    <div className="w-full h-80 mt-8">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data}>
          <XAxis 
            dataKey="status" 
            stroke="#6b6b6b" 
            fontSize={12} 
            tickLine={false}
            axisLine={{ stroke: '#f3f3f3' }}
          />
          <YAxis 
            stroke="#6b6b6b" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#f5f7fa' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #f3f3f3', boxShadow: '0 5px 9px rgba(0,0,0,0.06)' }}
          />
          <Bar dataKey="count" fill="#0070cc" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
