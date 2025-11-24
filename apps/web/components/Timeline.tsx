interface Block {
  id: string;
  start: string;
  end: string;
  taskId?: string | null;
}

interface ScreenTimeEvent {
  id: string;
  appName: string;
  category: string;
  start: string;
  end: string;
}

function timeToPercent(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes / (24 * 60)) * 100;
}

export default function Timeline({
  plannedBlocks,
  actualBlocks,
  screenTimeEvents
}: {
  plannedBlocks: Block[];
  actualBlocks: Block[];
  screenTimeEvents: ScreenTimeEvent[];
}) {
  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <h3 className="font-semibold mb-2">Timeline</h3>
      <div className="space-y-4">
        <Row label="Planned" color="bg-sky-200" blocks={plannedBlocks} />
        <Row label="Actual" color="bg-emerald-200" blocks={actualBlocks} />
        <Row label="Screen" color="bg-rose-200" blocks={screenTimeEvents} isScreen />
      </div>
    </div>
  );
}

function Row({
  label,
  color,
  blocks,
  isScreen = false
}: {
  label: string;
  color: string;
  blocks: Array<{ id: string; start: string; end: string }>;
  isScreen?: boolean;
}) {
  return (
    <div>
      <div className="text-sm font-semibold mb-1">{label}</div>
      <div className="relative h-10 bg-slate-100 rounded">
        {blocks.map((b) => {
          const s = timeToPercent(new Date(b.start));
          const e = timeToPercent(new Date(b.end));
          const width = Math.max(e - s, 1);
          return (
            <div
              key={b.id}
              className={`absolute h-6 ${color} ${isScreen ? 'opacity-80' : ''}`}
              style={{ left: `${s}%`, width: `${width}%`, top: '0.5rem' }}
              title={`${new Date(b.start).toLocaleTimeString()} - ${new Date(b.end).toLocaleTimeString()}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
