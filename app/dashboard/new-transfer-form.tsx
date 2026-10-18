'use client';

import { useActionState, useState, useRef, useEffect } from 'react';
import {
  createTransfer,
  createStoreAction,
  createProductAction,
  TransferState,
  ProductItem,
  UnitItem,
  GroupItem,
} from '@/lib/actions';

export type Store = {
  id: number;
  name: string;
};

interface NewTransferFormProps {
  stores: Store[];
  currentUserEmail: string;
  userStoreId?: number | null;
  isSuperUser: boolean;
  initialProducts?: ProductItem[];
  units?: UnitItem[];
  groups?: GroupItem[];
}

export default function NewTransferForm({
  stores,
  currentUserEmail,
  userStoreId,
  isSuperUser,
  initialProducts = [],
  units = [],
  groups = [],
}: NewTransferFormProps) {
  // Unidades por defecto si la base de datos no tiene unidades cargadas aún
  const defaultFallbackUnits = [
    'unidades',
    'kg',
    'cajas',
    'latas',
    'paquetes',
    'litros',
    'gramos',
  ];

  const initialUnit = units[0]?.name || 'unidades';
  const [unit, setUnit] = useState<string>(initialUnit);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState('');
  const [storeCreationMsg, setStoreCreationMsg] = useState<string | null>(null);

  // Estados de productos y búsqueda
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Estados para modal de carga de nuevo producto
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductGroupId, setNewProductGroupId] = useState<string>('');
  const [newProductUnit, setNewProductUnit] = useState<string>(initialUnit);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productCreationError, setProductCreationError] = useState<string | null>(null);
  const [productCreationSuccess, setProductCreationSuccess] = useState<string | null>(null);

  // Sincronizar productos si cambian las props iniciales
  useEffect(() => {
    if (initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Cerrar desplegable de sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearching(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar la tienda por defecto (ej: Sagunto para superusuario)
  const defaultSaguntoStore = stores.find((s) =>
    s.name.toLowerCase().includes('sagunto')
  );
  const defaultSenderId = isSuperUser
    ? defaultSaguntoStore?.id ?? stores[0]?.id ?? ''
    : userStoreId ?? '';

  const [selectedSenderId, setSelectedSenderId] = useState<string | number>(
    defaultSenderId
  );

  const [state, formAction, isPending] = useActionState(
    createTransfer,
    null as TransferState | null
  );

  // Filtrar tiendas receptoras para no permitir transferir a la misma tienda
  const availableReceivers = stores.filter(
    (s) => String(s.id) !== String(selectedSenderId)
  );

  const [loanDate, setLoanDate] = useState<string>('');

  useEffect(() => {
    setLoanDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeNameInput.trim()) return;
    const formData = new FormData();
    formData.append('name', storeNameInput.trim());
    setIsCreatingStore(true);
    try {
      const res = await createStoreAction(formData);
      if (res?.error) {
        setStoreCreationMsg(`Error: ${res.error}`);
      } else {
        setStoreCreationMsg(`Tienda creada con éxito.`);
        setStoreNameInput('');
      }
    } finally {
      setIsCreatingStore(false);
    }
  };

  // Coincidencias de productos según el texto introducido
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchingProducts = normalizedSearch
    ? products.filter((p) => p.name.toLowerCase().includes(normalizedSearch))
    : [];
  const exactMatch = products.some(
    (p) => p.name.trim().toLowerCase() === normalizedSearch
  );

  const handleSelectProduct = (product: ProductItem) => {
    setSearchTerm(product.name);
    setIsSearching(false);
  };

  const handleOpenNewProductModal = (nameToUse?: string) => {
    const initialName = nameToUse ?? searchTerm;
    setNewProductName(initialName);
    setNewProductGroupId(groups[0]?.group_id ? String(groups[0].group_id) : '');
    setNewProductUnit(units[0]?.name || unit || 'unidades');
    setProductCreationError(null);
    setProductCreationSuccess(null);
    setShowNewProductModal(true);
    setIsSearching(false);
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setProductCreationError('Por favor, introduce el nombre del producto.');
      return;
    }

    setIsCreatingProduct(true);
    setProductCreationError(null);

    try {
      const unitObj = units.find((u) => u.name === newProductUnit);
      const res = await createProductAction({
        name: newProductName.trim(),
        group: newProductGroupId ? Number(newProductGroupId) : null,
        product_unit: unitObj?.id ?? null,
      });

      if (res.error) {
        setProductCreationError(res.error);
      } else if (res.product) {
        // Añadir a la lista local
        setProducts((prev) => [...prev, res.product!]);
        // Seleccionar en el input de préstamo
        setSearchTerm(res.product.name);
        // Asignar la unidad elegida al formulario de préstamo
        if (newProductUnit) {
          setUnit(newProductUnit);
        }
        setProductCreationSuccess(`¡Producto "${res.product.name}" cargado exitosamente!`);
        setTimeout(() => {
          setShowNewProductModal(false);
          setProductCreationSuccess(null);
        }, 700);
      }
    } catch (err: any) {
      setProductCreationError(err?.message || 'Error inesperado al crear el producto.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Mapa de grupos para mostrar su nombre junto a cada producto
  const groupsMap = new Map<number, string>(
    groups.map((g) => [g.group_id, g.group_name])
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-visible relative">
      {/* Cabecera colapsable */}
      <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between hover:bg-slate-100/70 transition rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-base">
              Registrar Nuevo Préstamo entre Tiendas
            </h2>
            <p className="text-xs text-slate-500">
              Registra artículos cedidos a otra sucursal para su posterior seguimiento
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Mensajes de feedback del formulario */}
        {state?.error && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 shrink-0 text-red-500 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>{state.error}</div>
          </div>
        )}

        {state?.success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>{state.success}</div>
          </div>
        )}

        {/* Advertencia si no hay tiendas registradas en la base de datos */}
        {stores.length === 0 ? (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 mb-6 text-sm">
            <div className="font-semibold mb-1">
              Aún no hay tiendas creadas en la base de datos
            </div>
            <p className="text-amber-700 mb-3 text-xs leading-relaxed">
              Para registrar movimientos, añade primero las tiendas correspondientes (por ejemplo, Sagunto, Valencia, etc.). Puedes crearlas rápidamente a continuación:
            </p>

            <form onSubmit={handleCreateStore} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Nombre de la tienda (ej: Sagunto)"
                value={storeNameInput}
                onChange={(e) => setStoreNameInput(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="submit"
                disabled={isCreatingStore}
                className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {isCreatingStore ? 'Añadiendo...' : 'Añadir Tienda'}
              </button>
            </form>

            {storeCreationMsg && (
              <p className="text-xs mt-2 text-amber-800 font-medium">
                {storeCreationMsg}
              </p>
            )}
          </div>
        ) : null}

        {/* Formulario de préstamo */}
        <form action={formAction} className="space-y-6">
          <div className="grid grid-cols-1 gap-5">
            {/* Tienda Origen (Quien presta) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  htmlFor="sender_store_id"
                >
                  Origen
                </label>
                {isSuperUser ? (
                  <span className="text-[11px] text-blue-700">Admin: Puedes elegir origen</span>
                ) : (
                  <span className="text-[11px] text-slate-500">Tu sucursal asignada</span>
                )}
              </div>

              {isSuperUser ? (
                <select
                  id="sender_store_id"
                  name="sender_store_id"
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                >
                  <option value="" disabled>
                    Selecciona la tienda origen
                  </option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{' '}
                      {s.name.toLowerCase().includes('sagunto')
                        ? '(Tu base: Sagunto)'
                        : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="hidden"
                    name="sender_store_id"
                    value={userStoreId ?? ''}
                  />
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-medium">
                    {stores.find((s) => s.id === userStoreId)?.name ??
                      'Sin tienda asignada'}
                  </div>
                </>
              )}
            </div>

            {/* Tienda Destino (A quien se presta) */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                htmlFor="receiver_store_id"
              >
                Destino
              </label>
              <select
                id="receiver_store_id"
                name="receiver_store_id"
                required
                defaultValue=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
              >
                <option value="" disabled>
                  Selecciona la tienda receptora
                </option>
                {availableReceivers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Datos del producto / artículo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Nombre del Producto con Autocomplete y botón de alta */}
            <div className="md:col-span-3 relative" ref={searchContainerRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  htmlFor="item_name"
                >
                  Producto o Artículo
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenNewProductModal(searchTerm)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                >
                  <span className="text-sm leading-none">+</span> Cargar nuevo producto
                </button>
              </div>

              <div className="relative">
                <input
                  id="item_name"
                  name="item_name"
                  type="text"
                  required
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                  placeholder="Escribe para buscar o sugerir productos..."
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                />

                {/* Icono de búsqueda / estado */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Menú flotante de sugerencias */}
              {isSearching && normalizedSearch.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {/* Coincidencias encontradas */}
                  {matchingProducts.length > 0 ? (
                    <div className="p-1">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        Productos sugeridos ({matchingProducts.length})
                      </div>
                      {matchingProducts.map((p) => {
                        const groupName = p.group ? groupsMap.get(p.group) : null;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectProduct(p)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50/80 transition flex items-center justify-between text-sm text-slate-800 hover:text-blue-900"
                          >
                            <span className="font-medium">{p.name}</span>
                            {groupName && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {groupName}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-500 text-center">
                      No hay productos registrados que coincidan con &quot;<strong className="text-slate-700">{searchTerm}</strong>&quot;
                    </div>
                  )}

                  {/* Opción para cargar nuevo producto si no hay coincidencia exacta */}
                  {!exactMatch && (
                    <div className="p-2 bg-slate-50/60">
                      <button
                        type="button"
                        onClick={() => handleOpenNewProductModal(searchTerm)}
                        className="w-full px-3 py-2 rounded-lg bg-blue-50 border border-blue-200/70 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <span className="text-sm font-bold leading-none">+</span>
                        <span>Cargar nuevo producto: &quot;<strong>{searchTerm}</strong>&quot;</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cantidad (Siempre un número) */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                htmlFor="quantity"
              >
                Cantidad (Número)
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="Ej: 10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
              />
            </div>

            {/* Unidad de Medida (Obtenida de la tabla units con fallbacks) */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                htmlFor="unit"
              >
                Unidad de Medida
              </label>
              <select
                id="unit"
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
              >
                {units.length > 0 ? (
                  units.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))
                ) : (
                  defaultFallbackUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))
                )}
                <option value="otra">Otra (especificar)</option>
              </select>

              {unit === 'otra' && (
                <input
                  type="text"
                  name="custom_unit"
                  placeholder="Escribe la unidad..."
                  required
                  className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>

            {/* Fecha en la que se prestó */}
            <div>
              <label
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                htmlFor="loan_date"
              >
                Fecha del Préstamo
              </label>
              <input
                id="loan_date"
                name="loan_date"
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
              />
            </div>
          </div>

          {/* Botón de Enviar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending || stores.length < 2}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Guardando movimiento...</span>
                </>
              ) : (
                <span>Registrar Préstamo</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* MODAL / PANEL DE ALTA DE NUEVO PRODUCTO */}
      {/* ========================================================================= */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-product-title"
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <div>
                  <h3
                    id="modal-product-title"
                    className="font-bold text-slate-900 text-base"
                  >
                    Cargar Nuevo Producto
                  </h3>
                  <p className="text-xs text-slate-500">
                    Se guardará en la tabla products para futuros préstamos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido / Formulario */}
            <form onSubmit={handleCreateProductSubmit} className="p-6 space-y-4">
              {productCreationError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {productCreationError}
                </div>
              )}

              {productCreationSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {productCreationSuccess}
                </div>
              )}

              {/* 1. Nombre libre */}
              <div>
                <label
                  htmlFor="new_product_name"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Nombre del Producto
                </label>
                <input
                  id="new_product_name"
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ej: Tomate triturado 5kg, Rollo de papel cocina..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              {/* 2. Grupo de productos (obtenido de la tabla groups) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="new_product_group"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Grupo de Producto
                  </label>
                  <span className="text-[11px] text-slate-400">Tabla groups</span>
                </div>
                <select
                  id="new_product_group"
                  value={newProductGroupId}
                  onChange={(e) => setNewProductGroupId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                >
                  <option value="">Selecciona un grupo...</option>
                  {groups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    Nota: La tabla &quot;groups&quot; no tiene registros aún. Puedes asociar el grupo más adelante en la base de datos.
                  </p>
                )}
              </div>

              {/* 3. Unidad de medida (obtenida de la tabla units) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="new_product_unit"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Unidad de Medida
                  </label>
                  <span className="text-[11px] text-slate-400">Tabla units</span>
                </div>
                <select
                  id="new_product_unit"
                  value={newProductUnit}
                  onChange={(e) => setNewProductUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                >
                  {units.length > 0 ? (
                    units.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))
                  ) : (
                    defaultFallbackUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  disabled={isCreatingProduct}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct || !newProductName.trim()}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreatingProduct ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar y Seleccionar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
