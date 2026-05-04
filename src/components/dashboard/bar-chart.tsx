"use client";

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type BarChartProps = {
  data: { status: string; count: number }[];
};

export function BarChart({ data }: BarChartProps) {
  return (
    <div className="w-full h-72 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} barSize={24}>
          <XAxis
            dataKey="status"
            stroke="#7e7e7e"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#3c3c3c' }}
            tick={{ fill: '#7e7e7e', fontWeight: 700, letterSpacing: '1px' }}
          />
          <YAxis
            stroke="#7e7e7e"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            tick={{ fill: '#7e7e7e' }}
          />
          <Tooltip
            cursor={{ fill: '#262626' }}
            contentStyle={{
              background: '#1a1a1a',
              border: '1px solid #3c3c3c',
              borderRadius: '0px',
              color: '#e6e6e6',
              fontSize: '12px',
              fontWeight: '700',
            }}
            labelStyle={{ color: '#7e7e7e', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px' }}
          />
          <Bar dataKey="count" fill="#0066b1" radius={[0, 0, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
