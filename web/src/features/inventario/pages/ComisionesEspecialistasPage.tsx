import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Swal from "sweetalert2";
import {
  useListComisionesQuery,
  useGetHistorialComisionesQuery,
  useGenerarComisionesMutation,
  usePagarComisionMutation,
} from "../api/comisionesApi";
import { useGetEspecialistasInventarioQuery } from "../api/especialistasApi";
import type { EspecialistaComision } from "../api/comisionesApi";
import type { EspecialistaInventario } from "../api/especialistasApi";
import ComisionesTable from "../components/comisiones/ComisionesTable";
import HistorialComisionesTable from "../components/comisiones/HistorialComisionesTable";
import EspecialistasTable from "../components/comisiones/EspecialistasTable";
import PagarComisionModal from "../components/comisiones/PagarComisionModal";
import GenericTable from "../components/GenericTable";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";

export default function ComisionesEspecialistasPage() {
  const { data: queryData, isLoading, error } = useListComisionesQuery({
    estado: "Pendiente",
  });
  const comisionesData = Array.isArray(queryData) ? queryData : [];
  const { data: historialData = [], isLoading: historialLoading } =
    useGetHistorialComisionesQuery();
  const { data: especialistasData, isLoading: especialistasLoading } =
    useGetEspecialistasInventarioQuery();
  const especialistas = especialistasData ?? [];
  const [generarComisiones] = useGenerarComisionesMutation();
  const [pagarComision] = usePagarComisionMutation();

  const [selectedComision, setSelectedComision] =
    useState<EspecialistaComision | null>(null);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQueryEspecialistas, setSearchQueryEspecialistas] = useState("");
  const [currentPageComisiones, setCurrentPageComisiones] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const [currentPageEspecialistas, setCurrentPageEspecialistas] = useState(1);
  const itemsPerPage = 5;

  const handleGenerarComisiones = async () => {
    const result = await Swal.fire({
      title: "¿Generar comisiones?",
      text: "Se generarán comisiones para todas las citas atendidas y pagadas pendientes.",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, generar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await generarComisiones({}).unwrap();
        Swal.fire({
          icon: "success",
          title: "Comisiones generadas",
          text: `Se generaron ${response.data.inserted} comisiones exitosamente.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err?.data?.message || "No se pudieron generar las comisiones",
        });
      }
    }
  };

  const handlePagarComision = (comision: EspecialistaComision) => {
    setSelectedComision(comision);
    setShowPagarModal(true);
  };

  const handleConfirmarPago = async (
    idComision: string,
    fecha_pago: string,
    metodo?: string,
    referencia?: string,
  ) => {
    try {
      await pagarComision({
        idComision,
        payload: {
          fecha_pago,
          metodo: (metodo as any) || undefined,
          referencia: referencia || undefined,
        },
      }).unwrap();

      Swal.fire({
        icon: "success",
        title: "Comisión pagada",
        text: "La comisión fue pagada correctamente.",
        timer: 2000,
        showConfirmButton: false,
      });

      setShowPagarModal(false);
      setSelectedComision(null);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.data?.message || "No se pudo procesar el pago",
      });
    }
  };

  const filteredComisiones = useMemo(() => {
    if (!searchQuery.trim()) return comisionesData;

    const query = searchQuery.toLowerCase();
    return comisionesData.filter((comision) => {
      const nombre = comision.especialista_nombre?.toLowerCase() || "";
      const apellido = comision.especialista_apellido?.toLowerCase() || "";
      const ecoNombre = comision.eco_nombre?.toLowerCase() || "";
      const monto = comision.monto?.toString() || "";

      return (
        nombre.includes(query) ||
        apellido.includes(query) ||
        ecoNombre.includes(query) ||
        monto.includes(query)
      );
    });
  }, [comisionesData, searchQuery]);

  const filteredEspecialistas = useMemo(() => {
    if (!searchQueryEspecialistas.trim()) return especialistas;

    const query = searchQueryEspecialistas.toLowerCase();
    return especialistas.filter((especialista) => {
      const nombre = especialista.nombre?.toLowerCase() || "";
      const apellido = especialista.apellido?.toLowerCase() || "";
      const especialidad = especialista.especialidad?.toLowerCase() || "";

      return (
        nombre.includes(query) ||
        apellido.includes(query) ||
        especialidad.includes(query)
      );
    });
  }, [especialistas, searchQueryEspecialistas]);

  const totalPages = Math.ceil(filteredComisiones.length / itemsPerPage);
  const startIndex = (currentPageComisiones - 1) * itemsPerPage;
  const currentComisiones = filteredComisiones.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const totalPagesHistorial = Math.ceil(
    historialData.length / itemsPerPage,
  );
  const startIndexHistorial = (currentPageHistorial - 1) * itemsPerPage;
  const currentHistorial = historialData.slice(
    startIndexHistorial,
    startIndexHistorial + itemsPerPage,
  );

  const totalPagesEspecialistas = Math.ceil(
    filteredEspecialistas.length / itemsPerPage,
  );
  const startIndexEspecialistas = (currentPageEspecialistas - 1) * itemsPerPage;
  const currentEspecialistas = filteredEspecialistas.slice(
    startIndexEspecialistas,
    startIndexEspecialistas + itemsPerPage,
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Cargando comisiones...</p>
      </div>
    );

  if (error)
    return (
      <div className="text-red-600 p-4">
        Error al cargar las comisiones. Por favor, intente de nuevo.
      </div>
    );

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Comisiones de Especialistas</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <SearchBar
            placeholder="Buscar comisiones..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPageComisiones(1);
            }}
            className="w-full md:w-64"
          />
          <button
            onClick={handleGenerarComisiones}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <Plus size={20} />
            Generar Comisiones
          </button>
        </div>
      </div>

      {/* Tabla de especialistas y sus porcentajes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Especialistas</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="px-4 md:px-6 py-4">
            <SearchBar
              placeholder="Buscar especialistas..."
              onSearch={(query) => {
                setSearchQueryEspecialistas(query);
                setCurrentPageEspecialistas(1);
              }}
              className="w-full md:w-64"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <EspecialistasTable
              especialistas={currentEspecialistas}
              isLoading={especialistasLoading}
              startIndex={startIndexEspecialistas}
            />
          </div>
        </div>

        {filteredEspecialistas.length > 0 && (
          <Pagination
            currentPage={currentPageEspecialistas}
            totalPages={totalPagesEspecialistas}
            totalItems={filteredEspecialistas.length}
            itemsPerPage={itemsPerPage}
            label="especialistas"
            onPageChange={setCurrentPageEspecialistas}
          />
        )}
      </div>

      {/* Tabla de comisiones pendientes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Comisiones Pendientes</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <ComisionesTable
              comisiones={currentComisiones}
              onPagar={handlePagarComision}
            />
          </div>
        </div>

        {filteredComisiones.length > 0 && (
          <Pagination
            currentPage={currentPageComisiones}
            totalPages={totalPages}
            totalItems={filteredComisiones.length}
            itemsPerPage={itemsPerPage}
            label="comisiones"
            onPageChange={setCurrentPageComisiones}
          />
        )}
      </div>

      {/* Historial de comisiones pagadas */}
      <HistorialComisionesTable
        comisiones={currentHistorial}
        isLoading={historialLoading}
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

      {/* Modal para pagar comisión */}
      {selectedComision && showPagarModal && (
        <PagarComisionModal
          comision={selectedComision}
          onConfirm={handleConfirmarPago}
          onClose={() => {
            setShowPagarModal(false);
            setSelectedComision(null);
          }}
        />
      )}
    </div>
  );
}
