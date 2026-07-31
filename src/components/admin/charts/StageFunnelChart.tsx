"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

export function StageFunnelChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c2230" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b95a7" }} axisLine={{ stroke: "#1c2230" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8b95a7" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#0d1017", border: "1px solid #1c2230", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#f2f4f8" }}
          cursor={{ fill: "rgba(37,99,235,0.08)" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? "#2563eb" : "#38bdf8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
