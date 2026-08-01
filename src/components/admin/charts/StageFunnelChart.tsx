"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

export function StageFunnelChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e7ec" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#667085" }} axisLine={{ stroke: "#e3e7ec" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#ffffff", border: "1px solid #e3e7ec", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#101828" }}
          cursor={{ fill: "rgba(22,163,74,0.08)" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? "#16a34a" : "#4ade80"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
