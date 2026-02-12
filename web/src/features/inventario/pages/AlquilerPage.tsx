import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Swal from "sweetalert2";
import {
  useGetContratosQuery,
  useDeleteContratoMutation,
  useGetHistorialPagosAlquilerQuery,
  useDeletePagoAlquilerMutation,
} from "../api/alquilerApi";
import type { AlquilerContrato, AlquilerPago } from "../api/alquilerApi";
import ContratosTable from "../components/alquiler/ContratosTable";
import CrearContratoModal from "../components/alquiler/CrearContratoModal";
import EditarContratoModal from "../components/alquiler/EditarContratoModal";
import RegistrarPagoAlquilerModal from "../components/alquiler/RegistrarPagoAlquilerModal";
import EditarPagoAlquilerModal from "../components/alquiler/EditarPagoAlquilerModal";
import HistorialPagosTable from "../components/HistorialPagosTable";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";

export default function AlquilerPage() {
  const { data: contratosData, isLoading, error } = useGetContratosQuery();
  const [deleteContrato] = useDeleteContratoMutation();
  const [deletePago] = useDeletePagoAlquilerMutation();
  const { data: historialData = [], isLoading: historialLoading } =
    useGetHistorialPagosAlquilerQuery();

  const contratos = contratosData ?? [];
  const [selectedContrato, setSelectedContrato] =
    useState<AlquilerContrato | null>(null);
  const [selectedPago, setSelectedPago] = useState<AlquilerPago | null>(null);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showRegistrarPagoModal, setShowRegistrarPagoModal] = useState(false);
  const [showEditarPagoModal, setShowEditarPagoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageContratos, setCurrentPageContratos] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const itemsPerPage = 5;

  const handleEditar = (id: string) => {
    const contrato = contratos.find((c) => c.id_contrato === id) || null;
    setSelectedContrato(contrato);
    setShowEditarModal(true);
  };

  const handleRegistrarPago = (id: string) => {
    const contrato = contratos.find((c) => c.id_contrato === id) || null;
    setSelectedContrato(contrato);
    setShowRegistrarPagoModal(true);
  };

  const handleEditarPago = (row: AlquilerPago) => {
    setSelectedPago(row);
    setShowEditarPagoModal(true);
  };

  const handleEliminarContrato = async (id: string) => {
    const result = await Swal.fire({
      title: "¿Eliminar contrato?",
      text: "¿Está seguro que desea eliminar este contrato?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteContrato(id).unwrap();
        await Swal.fire({
          icon: "success",
          title: "Contrato eliminado",
          text: "El contrato fue eliminado correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err?.data?.message || "No se pudo eliminar el contrato",
        });
      }
    }
  };

  const handleEliminarPago = async (id: string) => {
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
        await deletePago(id).unwrap();
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

  const filteredContratos = useMemo(() => {
    if (!searchQuery.trim()) return contratos;

    const query = searchQuery.toLowerCase();
    return contratos.filter((contrato) => {
      const nombre = contrato.nombre?.toLowerCase() || "";
      const periodo = contrato.periodo?.toLowerCase() || "";
      const estado = contrato.estado?.toLowerCase() || "";
      const monto = contrato.monto?.toString() || "";
      const vencimiento = contrato.fecha_vencimiento || "";

      return (
        nombre.includes(query) ||
        periodo.includes(query) ||
        estado.includes(query) ||
        monto.includes(query) ||
        vencimiento.includes(query)
      );
    });
  }, [contratos, searchQuery]);

  const totalPagesContratos = Math.ceil(
    filteredContratos.length / itemsPerPage,
  );
  const startIndexContratos = (currentPageContratos - 1) * itemsPerPage;
  const currentContratos = filteredContratos.slice(
    startIndexContratos,
    startIndexContratos + itemsPerPage,
  );

  const historialRows = historialData ?? [];
  const totalPagesHistorial = Math.ceil(historialRows.length / itemsPerPage);
  const startIndexHistorial = (currentPageHistorial - 1) * itemsPerPage;
  const currentHistorial = historialRows.slice(
    startIndexHistorial,
    startIndexHistorial + itemsPerPage,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando contratos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar los contratos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Alquiler</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <SearchBar
            placeholder="Buscar contratos..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPageContratos(1);
            }}
            className="w-full md:w-64"
          />
          <button
            onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <Plus size={20} />
            Agregar Contrato
          </button>
        </div>
      </div>

      <ContratosTable
        contratos={currentContratos}
        startIndex={startIndexContratos}
        onEditar={handleEditar}
        onEliminar={handleEliminarContrato}
        onRegistrarPago={handleRegistrarPago}
      />

      {filteredContratos.length > 0 && (
        <Pagination
          currentPage={currentPageContratos}
          totalPages={totalPagesContratos}
          totalItems={filteredContratos.length}
          itemsPerPage={itemsPerPage}
          label="contratos"
          onPageChange={setCurrentPageContratos}
        />
      )}

      <HistorialPagosTable
        historial={currentHistorial}
        isLoading={historialLoading}
        variant="alquiler"
        onEditar={(row) => handleEditarPago(row as AlquilerPago)}
        onEliminar={handleEliminarPago}
      />

      {!historialLoading && historialRows.length > 0 && (
        <Pagination
          currentPage={currentPageHistorial}
          totalPages={totalPagesHistorial}
          totalItems={historialRows.length}
          itemsPerPage={itemsPerPage}
          label="pagos"
          onPageChange={setCurrentPageHistorial}
        />
      )}

      <CrearContratoModal
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
      />

      <EditarContratoModal
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        contrato={selectedContrato}
        onSuccess={() => setShowEditarModal(false)}
      />

      <RegistrarPagoAlquilerModal
        isOpen={showRegistrarPagoModal}
        onClose={() => setShowRegistrarPagoModal(false)}
        contrato={selectedContrato}
        onSuccess={() => setShowRegistrarPagoModal(false)}
      />

      <EditarPagoAlquilerModal
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
