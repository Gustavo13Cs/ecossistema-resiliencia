"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

interface MarkerHistoryPoint {
  date: string
  fullDate: string
  value: number
  unit: string
}
interface PlotProps {
  data: MarkerHistoryPoint[]
  marker: string
}

export function MarkerHistoryChart({ data, marker }: PlotProps) {
  return (
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f1f5f9"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value, _name, item) => [
              `${value} ${(item.payload as MarkerHistoryPoint).unit}`,
              marker,
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#e11d48"
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 8, fill: "#e11d48" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
