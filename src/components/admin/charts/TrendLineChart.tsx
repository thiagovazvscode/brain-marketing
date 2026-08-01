"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export interface TrendSeries {
  key: string;
  name: string;
  color: string;
}

export function TrendLineChart({
  data,
  series,
  height = 240,
}: {
  data: Record<string, string | number>[];
  series: TrendSeries[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e7ec" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#667085" }} axisLine={{ stroke: "#e3e7ec" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#ffffff", border: "1px solid #e3e7ec", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#101828" }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
