import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useGetProductosQuery, useGetHistorialComprasQuery } from "../api";
import ComprarProductoModal from "../components/productos/ComprarProductoModal.tsx";
import CambiarCantidadModal from "../components/productos/CambiarCantidadModal.tsx";
import HistorialModal from "../components/productos/HistorialModal.tsx";
import CrearProductoModal from "../components/productos/CrearProductoModal.tsx";
import EditarProductoModal from "../components/productos/EditarProductoModal.tsx";
import ProductosTable from "../components/productos/ProductosTable";
import HistorialPagosTable from "../components/HistorialPagosTable";
import Pagination from "../components/Pagination.tsx";
import SearchBar from "../components/SearchBar";

export default function ProductosPage() {
  const { data: productos = [], isLoading, refetch } = useGetProductosQuery();
  const { data: historialCompras = [], isLoading: loadingHistorial } = useGetHistorialComprasQuery();
  const [selectedProducto, setSelectedProducto] = useState<string | null>(null);
  const [showComprarModal, setShowComprarModal] = useState(false);
  const [showCambiarModal, setShowCambiarModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [historialType, setHistorialType] = useState<"compras" | "ajustes">(
    "compras"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageProductos, setCurrentPageProductos] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const itemsPerPage = 5;

  const handleComprar = (id: string) => {
    setSelectedProducto(id);
    setShowComprarModal(true);
  };

  const handleCambiarCantidad = (id: string) => {
    setSelectedProducto(id);
    setShowCambiarModal(true);
  };

  const handleEditar = (id: string) => {
    setSelectedProducto(id);
    setShowEditarModal(true);
  };

  const handleVerHistorial = (id: string, type: "compras" | "ajustes") => {
    setSelectedProducto(id);
    setHistorialType(type);
    setShowHistorialModal(true);
  };

  // Filter productos by search query
  const filteredProductos = useMemo(() => {
    if (!searchQuery.trim()) return productos;

    const query = searchQuery.toLowerCase();
    return productos.filter((producto) => {
      const nombre = producto.nombre?.toLowerCase() || "";
      const stockActual = producto.stock_actual?.toString() || "";

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
  const totalPagesHistorial = Math.ceil(historialCompras.length / itemsPerPage);
  const startIndexHistorial = (currentPageHistorial - 1) * itemsPerPage;
  const endIndexHistorial = startIndexHistorial + itemsPerPage;
  const currentHistorialCompras = historialCompras.slice(startIndexHistorial, endIndexHistorial);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Inventario - Productos</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <SearchBar
            placeholder="Buscar productos..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPageProductos(1);
            }}
            className="w-full md:w-64"
          />
          <button
            onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <Plus size={20} />
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Tabla de productos */}
      <ProductosTable
        productos={currentProductos}
        startIndex={startIndexProductos}
        onEditar={handleEditar}
        onComprar={handleComprar}
        onCambiarCantidad={handleCambiarCantidad}
        onVerHistorial={(id) => handleVerHistorial(id, "compras")}
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

      {/* Historial de Compras */}
      <HistorialPagosTable
        historial={currentHistorialCompras}
        isLoading={loadingHistorial}
        variant="compras"
      />
      {!loadingHistorial && historialCompras.length > 0 && (
        <Pagination
          currentPage={currentPageHistorial}
          totalPages={totalPagesHistorial}
          totalItems={historialCompras.length}
          itemsPerPage={itemsPerPage}
          label="compras"
          onPageChange={setCurrentPageHistorial}
        />
      )}

      {/* Modales */}
      <CrearProductoModal
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
      />

      {selectedProducto && (
        <>
          <EditarProductoModal
            isOpen={showEditarModal}
            onClose={() => setShowEditarModal(false)}
            idProducto={selectedProducto}
          />
          <ComprarProductoModal
            isOpen={showComprarModal}
            onClose={() => setShowComprarModal(false)}
            idProducto={selectedProducto}
            onSuccess={() => refetch()}
          />
          <CambiarCantidadModal
            isOpen={showCambiarModal}
            onClose={() => setShowCambiarModal(false)}
            idProducto={selectedProducto}
            onSuccess={() => refetch()}
          />
          <HistorialModal
            isOpen={showHistorialModal}
            onClose={() => setShowHistorialModal(false)}
            idProducto={selectedProducto}
            type={historialType}
          />
        </>
      )}
    </div>
  );
}
