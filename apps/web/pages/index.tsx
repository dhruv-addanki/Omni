import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api, WeeklyAnalyticsDay } from '../lib/api';
import { TasksLineChart, FocusBarChart } from '../components/Charts';

export default function OverviewPage() {
  const [data, setData] = useState<WeeklyAnalyticsDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getWeekly();
        setData(res);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const avgTasks = data.length
    ? Math.round(data.reduce((acc, d) => acc + d.tasksCompleted, 0) / data.length)
    : 0;
  const avgFocus = data.length
    ? Math.round(data.reduce((acc, d) => acc + d.focusMinutes, 0) / data.length)
    : 0;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-slate-600">Last 7 days performance</p>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-500">Avg tasks completed</div>
                <div className="text-3xl font-bold">{avgTasks}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-500">Avg focus minutes</div>
                <div className="text-3xl font-bold">{avgFocus}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TasksLineChart data={data} />
              <FocusBarChart data={data} />
            </div>

            <div className="bg-white border border-slate-200 rounded p-4">
              <h3 className="font-semibold mb-2">Reflections (last 7 days)</h3>
              <div className="flex flex-col gap-2 text-sm">
                {data.map((d) => (
                  <div key={d.date} className="border border-slate-100 rounded p-2">
                    <div className="font-medium">{d.date}</div>
                    <div className="text-slate-600">Rating: {d.reflectionRating ?? 'N/A'}</div>
                    {d.aiSummary ? (
                      <div className="text-slate-700 mt-1">{d.aiSummary}</div>
                    ) : (
                      <div className="text-slate-400">No summary</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
