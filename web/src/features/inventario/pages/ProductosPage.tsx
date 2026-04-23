import { useState, useMemo } from "react";
import { Plus, ClipboardList, AlertTriangle, BadgeDollarSign, Clock } from "lucide-react";
import Swal from "sweetalert2";
import { useGetProductosQuery, useGetHistorialConsumosQuery, useGetHistorialComprasQuery, useDeleteProductoMutation, type CompraProducto } from "../api";
import EditarCompraModal from "../components/productos/EditarCompraModal.tsx";
import CrearProductoModal from "../components/productos/CrearProductoModal.tsx";
import EditarProductoModal from "../components/productos/EditarProductoModal.tsx";
import ConsumoManualModal from "../components/productos/ConsumoManualModal.tsx";
import ProductosTable from "../components/productos/ProductosTable";
import HistorialPagosTable from "../components/HistorialPagosTable";
import Pagination from "../components/Pagination.tsx";
import SearchBar from "../components/SearchBar";

export default function ProductosPage() {
  const { data: productos = [], isLoading, refetch } = useGetProductosQuery();
  const { data: historialConsumos = [], isLoading: loadingHistorial } = useGetHistorialConsumosQuery();
  const { data: historialCompras = [] } = useGetHistorialComprasQuery();
  const [deleteProducto] = useDeleteProductoMutation();
  const [selectedProducto, setSelectedProducto] = useState<string | null>(null);
  const [selectedCompra, setSelectedCompra] = useState<CompraProducto | null>(null);
  const [showEditarCompraModal, setShowEditarCompraModal] = useState(false);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showConsumoModal, setShowConsumoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageProductos, setCurrentPageProductos] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const itemsPerPage = 5;

  const handleEditar = (id: string) => {
    setSelectedProducto(id);
    setShowEditarModal(true);
  };

  const handleConsumoManual = (id: string) => {
    setSelectedProducto(id);
    setShowConsumoModal(true);
  };



  const handleEliminarProducto = async (id: string, nombre: string) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `¿Está seguro que desea eliminar "${nombre}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await deleteProducto(id).unwrap();
        await Swal.fire({
          icon: "success",
          title: "Eliminado",
          text: "El producto fue eliminado correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "warning",
          title: "No se puede eliminar",
          text: err?.data?.message || "Error al eliminar el producto",
        });
      }
    }
  };

  // --- KPIs Calculations ---
  const totalItems = productos.length;
  const lowStockCount = productos.filter(p => Number(p.stock_base_total) <= Number(p.stock_minimo_base) && p.activo).length;
  // KPI: Valor Total del Inventario
  // Estimated base price per consumption unit
  const latestPrices: Record<string, number> = {};
  historialCompras.forEach((c: CompraProducto) => {
    if (!latestPrices[c.id_producto]) {
      latestPrices[c.id_producto] = Number(c.precio_unitario) || 0;
    }
  });
  const totalValue = productos.reduce((sum: number, p) => sum + (Number(p.stock_base_total) * (latestPrices[p.id_producto] || 0) / (Number(p.factor_conversion) || 1)), 0);

  const recentStockIn = historialCompras.filter((c: CompraProducto) => {
    const diffDays = Math.floor((new Date().getTime() - new Date(c.fecha_ingreso).getTime()) / (1000 * 3600 * 24));
    return diffDays <= 7;
  }).reduce((sum: number, c: CompraProducto) => sum + Number(c.cantidad), 0);
  // ---

  // Filter productos by search query
  const filteredProductos = useMemo(() => {
    if (!searchQuery.trim()) return productos;

    const query = searchQuery.toLowerCase();
    return productos.filter((producto) => {
      const nombre = producto.nombre?.toLowerCase() || "";
      const stockActual = producto.stock_base_total?.toString() || "";

      return (
        nombre.includes(query) ||
        stockActual.includes(query)
      );
    });
  }, [productos, searchQuery]);

  // Paginación para Productos
  const totalPagesProductos = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndexProductos = (currentPageProductos - 1) * itemsPerPage;
  const endIndexProductos = startIndexProductos + itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndexProductos, endIndexProductos);

  // Paginación para Historial
  const totalPagesHistorial = Math.ceil(historialConsumos.length / itemsPerPage);
  const startIndexHistorial = (currentPageHistorial - 1) * itemsPerPage;
  const endIndexHistorial = startIndexHistorial + itemsPerPage;
  const currentHistorialConsumos = historialConsumos.slice(startIndexHistorial, endIndexHistorial);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="mb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
          <p className="text-base text-gray-500 mt-1">Estado en tiempo real de insumos clínicos y equipo médico.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Total Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <ClipboardList size={20} />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Activo</span>
          </div>
          <p className="text-base text-gray-500 mb-1">Total Insumos</p>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800">{totalItems}</h3>
          <p className="text-base text-teal-600 mt-2 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            Actualizado hoy
          </p>
        </div>

        {/* Card 2: Low Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-red-400"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle size={20} />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-red-500 uppercase mr-2">Urgente</span>
          </div>
          <p className="text-base text-gray-500 mb-1">Alertas de Stock</p>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800">{lowStockCount}</h3>
          <p className="text-base text-red-500 mt-2 font-medium">Requieren reposición</p>
        </div>

        {/* Card 3: Total Value */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
              <BadgeDollarSign size={20} />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Valuación</span>
          </div>
          <p className="text-base text-gray-500 mb-1">Valor Total</p>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-base text-gray-400 mt-2">Activos en inventario</p>
        </div>

        {/* Card 4: Recent Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Reciente</span>
          </div>
          <p className="text-base text-gray-500 mb-1">Entradas (últimos 7d)</p>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800">{recentStockIn}</h3>
          <p className="text-base text-gray-400 mt-2">Unidades ingresadas</p>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">Lista de Inventario</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <SearchBar
              placeholder="Buscar productos..."
              onSearch={(query) => {
                setSearchQuery(query);
                setCurrentPageProductos(1);
              }}
              className="w-full sm:w-56"
            />
            <button
              onClick={() => setShowCrearModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors w-full sm:w-auto justify-center"
            >
              <Plus size={18} />
              Nuevo Insumo
            </button>
          </div>
        </div>
        <ProductosTable
          productos={currentProductos}
          startIndex={startIndexProductos}
          onConsumoManual={handleConsumoManual}
          onEditar={handleEditar}
          onEliminar={handleEliminarProducto}
        />
        {filteredProductos.length > 0 && (
          <Pagination
            currentPage={currentPageProductos}
            totalPages={totalPagesProductos}
            totalItems={filteredProductos.length}
            itemsPerPage={itemsPerPage}
            label="productos"
            onPageChange={setCurrentPageProductos}
          />
        )}
      </div>

      {/* Historial de Consumos */}
      <HistorialPagosTable
        historial={currentHistorialConsumos}
        isLoading={loadingHistorial}
        variant="consumos"
        paginationInfo={
          !loadingHistorial && historialConsumos.length > 0
            ? {
              currentPage: currentPageHistorial,
              totalPages: totalPagesHistorial,
              totalItems: historialConsumos.length,
              itemsPerPage: itemsPerPage,
              label: "consumos",
              onPageChange: setCurrentPageHistorial,
            }
            : undefined
        }
      />

      {/* Modales */}
      <CrearProductoModal
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
      />

      <EditarCompraModal
        isOpen={showEditarCompraModal}
        onClose={() => {
          setShowEditarCompraModal(false);
          setSelectedCompra(null);
        }}
        compra={selectedCompra}
        onSuccess={() => {
          setShowEditarCompraModal(false);
          setSelectedCompra(null);
        }}
      />

      {selectedProducto && (
        <>
          <EditarProductoModal
            isOpen={showEditarModal}
            onClose={() => setShowEditarModal(false)}
            idProducto={selectedProducto}
          />
          <ConsumoManualModal
            isOpen={showConsumoModal}
            onClose={() => setShowConsumoModal(false)}
            idProducto={selectedProducto}
            onSuccess={() => refetch()}
          />

        </>
      )}
    </div>
  );
}
