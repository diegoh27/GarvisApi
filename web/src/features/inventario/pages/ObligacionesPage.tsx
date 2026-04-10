import { useState, useMemo } from "react";
import { Plus, Settings } from "lucide-react";
import Swal from "sweetalert2";
import ObligacionesTable from "../components/entes-legales/ObligacionesTable";
import CrearObligacionModal from "../components/entes-legales/CrearObligacionModal";
import EditarObligacionModal from "../components/entes-legales/EditarObligacionModal";
import CrearEnteModal from "../components/entes-legales/CrearEnteModal";
import EditarEnteModal from "../components/entes-legales/EditarEnteModal";
import GenerarPagoObligacionModal from "../components/obligaciones/GenerarPagoObligacionModal";
import HistorialObligacionModal from "../components/obligaciones/HistorialObligacionModal";
import EditarPagoEnteModal from "../components/entes-legales/EditarPagoEnteModal";
import EntesLegalesTableSimple from "../components/entes-legales/EntesLegalesTableSimple.tsx";
import HistorialPagosTable from "../components/HistorialPagosTable";
import SearchBar from "../components/SearchBar";
import type { Obligacion, EnteLegal, HistorialEnteLegal, CompraProducto } from "../api";
import {
  useGetObligacionesQuery,
  useDeleteObligacionMutation,
  useGetEntesLegalesQuery,
  useDeleteEnteLegalMutation,
  useGetHistorialPagosEntesQuery,
  useDeletePagoEnteLegalMutation,
} from "../api";

export default function EntesLegalesPage() {
  // Main table: Obligaciones
  const { data: obligaciones = [], isLoading, error } = useGetObligacionesQuery();
  const [deleteObligacion] = useDeleteObligacionMutation();

  // Secondary table: Entes Legales (for management)
  const { data: entes = [] } = useGetEntesLegalesQuery();
  const [deleteEnte] = useDeleteEnteLegalMutation();

  // Historial de pagos
  const { data: historialData = [], isLoading: historialLoading } =
    useGetHistorialPagosEntesQuery();
  const [deletePago] = useDeletePagoEnteLegalMutation();

  // State
  const [selectedObligacion, setSelectedObligacion] = useState<Obligacion | null>(
    null
  );
  const [selectedEnte, setSelectedEnte] = useState<EnteLegal | null>(null);
  const [selectedPago, setSelectedPago] = useState<HistorialEnteLegal | null>(null);
  const [selectedObligacionParaHistorial, setSelectedObligacionParaHistorial] = useState<Obligacion | null>(null);
  const [showCrearObligacionModal, setShowCrearObligacionModal] = useState(false);
  const [showEditarObligacionModal, setShowEditarObligacionModal] =
    useState(false);
  const [showCrearEnteModal, setShowCrearEnteModal] = useState(false);
  const [showEditarEnteModal, setShowEditarEnteModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showEditarPagoModal, setShowEditarPagoModal] = useState(false);
  const [showHistorialObligacionModal, setShowHistorialObligacionModal] = useState(false);
  const [showEntesManagement, setShowEntesManagement] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const [currentPageEntes, setCurrentPageEntes] = useState(1);
  const itemsPerPage = 5;

  // ==========================================
  // OBLIGACIONES HANDLERS
  // ==========================================

  const handleEditarObligacion = (id: string) => {
    const obligacion = obligaciones.find((o) => o.id_obligacion === id) || null;
    setSelectedObligacion(obligacion);
    setShowEditarObligacionModal(true);
  };

  const handleEliminarObligacion = async (id: string) => {
    if (confirm("¿Está seguro que desea eliminar esta obligación?")) {
      try {
        await deleteObligacion(id).unwrap();
      } catch (err) {
        console.error("Error al eliminar obligación:", err);
      }
    }
  };

  const handleGenerarPago = (id: string) => {
    const obligacion = obligaciones.find((o) => o.id_obligacion === id);
    if (obligacion) {
      setSelectedObligacion(obligacion);
      setShowPagoModal(true);
    }
  };

  const handleEditarPago = (row: CompraProducto | HistorialEnteLegal) => {
    setSelectedPago(row as HistorialEnteLegal);
    setShowEditarPagoModal(true);
  };

  const handleEliminarPago = async (idPago: string) => {
    const result = await Swal.fire({
      title: "¿Eliminar pago?",
      text: "¿Está seguro que desea eliminar este pago?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await deletePago(idPago).unwrap();
        await Swal.fire({
          icon: "success",
          title: "Pago eliminado",
          text: "El pago fue eliminado correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err?.data?.message || "No se pudo eliminar el pago",
        });
      }
    }
  };

  const handleVerHistorialObligacion = (id: string) => {
    const obligacion = obligaciones.find((o) => o.id_obligacion === id) || null;
    setSelectedObligacionParaHistorial(obligacion);
    setShowHistorialObligacionModal(true);
  };

  // Filter obligaciones by search query
  const filteredObligaciones = useMemo(() => {
    if (!searchQuery.trim()) return obligaciones;

    const query = searchQuery.toLowerCase();
    return obligaciones.filter((obligacion) => {
      const nombreEnte = obligacion.nombre_ente?.toLowerCase() || "";
      const concepto = obligacion.concepto?.toLowerCase() || "";
      const periodo = obligacion.periodo?.toLowerCase() || "";
      const estado = obligacion.estado?.toLowerCase() || "";
      const monto = obligacion.monto?.toString() || "";
      const fechaVencimiento = obligacion.fecha_vencimiento || "";

      return (
        nombreEnte.includes(query) ||
        concepto.includes(query) ||
        periodo.includes(query) ||
        estado.includes(query) ||
        monto.includes(query) ||
        fechaVencimiento.includes(query)
      );
    });
  }, [obligaciones, searchQuery]);

  // ==========================================
  // ENTES HANDLERS
  // ==========================================

  const handleEditarEnte = (id: string) => {
    const ente = entes.find((e) => e.id_ente === id) || null;
    setSelectedEnte(ente);
    setShowEditarEnteModal(true);
  };

  const handleEliminarEnte = async (id: string) => {
    if (confirm("¿Está seguro que desea eliminar este ente legal?")) {
      try {
        await deleteEnte(id).unwrap();
      } catch (err) {
        console.error("Error al eliminar ente:", err);
      }
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredObligaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentObligaciones = filteredObligaciones.slice(startIndex, endIndex);

  const totalPagesHistorial = Math.ceil(historialData.length / itemsPerPage);
  const startIndexHistorial = (currentPageHistorial - 1) * itemsPerPage;
  const endIndexHistorial = startIndexHistorial + itemsPerPage;
  const currentHistorial = historialData.slice(startIndexHistorial, endIndexHistorial);

  const totalPagesEntes = Math.ceil(entes.length / itemsPerPage);
  const startIndexEntes = (currentPageEntes - 1) * itemsPerPage;
  const endIndexEntes = startIndexEntes + itemsPerPage;
  const currentEntes = entes.slice(startIndexEntes, endIndexEntes);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando obligaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar las obligaciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* ==========================================
			 OBLIGACIONES SECTION
			================================================ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Obligaciones</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <SearchBar
            placeholder="Buscar por ente, concepto, monto, fecha..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            className="w-full md:w-64"
          />
          <button
            onClick={() => setShowCrearObligacionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex-1 md:flex-initial justify-center md:justify-start"
          >
            <Plus size={20} />
            Crear Obligación
          </button>
          <button
            onClick={() => setShowEntesManagement(!showEntesManagement)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
            title="Gestionar entes legales"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Obligaciones Table */}
      <ObligacionesTable
        obligaciones={currentObligaciones}
        startIndex={startIndex}
        onEditar={handleEditarObligacion}
        onEliminar={handleEliminarObligacion}
        onGenerarPago={handleGenerarPago}
        onVerHistorial={handleVerHistorialObligacion}
        paginationInfo={
          filteredObligaciones.length > 0
            ? {
                currentPage,
                totalPages,
                totalItems: filteredObligaciones.length,
                itemsPerPage,
                label: "obligaciones",
                onPageChange: setCurrentPage,
              }
            : undefined
        }
      />

      {/* ==========================================
			 ENTES MANAGEMENT SECTION (Hidden by default)
			================================================ */}
      {showEntesManagement && (
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Gestionar Entes Legales</h2>
            <button
              onClick={() => setShowCrearEnteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
            >
              <Plus size={20} />
              Agregar Ente
            </button>
          </div>

          {/* Entes Table */}
          <EntesLegalesTableSimple
            entes={currentEntes}
            startIndex={startIndexEntes}
            onEditar={handleEditarEnte}
            onEliminar={handleEliminarEnte}
            paginationInfo={
              entes.length > 0
                ? {
                    currentPage: currentPageEntes,
                    totalPages: totalPagesEntes,
                    totalItems: entes.length,
                    itemsPerPage,
                    label: "entes",
                    onPageChange: setCurrentPageEntes,
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* ==========================================
			 HISTORIAL DE PAGOS SECTION
			================================================ */}
      <div className="mt-10">
        <HistorialPagosTable
          historial={currentHistorial}
          isLoading={historialLoading}
          variant="pagos"
          title="Historial de Pagos"
          emptyMessage="No hay pagos registrados"
          onEditar={(row) => handleEditarPago(row as CompraProducto | HistorialEnteLegal)}
          onEliminar={handleEliminarPago}
          paginationInfo={
            !historialLoading && historialData.length > 0
              ? {
                  currentPage: currentPageHistorial,
                  totalPages: totalPagesHistorial,
                  totalItems: historialData.length,
                  itemsPerPage,
                  label: "pagos",
                  onPageChange: setCurrentPageHistorial,
                }
              : undefined
          }
        />
      </div>

      {/* ==========================================
			 MODALS
			================================================ */}

      {/* Crear Obligación */}
      <CrearObligacionModal
        isOpen={showCrearObligacionModal}
        onClose={() => setShowCrearObligacionModal(false)}
      />

      {/* Editar Obligación */}
      <EditarObligacionModal
        isOpen={showEditarObligacionModal}
        obligacion={selectedObligacion}
        onClose={() => {
          setShowEditarObligacionModal(false);
          setSelectedObligacion(null);
        }}
      />

      {/* Crear Ente */}
      <CrearEnteModal
        isOpen={showCrearEnteModal}
        onClose={() => setShowCrearEnteModal(false)}
      />

      {/* Editar Ente */}
      <EditarEnteModal
        isOpen={showEditarEnteModal}
        ente={selectedEnte}
        onClose={() => {
          setShowEditarEnteModal(false);
          setSelectedEnte(null);
        }}
      />

      {/* Generar Pago */}
      <GenerarPagoObligacionModal
        isOpen={showPagoModal}
        obligacion={selectedObligacion}
        onClose={() => {
          setShowPagoModal(false);
          setSelectedObligacion(null);
        }}
      />

      {/* Editar Pago */}
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

      {/* Historial de Obligación */}
      <HistorialObligacionModal
        isOpen={showHistorialObligacionModal}
        obligacion={selectedObligacionParaHistorial}
        historialData={historialData}
        isLoading={historialLoading}
        onClose={() => {
          setShowHistorialObligacionModal(false);
          setSelectedObligacionParaHistorial(null);
        }}
      />
    </div>
  );
}
