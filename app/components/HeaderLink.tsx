'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HeaderLink({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}) {

	const pathname = usePathname();

  return (
	<>
	{pathname === href?
		<div
			className='w-full lg:w-auto px-4 py-2 text-center text-xs tracking-widest font-bold rounded-md transition bg-blue-700 text-white cursor-default'
		>
			{children}
		</div>
	:
		
		<Link
			href={href}
			className={`w-full lg:w-auto px-4 py-2 text-center text-xs tracking-widest font-bold rounded-md transition ${
				(pathname === href)
					? 'bg-blue-700 text-white hover:bg-blue-800'
					: 'text-slate-600 hover:bg-white border border-white hover:border-slate-300 hover:shadow-sm'
			}`}
		>
			{children}
		</Link>

	}
	
	</>
  );
}
