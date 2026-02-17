import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Swal from "sweetalert2";
import {
  useListComisionesQuery,
  useGetHistorialComisionesQuery,
  useGenerarComisionesMutation,
  usePagarComisionMutation,
  useEditarPagoComisionMutation,
  useDeletePagoComisionMutation,
  useCrearCitaMostradorMutation,
} from "../api/comisionesApi";
import { useGetEspecialistasInventarioQuery } from "../api/especialistasApi";
import type { EspecialistaComision } from "../api/comisionesApi";
import type { EspecialistaInventario } from "../api/especialistasApi";
import ComisionesTable from "../components/comisiones/ComisionesTable";
import HistorialComisionesTable from "../components/comisiones/HistorialComisionesTable";
import EspecialistasTable from "../components/comisiones/EspecialistasTable";
import PagarComisionModal from "../components/comisiones/PagarComisionModal";
import EditarEspecialistaModal from "../components/comisiones/EditarEspecialistaModal";
import RegistrarCitaMostradorModal from "../components/comisiones/RegistrarCitaMostradorModal";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";
import { useUpdateEspecialistaMutation } from "../../usuarios/usuariosApi";
import { useGetEspecialidadesQuery } from "../../especialidades/especialidadesApi";

export default function ComisionesEspecialistasPage() {
  const [filtroEstado, setFiltroEstado] = useState<"Todas" | "Pendiente" | "Pagada">("Todas");
  const { data: queryData, isLoading, error } = useListComisionesQuery({
    estado: filtroEstado === "Todas" ? undefined : filtroEstado,
  });
  const comisionesData = Array.isArray(queryData) ? queryData : [];
  const { data: historialData = [], isLoading: historialLoading } =
    useGetHistorialComisionesQuery();
  const { data: especialistasData, isLoading: especialistasLoading, refetch: refetchEspecialistas } =
    useGetEspecialistasInventarioQuery();
  const { data: especialidades = [] } = useGetEspecialidadesQuery();
  const especialistas = especialistasData ?? [];
  const [generarComisiones] = useGenerarComisionesMutation();
  const [pagarComision] = usePagarComisionMutation();
  const [editarPagoComision] = useEditarPagoComisionMutation();
  const [deletePagoComision] = useDeletePagoComisionMutation();
  const [crearCitaMostrador, { isLoading: isCreatingMostrador }] = useCrearCitaMostradorMutation();
  const [updateEspecialista, { isLoading: isUpdatingEspecialista }] = useUpdateEspecialistaMutation();

  const [selectedComision, setSelectedComision] =
    useState<EspecialistaComision | null>(null);
  const [selectedEspecialista, setSelectedEspecialista] =
    useState<EspecialistaInventario | null>(null);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [showEditarEspecialistaModal, setShowEditarEspecialistaModal] = useState(false);
  const [showRegistrarMostradorModal, setShowRegistrarMostradorModal] = useState(false);
  const [modoPago, setModoPago] = useState<"pagar" | "editar">("pagar");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQueryEspecialistas, setSearchQueryEspecialistas] = useState("");
  const [currentPageComisiones, setCurrentPageComisiones] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const [currentPageEspecialistas, setCurrentPageEspecialistas] = useState(1);
  const itemsPerPage = 5;

  const handleGenerarComisiones = async () => {
    const result = await Swal.fire({
      title: "¿Sincronizar pagos pendientes?",
      text: "Se generarán comisiones para todas las citas atendidas y pagadas pendientes.",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, sincronizar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await generarComisiones({}).unwrap();
        Swal.fire({
          icon: "success",
          title: "Pagos pendientes sincronizados",
          text: `Se sincronizaron ${response.data.inserted} comisiones exitosamente.`,
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
    setModoPago("pagar");
    setShowPagarModal(true);
  };

  const handleEditarPago = (comision: EspecialistaComision) => {
    setSelectedComision(comision);
    setModoPago("editar");
    setShowPagarModal(true);
  };

  const handleEliminarPago = async (idComision: string) => {
    const result = await Swal.fire({
      title: "¿Eliminar pago?",
      text: "Se revertirá esta comisión a Pendiente y se quitará el movimiento de facturación.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await deletePagoComision(idComision).unwrap();
        await Swal.fire({
          icon: "success",
          title: "Pago eliminado",
          text: "El pago de comisión fue eliminado correctamente.",
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

  const handleEditarEspecialista = (especialista: EspecialistaInventario) => {
    setSelectedEspecialista(especialista);
    setShowEditarEspecialistaModal(true);
  };

  const handleGuardarEspecialista = async (payload: {
    id_especialidad: string;
    porcentaje: number;
  }) => {
    if (!selectedEspecialista) return;

    try {
      await updateEspecialista({
        id: selectedEspecialista.id_especialista,
        payload,
      }).unwrap();

      await Swal.fire({
        icon: "success",
        title: "Especialista actualizado",
        text: "Los datos del especialista se guardaron correctamente.",
        timer: 1800,
        showConfirmButton: false,
      });

      setShowEditarEspecialistaModal(false);
      setSelectedEspecialista(null);
      refetchEspecialistas();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.data?.message || "No se pudo actualizar el especialista",
      });
    }
  };

  const handleConfirmarPago = async (
    idComision: string,
    fecha_pago: string,
    metodo?: string,
    referencia?: string,
  ) => {
    try {
      if (modoPago === "editar") {
        await editarPagoComision({
          idComision,
          payload: {
            fecha_pago,
            metodo: (metodo as any) || undefined,
            referencia: referencia || undefined,
          },
        }).unwrap();
      } else {
        await pagarComision({
          idComision,
          payload: {
            fecha_pago,
            metodo: (metodo as any) || undefined,
            referencia: referencia || undefined,
          },
        }).unwrap();
      }

      Swal.fire({
        icon: "success",
        title: modoPago === "editar" ? "Pago actualizado" : "Pago registrado",
        text:
          modoPago === "editar"
            ? "El pago fue actualizado correctamente."
            : "El pago fue registrado correctamente.",
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

  const handleRegistrarCitaMostrador = async (payload: {
    id_especialista: string;
    id_eco: string;
    fecha_cita: string;
    metodo: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
    monto: number;
    tasa_dia_bcv: number;
    nombre: string;
    apellido: string;
    cedula: string;
    rif?: string;
    referencia?: string;
  }) => {
    try {
      await crearCitaMostrador(payload).unwrap();
      await Swal.fire({
        icon: "success",
        title: "Cita registrada",
        text: "La cita de mostrador quedó registrada como pagada y atendida.",
        timer: 2200,
        showConfirmButton: false,
      });
      setShowRegistrarMostradorModal(false);
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.data?.message || "No se pudo registrar la cita de mostrador",
      });
      throw error;
    }
  };

  const filteredComisiones = useMemo(() => {
    if (!searchQuery.trim()) return comisionesData;

    const query = searchQuery.toLowerCase();
    return comisionesData.filter((comision) => {
      const nombre = comision.especialista_nombre?.toLowerCase() || "";
      const apellido = comision.especialista_apellido?.toLowerCase() || "";
      const paciente = comision.paciente_nombre?.toLowerCase() || "";
      const cedulaPaciente = comision.paciente_cedula?.toLowerCase() || "";
      const ecoNombre = comision.eco_nombre?.toLowerCase() || "";
      const monto = comision.monto?.toString() || "";

      return (
        nombre.includes(query) ||
        apellido.includes(query) ||
        paciente.includes(query) ||
        cedulaPaciente.includes(query) ||
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
        <h1 className="text-2xl md:text-3xl font-bold">Pagos a Especialistas</h1>
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
            onClick={() => setShowRegistrarMostradorModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <Plus size={20} />
            Registrar cita de mostrador
          </button>
          <button
            onClick={handleGenerarComisiones}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <Plus size={20} />
            Sincronizar pagos pendientes
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
              onEditar={handleEditarEspecialista}
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

      {/* Tabla de citas con estado de pago */}
      <div className="mb-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Citas</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFiltroEstado("Todas");
                setCurrentPageComisiones(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filtroEstado === "Todas"
                ? "bg-teal-500 text-white"
                : "border border-brand-300 bg-white text-brand-700 hover:bg-brand-50"
                }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltroEstado("Pendiente");
                setCurrentPageComisiones(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filtroEstado === "Pendiente"
                ? "bg-teal-500 text-white"
                : "border border-brand-300 bg-white text-brand-700 hover:bg-brand-50"
                }`}
            >
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltroEstado("Pagada");
                setCurrentPageComisiones(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filtroEstado === "Pagada"
                ? "bg-teal-500 text-white"
                : "border border-brand-300 bg-white text-brand-700 hover:bg-brand-50"
                }`}
            >
              Pagadas
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <ComisionesTable
              comisiones={currentComisiones}
              onPagar={handlePagarComision}
              onEditar={handleEditarPago}
              startIndex={startIndex}
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

      {/* Historial de pagos */}
      <HistorialComisionesTable
        comisiones={currentHistorial}
        isLoading={historialLoading}
        onEliminar={handleEliminarPago}
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
          mode={modoPago}
        />
      )}

      {selectedEspecialista && showEditarEspecialistaModal && (
        <EditarEspecialistaModal
          especialista={selectedEspecialista}
          especialidades={especialidades}
          isSaving={isUpdatingEspecialista}
          onClose={() => {
            setShowEditarEspecialistaModal(false);
            setSelectedEspecialista(null);
          }}
          onSave={handleGuardarEspecialista}
        />
      )}

      {showRegistrarMostradorModal && (
        <RegistrarCitaMostradorModal
          especialistas={especialistas}
          isSaving={isCreatingMostrador}
          onClose={() => setShowRegistrarMostradorModal(false)}
          onSave={handleRegistrarCitaMostrador}
        />
      )}
    </div>
  );
}
