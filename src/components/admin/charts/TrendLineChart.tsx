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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line, #1c2230)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b95a7" }} axisLine={{ stroke: "#1c2230" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8b95a7" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#0d1017", border: "1px solid #1c2230", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#f2f4f8" }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
