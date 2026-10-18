	'use client';

	import { useState, useTransition } from 'react';
	import {
	ProductRow,
	UnitRow,
	GroupRow,
	saveProductAction,
	deleteProductAction,
	saveGroupAction,
	deleteGroupAction,
	saveUnitAction,
	deleteUnitAction,
	} from './actions';

	interface ProductsViewProps {
	initialProducts: ProductRow[];
	initialUnits: UnitRow[];
	initialGroups: GroupRow[];
	}

	export default function ProductsManagementView({
	initialProducts,
	initialUnits,
	initialGroups,
	}: ProductsViewProps) {
	const [activeTab, setActiveTab] = useState<'products' | 'groups' | 'units'>('products');
	const [isPending, startTransition] = useTransition();

	// Estados de datos locales
	const [products, setProducts] = useState<ProductRow[]>(initialProducts);
	const [units, setUnits] = useState<UnitRow[]>(initialUnits);
	const [groups, setGroups] = useState<GroupRow[]>(initialGroups);

	// Filtros en la pestaña de productos
	const [searchFilter, setSearchFilter] = useState('');
	const [groupFilter, setGroupFilter] = useState<string>('all');
	const [unitFilter, setUnitFilter] = useState<string>('all');

	// Mensajes globales de feedback
	const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

	// Mapeos rápidos
	const groupsMap = new Map<number, string>(groups.map((g) => [g.group_id, g.group_name]));
	const unitsMap = new Map<number, UnitRow>(units.map((u) => [u.id, u]));

	// Conteo de productos por grupo y unidad
	const productsByGroupCount = new Map<number, number>();
	const productsByUnitCount = new Map<number, number>();
	products.forEach((p) => {
		if (p.group) {
		productsByGroupCount.set(p.group, (productsByGroupCount.get(p.group) || 0) + 1);
		}
		if (p.product_unit) {
		productsByUnitCount.set(p.product_unit, (productsByUnitCount.get(p.product_unit) || 0) + 1);
		}
	});

	// =========================================================================
	// MODALES Y FORMULARIOS
	// =========================================================================

	// Modal Producto
	const [productModalOpen, setProductModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
	const [productFormName, setProductFormName] = useState('');
	const [productFormGroup, setProductFormGroup] = useState<string>('');
	const [productFormUnit, setProductFormUnit] = useState<string>('');
	const [productFormError, setProductFormError] = useState<string | null>(null);

	const handleOpenProductModal = (product?: ProductRow) => {
		if (product) {
		setEditingProduct(product);
		setProductFormName(product.name);
		setProductFormGroup(product.group ? String(product.group) : '');
		setProductFormUnit(product.product_unit ? String(product.product_unit) : '');
		} else {
		setEditingProduct(null);
		setProductFormName('');
		setProductFormGroup(groups[0]?.group_id ? String(groups[0].group_id) : '');
		setProductFormUnit(units[0]?.id ? String(units[0].id) : '');
		}
		setProductFormError(null);
		setProductModalOpen(true);
	};

	const handleSaveProduct = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!productFormName.trim()) {
		setProductFormError('El nombre del producto es requerido.');
		return;
		}

		startTransition(async () => {
		const res = await saveProductAction({
			id: editingProduct?.id,
			name: productFormName.trim(),
			group: productFormGroup ? Number(productFormGroup) : null,
			product_unit: productFormUnit ? Number(productFormUnit) : null,
		});

		if (res.error) {
			setProductFormError(res.error);
		} else if (res.product) {
			if (editingProduct) {
			setProducts((prev) => prev.map((p) => (p.id === res.product!.id ? res.product! : p)));
			setFeedback({ type: 'success', message: `Producto "${res.product.name}" actualizado con éxito.` });
			} else {
			setProducts((prev) => [res.product!, ...prev]);
			setFeedback({ type: 'success', message: `Producto "${res.product.name}" creado con éxito.` });
			}
			setProductModalOpen(false);
		}
		});
	};

	const handleDeleteProduct = (id: number, name: string) => {
		if (!confirm(`¿Estás seguro de eliminar el producto "${name}"?`)) return;

		startTransition(async () => {
		const res = await deleteProductAction(id);
		if (res.error) {
			setFeedback({ type: 'error', message: res.error });
		} else {
			setProducts((prev) => prev.filter((p) => p.id !== id));
			setFeedback({ type: 'success', message: `Producto "${name}" eliminado correctamente.` });
		}
		});
	};

	// Modal Categoría (Group)
	const [groupModalOpen, setGroupModalOpen] = useState(false);
	const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
	const [groupFormName, setGroupFormName] = useState('');
	const [groupFormError, setGroupFormError] = useState<string | null>(null);

	const handleOpenGroupModal = (group?: GroupRow) => {
		if (group) {
		setEditingGroup(group);
		setGroupFormName(group.group_name);
		} else {
		setEditingGroup(null);
		setGroupFormName('');
		}
		setGroupFormError(null);
		setGroupModalOpen(true);
	};

	const handleSaveGroup = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!groupFormName.trim()) {
		setGroupFormError('El nombre de la categoría es obligatorio.');
		return;
		}

		startTransition(async () => {
		const res = await saveGroupAction({
			group_id: editingGroup?.group_id,
			group_name: groupFormName.trim(),
		});

		if (res.error) {
			setGroupFormError(res.error);
		} else if (res.group) {
			if (editingGroup) {
			setGroups((prev) => prev.map((g) => (g.group_id === res.group!.group_id ? res.group! : g)));
			setFeedback({ type: 'success', message: `Categoría "${res.group.group_name}" actualizada con éxito.` });
			} else {
			setGroups((prev) => [...prev, res.group!]);
			setFeedback({ type: 'success', message: `Categoría "${res.group.group_name}" creada con éxito.` });
			}
			setGroupModalOpen(false);
		}
		});
	};

	const handleDeleteGroup = (groupId: number, groupName: string) => {
		if (!confirm(`¿Estás seguro de eliminar la categoría "${groupName}"?`)) return;

		startTransition(async () => {
		const res = await deleteGroupAction(groupId);
		if (res.error) {
			setFeedback({ type: 'error', message: res.error });
		} else {
			setGroups((prev) => prev.filter((g) => g.group_id !== groupId));
			setFeedback({ type: 'success', message: `Categoría "${groupName}" eliminada correctamente.` });
		}
		});
	};

	// Modal Unidad (Unit)
	const [unitModalOpen, setUnitModalOpen] = useState(false);
	const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null);
	const [unitFormName, setUnitFormName] = useState('');
	const [unitFormAbbr, setUnitFormAbbr] = useState('');
	const [unitFormError, setUnitFormError] = useState<string | null>(null);

	const handleOpenUnitModal = (unit?: UnitRow) => {
		if (unit) {
		setEditingUnit(unit);
		setUnitFormName(unit.name);
		setUnitFormAbbr(unit.abreviation || '');
		} else {
		setEditingUnit(null);
		setUnitFormName('');
		setUnitFormAbbr('');
		}
		setUnitFormError(null);
		setUnitModalOpen(true);
	};

	const handleSaveUnit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!unitFormName.trim()) {
		setUnitFormError('El nombre de la unidad es obligatorio.');
		return;
		}

		startTransition(async () => {
		const res = await saveUnitAction({
			id: editingUnit?.id,
			name: unitFormName.trim(),
			abreviation: unitFormAbbr.trim() || undefined,
		});

		if (res.error) {
			setUnitFormError(res.error);
		} else if (res.unit) {
			if (editingUnit) {
			setUnits((prev) => prev.map((u) => (u.id === res.unit!.id ? res.unit! : u)));
			setFeedback({ type: 'success', message: `Unidad "${res.unit.name}" actualizada con éxito.` });
			} else {
			setUnits((prev) => [...prev, res.unit!]);
			setFeedback({ type: 'success', message: `Unidad "${res.unit.name}" creada con éxito.` });
			}
			setUnitModalOpen(false);
		}
		});
	};

	const handleDeleteUnit = (id: number, name: string) => {
		if (!confirm(`¿Estás seguro de eliminar la unidad "${name}"?`)) return;

		startTransition(async () => {
		const res = await deleteUnitAction(id);
		if (res.error) {
			setFeedback({ type: 'error', message: res.error });
		} else {
			setUnits((prev) => prev.filter((u) => u.id !== id));
			setFeedback({ type: 'success', message: `Unidad "${name}" eliminada correctamente.` });
		}
		});
	};

	// Filtrado de productos
	const filteredProducts = products.filter((p) => {
		const matchesSearch = p.name.toLowerCase().includes(searchFilter.trim().toLowerCase());
		const matchesGroup = groupFilter === 'all' || (p.group !== null && String(p.group) === groupFilter);
		const matchesUnit = unitFilter === 'all' || (p.product_unit !== null && String(p.product_unit) === unitFilter);
		return matchesSearch && matchesGroup && matchesUnit;
	});

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('es-ES', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		});
	};

	return (
		<div className="flex flex-col gap-4 h-full">

			{/* Alerta de Feedback */}
			{feedback && (
				<div
					className={`p-4 rounded-xl border flex items-center justify-between transition ${
						feedback.type === 'success'
						? 'bg-emerald-50 border-emerald-200 text-emerald-800'
						: 'bg-red-50 border-red-200 text-red-800'
					}`}
				>
					<div className="flex items-center gap-2 text-sm font-medium">
						<span>{feedback.type === 'success' ? '✓' : '⚠'}</span>
						<span>{feedback.message}</span>
					</div>
					<button
						type="button"
						onClick={() => setFeedback(null)}
						className="text-xs font-bold px-2 py-1 hover:opacity-75"
					>
						✕
					</button>
				</div>
			)}

			{/* Selector de Pestañas */}
			<div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => setActiveTab('products')}
					className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
						activeTab === 'products'
						? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
						: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
					}`}
				>
					<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
					<span>Productos</span>
					<span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'products' ? 'bg-blue-700/80 text-white' : 'bg-slate-100 text-slate-600'}`}>
						{products.length}
					</span>
				</button>

				<button
				type="button"
				onClick={() => setActiveTab('groups')}
				className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
					activeTab === 'groups'
					? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
					: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
				}`}
				>
				<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
				</svg>
				<span>Categorías (Grupos)</span>
				<span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'groups' ? 'bg-blue-700/80 text-white' : 'bg-slate-100 text-slate-600'}`}>
					{groups.length}
				</span>
				</button>

				<button
				type="button"
				onClick={() => setActiveTab('units')}
				className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
					activeTab === 'units'
					? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
					: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
				}`}
				>
				<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
				</svg>
				<span>Unidades de Medida</span>
				<span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'units' ? 'bg-blue-700/80 text-white' : 'bg-slate-100 text-slate-600'}`}>
					{units.length}
				</span>
				</button>
			</div>

			{/* ========================================================================= */}
			{/* 1. SECCIÓN PRODUCTOS */}
			{/* ========================================================================= */}
			{activeTab === 'products' && (
				<div className="bg-white h-full flex flex-col rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
					{/* Barra de Filtros y Creación */}
					<div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="flex flex-wrap items-center gap-3 flex-1">
							{/* Buscador */}
							<div className="relative min-w-[220px] flex-1 max-w-sm">
								<input
									type="text"
									placeholder="Buscar producto..."
									value={searchFilter}
									onChange={(e) => setSearchFilter(e.target.value)}
									className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
								/>
								<svg
									className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</div>

							{/* Filtro por Categoría */}
							<select
								value={groupFilter}
								onChange={(e) => setGroupFilter(e.target.value)}
								className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							>
								<option value="all">Todas las categorías</option>
								{groups.map((g) => (
								<option key={g.group_id} value={g.group_id}>
									{g.group_name}
								</option>
								))}
							</select>

							{/* Filtro por Unidad */}
							<select
								value={unitFilter}
								onChange={(e) => setUnitFilter(e.target.value)}
								className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							>
								<option value="all">Todas las unidades</option>
								{units.map((u) => (
								<option key={u.id} value={u.id}>
									{u.name} {u.abreviation ? `(${u.abreviation})` : ''}
								</option>
								))}
							</select>
						</div>

						<button
						type="button"
						onClick={() => handleOpenProductModal()}
						className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 shrink-0"
						>
						<span>+ Nuevo Producto</span>
						</button>
					</div>

					{/* Tabla de Productos */}
					<div className="h-full overflow-hidden">
						<div className="flex flex-col h-full">
							<div className='w-full flex'>
								<div className="flex w-full bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
									<div className="py-3 px-4 basis-1/12">ID</div>
									<div className="py-3 px-4 basis-5/12">Producto</div>
									<div className="py-3 px-4 basis-2/12">Categoría (FK: groups)</div>
									<div className="py-3 px-4 basis-2/12">Unidad de Medida (FK: units)</div>
									<div className="py-3 px-4 basis-2/12">Fecha Creación</div>
									<div className="py-3 px-4 basis-2/12 text-right">Acciones</div>
								</div>
							</div>
							<div className='w-full flex flex-col h-full overflow-y-scroll'>
								{filteredProducts.length === 0 ? (
									<div className='w-full py-12 text-center text-slate-400 text-sm'>
										No se encontraron productos con los filtros seleccionados.
									</div>
								) : (
									filteredProducts.map((p) => {
										const groupName = p.group ? groupsMap.get(p.group) : null;
										const unitObj = p.product_unit ? unitsMap.get(p.product_unit) : null;

										return (
											<div key={p.id} className="flex hover:bg-slate-50/60 transition">
												<div className="basis-1/12 py-3.5 px-4 font-mono text-xs text-slate-400">#{p.id}</div>
												<div className="basis-5/12 py-3.5 px-4 font-bold text-slate-900">{p.name}</div>
												<div className="basis-2/12 py-3.5 px-4">
													{groupName ? (
														<span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
															{groupName}
														</span>
													) : (
														<span className="text-xs text-slate-400 italic">Sin categoría</span>
													)}
												</div>
												<div className="basis-2/12 py-3.5 px-4">
													{unitObj ? (
														<span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
															{unitObj.name} {unitObj.abreviation ? `(${unitObj.abreviation})` : ''}
														</span>
													) : (
														<span className="text-xs text-slate-400 italic">Sin unidad</span>
													)}
												</div>
												<div className="basis-2/12 py-3.5 px-4 text-xs text-slate-500">{formatDate(p.created_at)}</div>
												<div className="basis-2/12 py-3.5 px-4 text-right space-x-2">
													<button
														type="button"
														onClick={() => handleOpenProductModal(p)}
																					className="px-3 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
													>
														Editar
													</button>
													<button
														type="button"
														onClick={() => handleDeleteProduct(p.id, p.name)}
														disabled={isPending}
														className="px-3 py-1 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
													>
														Eliminar
													</button>
												</div>
											</div>
										);
									})
								)}
						</div>
					</div>
				</div>
			</div>
		)}

		{/* ========================================================================= */}
		{/* 2. SECCIÓN CATEGORÍAS (GROUPS) */}
		{/* ========================================================================= */}
		{activeTab === 'groups' && (
			<div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
			<div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
				<div>
				<h2 className="font-bold text-slate-900 text-lg">Categorías de Productos</h2>
				<p className="text-xs text-slate-500">
					Almacenadas en la tabla <code className="font-mono text-blue-700">groups</code>. Se vinculan con los productos como clave foránea.
				</p>
				</div>
				<button
				type="button"
				onClick={() => handleOpenGroupModal()}
				className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 shrink-0"
				>
				<span>+ Nueva Categoría</span>
				</button>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
				<thead>
					<tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
					<th className="py-3 px-4">ID (group_id)</th>
					<th className="py-3 px-4">Nombre de Categoría</th>
					<th className="py-3 px-4">Productos Asociados</th>
					<th className="py-3 px-4">Fecha Creación</th>
					<th className="py-3 px-4 text-right">Acciones</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100 text-sm text-slate-700">
					{groups.length === 0 ? (
					<tr>
						<td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
						Aún no hay categorías registradas en la tabla groups.
						</td>
					</tr>
					) : (
					groups.map((g) => {
						const count = productsByGroupCount.get(g.group_id) || 0;
						return (
						<tr key={g.group_id} className="hover:bg-slate-50/60 transition">
							<td className="py-3.5 px-4 font-mono text-xs text-slate-400">#{g.group_id}</td>
							<td className="py-3.5 px-4 font-bold text-slate-900">{g.group_name}</td>
							<td className="py-3.5 px-4">
							<span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
								{count} {count === 1 ? 'producto' : 'productos'}
							</span>
							</td>
							<td className="py-3.5 px-4 text-xs text-slate-500">{formatDate(g.created_at)}</td>
							<td className="py-3.5 px-4 text-right space-x-2">
							<button
								type="button"
								onClick={() => handleOpenGroupModal(g)}
								className="px-3 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
							>
								Editar
							</button>
							<button
								type="button"
								onClick={() => handleDeleteGroup(g.group_id, g.group_name)}
								disabled={isPending}
								className="px-3 py-1 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
							>
								Eliminar
							</button>
							</td>
						</tr>
						);
					})
					)}
				</tbody>
				</table>
			</div>
			</div>
		)}

		{/* ========================================================================= */}
		{/* 3. SECCIÓN UNIDADES DE MEDIDA (UNITS) */}
		{/* ========================================================================= */}
		{activeTab === 'units' && (
			<div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
			<div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
				<div>
				<h2 className="font-bold text-slate-900 text-lg">Unidades de Medida</h2>
				<p className="text-xs text-slate-500">
					Almacenadas en la tabla <code className="font-mono text-emerald-700">units</code>. Se vinculan con los productos como clave foránea.
				</p>
				</div>
				<button
				type="button"
				onClick={() => handleOpenUnitModal()}
				className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 shrink-0"
				>
				<span>+ Nueva Unidad</span>
				</button>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
				<thead>
					<tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
					<th className="py-3 px-4">ID</th>
					<th className="py-3 px-4">Nombre de Unidad</th>
					<th className="py-3 px-4">Abreviatura</th>
					<th className="py-3 px-4">Productos Asociados</th>
					<th className="py-3 px-4">Fecha Creación</th>
					<th className="py-3 px-4 text-right">Acciones</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100 text-sm text-slate-700">
					{units.length === 0 ? (
					<tr>
						<td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
						Aún no hay unidades registradas en la tabla units.
						</td>
					</tr>
					) : (
					units.map((u) => {
						const count = productsByUnitCount.get(u.id) || 0;
						return (
						<tr key={u.id} className="hover:bg-slate-50/60 transition">
							<td className="py-3.5 px-4 font-mono text-xs text-slate-400">#{u.id}</td>
							<td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
							<td className="py-3.5 px-4">
							{u.abreviation ? (
								<span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
								{u.abreviation}
								</span>
							) : (
								<span className="text-xs text-slate-400 italic">-</span>
							)}
							</td>
							<td className="py-3.5 px-4">
							<span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
								{count} {count === 1 ? 'producto' : 'productos'}
							</span>
							</td>
							<td className="py-3.5 px-4 text-xs text-slate-500">{formatDate(u.created_at)}</td>
							<td className="py-3.5 px-4 text-right space-x-2">
							<button
								type="button"
								onClick={() => handleOpenUnitModal(u)}
								className="px-3 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
							>
								Editar
							</button>
							<button
								type="button"
								onClick={() => handleDeleteUnit(u.id, u.name)}
								disabled={isPending}
								className="px-3 py-1 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
							>
								Eliminar
							</button>
							</td>
						</tr>
						);
					})
					)}
				</tbody>
				</table>
			</div>
			</div>
		)}

		{/* ========================================================================= */}
		{/* MODAL CREAR / EDITAR PRODUCTO */}
		{/* ========================================================================= */}
		{productModalOpen && (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
			<div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
				<div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
				<h3 className="font-bold text-slate-900 text-base">
					{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
				</h3>
				<button
					type="button"
					onClick={() => setProductModalOpen(false)}
					className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
				>
					✕
				</button>
				</div>

				<form onSubmit={handleSaveProduct} className="p-6 space-y-4">
				{productFormError && (
					<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
					{productFormError}
					</div>
				)}

				<div>
					<label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
					Nombre del Producto
					</label>
					<input
					type="text"
					required
					value={productFormName}
					onChange={(e) => setProductFormName(e.target.value)}
					placeholder="Ej: Tomate frito, Carne de ternera..."
					className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
					/>
				</div>

				<div>
					<label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
					Categoría (Clave foránea ➔ groups)
					</label>
					<select
					value={productFormGroup}
					onChange={(e) => setProductFormGroup(e.target.value)}
					className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
					>
					<option value="">Sin categoría asignada</option>
					{groups.map((g) => (
						<option key={g.group_id} value={g.group_id}>
						{g.group_name}
						</option>
					))}
					</select>
				</div>

				<div>
					<label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
					Unidad de Medida (Clave foránea ➔ units)
					</label>
					<select
					value={productFormUnit}
					onChange={(e) => setProductFormUnit(e.target.value)}
					className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
					>
					<option value="">Sin unidad asignada</option>
					{units.map((u) => (
						<option key={u.id} value={u.id}>
						{u.name} {u.abreviation ? `(${u.abreviation})` : ''}
						</option>
					))}
					</select>
				</div>

				<div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
					<button
					type="button"
					onClick={() => setProductModalOpen(false)}
					disabled={isPending}
					className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
					>
					Cancelar
					</button>
					<button
					type="submit"
					disabled={isPending || !productFormName.trim()}
					className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
					>
					{isPending ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
					</button>
				</div>
				</form>
			</div>
			</div>
		)}

		{/* ========================================================================= */}
		{/* MODAL CREAR / EDITAR CATEGORÍA */}
		{/* ========================================================================= */}
		{groupModalOpen && (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
			<div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
				<div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
				<h3 className="font-bold text-slate-900 text-base">
					{editingGroup ? 'Editar Categoría' : 'Nueva Categoría'}
				</h3>
				<button
					type="button"
					onClick={() => setGroupModalOpen(false)}
					className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
				>
					✕
				</button>
				</div>

				<form onSubmit={handleSaveGroup} className="p-6 space-y-4">
				{groupFormError && (
					<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
					{groupFormError}
					</div>
				)}

				<div>
					<label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
					Nombre de la Categoría
					</label>
					<input
					type="text"
					required
					value={groupFormName}
					onChange={(e) => setGroupFormName(e.target.value)}
					placeholder="Ej: Ingredientes, Bebidas, Envases..."
					className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
					/>
				</div>

				<div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
					<button
					type="button"
					onClick={() => setGroupModalOpen(false)}
					disabled={isPending}
					className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
					>
					Cancelar
					</button>
					<button
					type="submit"
					disabled={isPending || !groupFormName.trim()}
					className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
					>
					{isPending ? 'Guardando...' : editingGroup ? 'Actualizar Categoría' : 'Guardar Categoría'}
					</button>
				</div>
				</form>
			</div>
			</div>
		)}

		{/* ========================================================================= */}
		{/* MODAL CREAR / EDITAR UNIDAD */}
		{/* ========================================================================= */}
		{unitModalOpen && (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
			<div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
				<div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
				<h3 className="font-bold text-slate-900 text-base">
					{editingUnit ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
				</h3>
				<button
					type="button"
					onClick={() => setUnitModalOpen(false)}
					className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
				>
					✕
				</button>
				</div>

				<form onSubmit={handleSaveUnit} className="p-6 space-y-4">
				{unitFormError && (
					<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
					{unitFormError}
					</div>
				)}

				<div>
					<label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
					Nombre de la Unidad
					</label>
					<input
					type="text"
					required
					value={unitFormName}
					onChange={(e) => setUnitFormName(e.target.value)}
					placeholder="Ej: kilogramos, litros, cajas, unidades..."
					className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
					/>
				</div>

				<div>
					<label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
					Abreviatura (Opcional)
					</label>
					<input
					type="text"
					value={unitFormAbbr}
					onChange={(e) => setUnitFormAbbr(e.target.value)}
					placeholder="Ej: kg, L, u, cajas..."
					className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
					/>
				</div>

				<div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
					<button
					type="button"
					onClick={() => setUnitModalOpen(false)}
					disabled={isPending}
					className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
					>
					Cancelar
					</button>
					<button
					type="submit"
					disabled={isPending || !unitFormName.trim()}
					className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
					>
					{isPending ? 'Guardando...' : editingUnit ? 'Actualizar Unidad' : 'Guardar Unidad'}
					</button>
				</div>
				</form>
			</div>
			</div>
		)}
		</div>
	);
	}
