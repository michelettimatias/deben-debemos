'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { confirmLoan, initiateReturn, confirmReturn, cancelLoan } from '@/lib/actions';
import { Store } from './new-transfer-form';

export type TransferItem = {
  id: number;
  item_name: string;
  quantity: number;
  unit?: string | null;
  sender_store_id: number;
  receiver_store_id: number;
  status: string; // 'PENDING_LOAN' | 'ACTIVE' | 'PENDING_RETURN' | 'RETURNED'
  created_by_user_id: string;
  confirmed_by_user_id?: string | null;
  loan_date?: string | null;
  created_at: string;
  updated_at?: string | null;
};

interface MovementsViewProps {
  transfers: TransferItem[];
  stores: Store[];
  currentUserId: string;
  userStoreId?: number | null;
  isSuperUser: boolean;
}

export default function MovementsView({
  transfers,
  stores,
  currentUserId,
  userStoreId,
  isSuperUser,
}: MovementsViewProps) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const storeParam = searchParams.get('store');

  // Si es superusuario, por defecto seleccionamos Sagunto (o la tienda del perfil)
  const defaultStoreId = userStoreId ?? stores.find((s) => s.name.toLowerCase().includes('sagunto'))?.id ?? stores[0]?.id;
  const selectedPerspectiveStoreId: number | 'all' = isSuperUser
    ? (storeParam !== null ? (storeParam === 'all' ? 'all' : Number(storeParam)) : (defaultStoreId ?? 'all'))
    : (userStoreId ?? 'all');

  const storesMap = new Map<number, string>(stores.map((s) => [s.id, s.name]));

  // Filtrar según la tienda seleccionada
  const activeStoreId = selectedPerspectiveStoreId === 'all' ? null : Number(selectedPerspectiveStoreId);
  const activeStoreName = activeStoreId ? storesMap.get(activeStoreId) : 'Todas las tiendas';

  // 1. SECCIÓN PENDIENTES (PENDING_LOAN y PENDING_RETURN)
  const pendingMovements = transfers.filter((t) => {
    const isPendingStatus = t.status === 'PENDING_LOAN' || t.status === 'PENDING_RETURN';
    if (!isPendingStatus) return false;
    if (!activeStoreId) return true;
    return t.sender_store_id === activeStoreId || t.receiver_store_id === activeStoreId;
  });

  // 2. SECCIÓN CONFIRMADOS (ACTIVE)
  // 2a. Nos Deben (nuestra tienda prestó el producto)
  const theyOweUs = transfers.filter((t) => {
    if (t.status !== 'ACTIVE') return false;
    if (activeStoreId) {
      return t.sender_store_id === activeStoreId;
    }
    return true; // En vista global se muestran todos los activos
  });

  // 2b. Debemos (otra tienda nos prestó el producto a nosotros)
  const weOwe = transfers.filter((t) => {
    if (t.status !== 'ACTIVE') return false;
    if (activeStoreId) {
      return t.receiver_store_id === activeStoreId;
    }
    return false; // En vista global 'debemos' se contextualiza con una tienda elegida
  });

  // Formatear fechas
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const [message, setMessage] = useState('NONE');

	return (
		<div className="col-span-2 h-full overflow-hidden flex flex-col gap-8">


			{/* 1. PRIMERA SECCIÓN: MOVIMIENTOS PENDIENTES DE CONFIRMACIÓN */}

			{pendingMovements.length > 0 &&
				<section className='flex flex-col gap-4'>
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							Pendientes de confirmación
						</h2>
						<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
							{pendingMovements.length} <span className='hidden lg:inline'>{pendingMovements.length === 1 ? 'pendiente' : 'pendientes'}</span>
						</span>
					</div>
					<div className="grid gap-1 rounded-xl overflow-hidden">
						{pendingMovements.map((t) => {
						const senderName = storesMap.get(t.sender_store_id) ?? `Tienda #${t.sender_store_id}`;
						const receiverName = storesMap.get(t.receiver_store_id) ?? `Tienda #${t.receiver_store_id}`;
						const isLoan = t.status === 'PENDING_LOAN';
						const isReturn = t.status === 'PENDING_RETURN';

						// ¿Quién debe confirmar?
						// En un préstamo nuevo (PENDING_LOAN): solo confirma la tienda receptora
						const canConfirmLoan = isSuperUser || (userStoreId != null && t.receiver_store_id === userStoreId);
						// En una devolución (PENDING_RETURN): solo confirma la tienda que prestó originalmente
						const canConfirmReturn = isSuperUser || (userStoreId != null && t.sender_store_id === userStoreId);

						return (
							<div
								key={t.id}
								className="p-6 bg-white rounded-sm shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
							>
								<div className="space-y-2 flex-1">
									<div className="flex items-center gap-2.5 flex-wrap">
										<span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200/60">
											{t.quantity} {t.unit ?? ''}
										</span>
										<span className="font-bold text-slate-900 text-base">
											{t.item_name}
										</span>
									</div>

									<div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
									<div className="flex items-center gap-1">
										<span className="text-slate-600 font-bold">ORIGEN:</span>
										<strong className="text-blue-700">{senderName}</strong>
									</div>
									<span className="text-slate-600">➔</span>
									<div className="flex items-center gap-1">
										<span className="text-slate-600 font-bold">DESTINO:</span>
										<strong className="text-indigo-700">{receiverName}</strong>
									</div>
									<span className="text-slate-600 font-bold">•</span>
									<span className="text-slate-600">
										FECHA: <strong>{formatDate(t.loan_date || t.created_at)}</strong>
									</span>
									</div>
								</div>

								{/* Acciones de confirmación */}
								<div className="basis-1/3 flex gap-4">
									{isLoan && !canConfirmLoan && (
										<>
										<button
											type="button"
											disabled={isPending}
											onClick={() => {
												startTransition(async () => {
													await cancelLoan(t.id, currentUserId);
												});
											}}
											className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
										>
											<span>Anular préstamo</span>
										</button>
											<div
												className="w-full text-center px-4 py-2.5 rounded-xl text-gray-600 border border-gray-600 font-semibold text-xs"
											>
												<p>Prestamo por confirmar</p>
											</div>
										</>
									)}
									{isLoan && canConfirmLoan && (
										<button
											type="button"
											disabled={isPending}
											onClick={() => {
												startTransition(async () => {
													const result = await confirmLoan(t.id, currentUserId);
													if (result.success) {
														setMessage('SUCCESS');
													}
												});
											}}
											className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
										>
											<span>Confirmar recepción</span>
										</button>
									)}

									{isReturn && canConfirmReturn && (
										<button
											type="button"
											disabled={isPending}
											onClick={() => {
												startTransition(async () => {
													await confirmReturn(t.id, currentUserId);
												});
											}}
											className="w-full px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
										>
											<span>Confirmar devolución</span>
										</button>
									)}

									{isReturn && !canConfirmReturn && (
										<div
											className="w-full text-center px-4 py-2.5 rounded-xl text-gray-600 border border-gray-600 font-semibold text-xs"
										>
											<p>Devolución por confirmar</p>
										</div>
									)}
								</div>
							</div>
						);
						})}
					</div>
				</section>
			}


			{/* 2. SEGUNDA SECCIÓN: MOVIMIENTOS CONFIRMADOS (DEBEN Y DEBEMOS) */}

			<section className="flex flex-col grow-1 overflow-hidden">

				<div className="flex flex-col lg:flex-row gap-6 overflow-hidden h-full grow-1">
					{/* ------------------------------------------------------------- */}
					{/* BLOQUE A: NOS DEBEN (Préstamos que nosotros hicimos a otros) */}
					{/* ------------------------------------------------------------- */}
					<div className="flex flex-col basis-1/2 gap-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-lg bg-lime-600 text-white font-bold flex items-center justify-center text-md shadow-lg">
								↑
								</div>
								<div>
									<h3 className="font-bold text-slate-900 text-base">Nos Deben</h3>
								</div>
							</div>
								<span className="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg bg-green-50 text-green-700 border border-green-400">
								{theyOweUs.length}
							</span>
						</div>

						{theyOweUs.length === 0 ? (
							<div className="bg-white rounded-xl text-center py-10 text-slate-400 text-xs flex-1 flex items-center justify-center">
								No hay préstamos pendientes de que nos devuelvan.
							</div>
						) : (
							<div className="bg-white rounded-xl p-2 flex-1 overflow-y-auto grow-1">
								<div className="flex flex-col gap-1 overflow-hidden">
									{theyOweUs.map((t) => {
										const receiverName = storesMap.get(t.receiver_store_id) ?? `Tienda #${t.receiver_store_id}`;

										return (
										<div
											key={t.id}
											className="flex justify-between bg-white border-slate-300 border shadow-sm rounded-lg p-4 hover:bg-slate-50 transition"
										>
											<div className="flex items-start justify-between gap-2">
												<div>
													<div className="font-bold text-slate-900 text-sm">
														{t.quantity} {t.unit==='unidades' ? '' : t.unit} {t.item_name}
													</div>
													<div className="text-xs text-blue-700 font-semibold mt-0.5">
														{receiverName} - {formatDate(t.loan_date || t.created_at)}
													</div>
												</div>
											</div>
											</div>
										);
									})}
								</div>
							</div>
							)}
						</div>

						{/* ------------------------------------------------------------- */}
						{/* BLOQUE B: DEBEMOS (Préstamos que otras tiendas nos hicieron) */}
						{/* ------------------------------------------------------------- */}
						<div className="flex flex-col basis-1/2 gap-4">
							<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm">
									↓
								</div>
								<div>
									<h3 className="font-bold text-slate-900 text-base">Debemos</h3>
								</div>
							</div>
							<span className="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-400">
								{weOwe.length}
							</span>
							</div>

							{weOwe.length === 0 ? (
							<div className="bg-white rounded-xl text-center py-10 text-slate-400 text-xs flex-1 flex items-center justify-center">
								No debemos artículos a ninguna tienda en este momento.
							</div>
							) : (
							<div className="bg-white rounded-xl p-2 flex-1 overflow-y-auto grow-1">
								<div className="flex flex-col gap-2">
									{weOwe.map((t) => {
									const lenderName = storesMap.get(t.sender_store_id) ?? `Tienda #${t.sender_store_id}`;

									return (
										<div
											key={t.id}
											className="flex justify-between bg-white border-slate-300 border shadow-sm rounded-lg p-4 hover:bg-slate-50 transition"
										>
											<div className="flex items-start justify-between gap-2">
												<div>
													<div className="font-bold text-slate-900 text-sm">
														{t.quantity} {t.unit} {t.item_name}
													</div>
													<div className="text-xs text-rose-700 font-semibold mt-0.5">
														{lenderName} - {formatDate(t.loan_date || t.created_at)}
													</div>
												</div>
											</div>

										{/* Botón para Iniciar Devolución */}
										<div className="pt-1">
											<button
											type="button"
											disabled={isPending}
											onClick={() => {
												if (
												confirm(
													`¿Confirmas que inicias la devolución de "${t.item_name}" a la tienda ${lenderName}? Pasará a pendientes de confirmación para que ellos lo verifiquen al recibirlo.`
												)
												) {
												startTransition(async () => {
													await initiateReturn(t.id, currentUserId);
												});
												}
											}}
											className="cursor-pointer w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-semibold text-xs shadow-sm hover:shadow transition disabled:opacity-50 flex items-center justify-center gap-1.5"
											>
											<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
											</svg>
											<span>Devolver</span>
											</button>
										</div>
										</div>
									);
									})}
								</div>
							</div>
							)}
					</div>
				</div>
			</section>
		</div>
	);
}
