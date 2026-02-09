import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import EntesLegalesTable from "../components/entes-legales/EntesLegalesTable";
import CrearEnteModal from "../components/entes-legales/CrearEnteModal";
import EditarEnteModal from "../components/entes-legales/EditarEnteModal";
import GenerarPagoEnteModal from "../components/entes-legales/GenerarPagoEnteModal";
import EditarPagoEnteModal from "../components/entes-legales/EditarPagoEnteModal";
import HistorialPagosTable from "../components/HistorialPagosTable";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";
import type { EnteLegal, HistorialEnteLegal, CompraProducto } from "../api";
import { useGetEntesLegalesQuery, useDeleteEnteLegalMutation, useGetHistorialPagosEntesQuery } from "../api";

export default function EntesLegalesPage() {
  const { data: entesData = [], isLoading, error } = useGetEntesLegalesQuery();
  const [deleteEnte] = useDeleteEnteLegalMutation();

  const [selectedEnte, setSelectedEnte] = useState<EnteLegal | null>(null);
  const [selectedPago, setSelectedPago] = useState<HistorialEnteLegal | null>(null);
  const { data: historialData = [], isLoading: historialLoading } = useGetHistorialPagosEntesQuery();
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showEditarPagoModal, setShowEditarPagoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const itemsPerPage = 5;

  const handleEditar = (id: string) => {
    const ente = entesData.find((e) => e.id_ente === id) || null;
    setSelectedEnte(ente);
    setShowEditarModal(true);
  };

  const handleGenerarPago = (id: string) => {
    const ente = entesData.find((e) => e.id_ente === id) || null;
    setSelectedEnte(ente);
    setShowPagoModal(true);
  };

  const onEditarHistorialEnteLegal = (row: CompraProducto | HistorialEnteLegal) => {
    setSelectedPago(row as HistorialEnteLegal);
    setShowEditarPagoModal(true);
  };

  const handleEliminar = async (id: string) => {
    if (confirm("¿Está seguro que desea eliminar este ente legal?")) {
      try {
        await deleteEnte(id).unwrap();
      } catch (err) {
        console.error("Error al eliminar ente:", err);
      }
    }
  };

  // Filter entes by search query
  const filteredEntes = useMemo(() => {
    if (!searchQuery.trim()) return entesData;

    const query = searchQuery.toLowerCase();
    return entesData.filter((ente) => {
      const nombre = ente.nombre?.toLowerCase() || "";
      const cantObligaciones = ente.cant_obligaciones?.toString() || "";

      return (
        nombre.includes(query) ||
        cantObligaciones.includes(query)
      );
    });
  }, [entesData, searchQuery]);

  // Paginación
  const totalPages = Math.ceil(filteredEntes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntes = filteredEntes.slice(startIndex, endIndex);

  // Paginación para historial
  const totalPagesHistorial = Math.ceil(historialData.length / itemsPerPage);
  const startIndexHistorial = (currentPageHistorial - 1) * itemsPerPage;
  const endIndexHistorial = startIndexHistorial + itemsPerPage;
  const currentHistorial = historialData.slice(startIndexHistorial, endIndexHistorial);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando entes legales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar los entes legales</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Entes Legales</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <SearchBar
            placeholder="Buscar entes legales..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            className="w-full md:w-64"
          />
          <button
            onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <Plus size={20} />
            Agregar Ente
          </button>
        </div>
      </div>

      {/* Tabla de entes legales */}
      <EntesLegalesTable
        entes={currentEntes}
        startIndex={startIndex}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onGenerarPago={handleGenerarPago}
      />

      {filteredEntes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEntes.length}
          itemsPerPage={itemsPerPage}
          label="entes"
          onPageChange={setCurrentPage}
        />
      )}

      {/* Historial de Pagos */}
      <HistorialPagosTable
        historial={currentHistorial}
        isLoading={historialLoading}
        variant="pagos"
        title="Historial de Pagos"
        emptyMessage="No hay pagos registrados"
        onEditar={(row) => onEditarHistorialEnteLegal(row as CompraProducto | HistorialEnteLegal)}
      />
      {!historialLoading && historialData.length > 0 && (
        <Pagination
          currentPage={currentPageHistorial}
          totalPages={totalPagesHistorial}
          totalItems={historialData.length}
          itemsPerPage={itemsPerPage}
          label="pagos"
          onPageChange={setCurrentPageHistorial}
        />
      )}

      {/* Modales */}
      <CrearEnteModal
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
      />

      <EditarEnteModal
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        ente={selectedEnte}
      />

      <GenerarPagoEnteModal
        isOpen={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        ente={selectedEnte}
      />

      <EditarPagoEnteModal
        isOpen={showEditarPagoModal}
        onClose={() => {
          setShowEditarPagoModal(false);
          setSelectedPago(null);
        }}
        pago={selectedPago}
        onSuccess={() => {
          setShowEditarPagoModal(false);
          setSelectedPago(null);
        }}
      />
    </div>
  );
}
