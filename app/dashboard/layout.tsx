import { Suspense } from 'react';
import DashboardHeader from '@/components/DashboardHeader';

export const instant = false;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-200 min-h-screen lg:max-h-screen lg:overflow-hidden flex flex-col">
      <Suspense fallback={<div className="h-20 bg-white shadow-lg animate-pulse" />}>
        <DashboardHeader title="DEBEN / DEBEMOS" />
      </Suspense>
      {children}
    </div>
  );
}
