'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { WeeklyAnalyticsDay } from '../lib/api';

export function TasksLineChart({ data }: { data: WeeklyAnalyticsDay[] }) {
  return (
    <div className="h-64 bg-white border border-slate-200 rounded p-4">
      <h3 className="font-semibold mb-2">Tasks Completed Per Day</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="tasksCompleted" stroke="#0ea5e9" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FocusBarChart({ data }: { data: WeeklyAnalyticsDay[] }) {
  return (
    <div className="h-64 bg-white border border-slate-200 rounded p-4">
      <h3 className="font-semibold mb-2">Focus Minutes Per Day</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="focusMinutes" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
