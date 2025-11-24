import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/daily/today', label: 'Daily Detail' }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-slate-200 min-h-screen p-4 flex flex-col gap-4">
      <div className="text-xl font-bold">Omni</div>
      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded ${active ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
