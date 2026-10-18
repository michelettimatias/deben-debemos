'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface StoreOption {
  id: number;
  name: string;
}

interface StorePerspectiveSelectorProps {
  stores: StoreOption[];
  defaultStoreId?: number | null;
}

export default function StorePerspectiveSelector({
  stores,
  defaultStoreId,
}: StorePerspectiveSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const storeParam = searchParams.get('store');
  const selectedValue =
    storeParam !== null
      ? storeParam
      : defaultStoreId
      ? String(defaultStoreId)
      : 'all';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('store', val);

    const targetPath = pathname.startsWith('/dashboard/usuarios') ? '/dashboard' : pathname;
    router.replace(`${targetPath}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedValue}
        onChange={handleChange}
        aria-label="Ver movimientos desde la perspectiva de"
        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition cursor-pointer shadow-sm"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {s.name.toLowerCase().includes('sagunto') ? '(Tu base: Sagunto)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
