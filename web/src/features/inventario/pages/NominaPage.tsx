import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import Swal from "sweetalert2";
import {
  useGetEmpleadosQuery,
  useDeleteEmpleadoMutation,
  useGetHistorialPagosNominaQuery,
  useDeletePagoNominaMutation,
} from "../api/nominaApi";
import GenericTable from "../components/GenericTable";
import CrearEmpleadoModal from "../components/nomina/CrearEmpleadoModal";
import EditarEmpleadoModal from "../components/nomina/EditarEmpleadoModal";
import RegistrarPagoNominaModal from "../components/nomina/RegistrarPagoNominaModal";
import EditarPagoNominaModal from "../components/nomina/EditarPagoNominaModal";
import HistorialPagosTable from "../components/HistorialPagosTable";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";
import { formatFechaLocal } from "../../../shared";
import type { Empleado, NominaPago } from "../api/nominaApi";

export default function NominaPage() {
  const {
    data: empleadosData,
    isLoading,
    error,
  } = useGetEmpleadosQuery();
  const [deleteEmpleado] = useDeleteEmpleadoMutation();
  const [deletePago] = useDeletePagoNominaMutation();
  const {
    data: historialData,
    isLoading: historialLoading,
  } = useGetHistorialPagosNominaQuery();

  const empleados = empleadosData ?? [];
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [selectedPago, setSelectedPago] = useState<NominaPago | null>(null);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showRegistrarPagoModal, setShowRegistrarPagoModal] = useState(false);
  const [showEditarPagoModal, setShowEditarPagoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageEmpleados, setCurrentPageEmpleados] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const itemsPerPage = 5;

  const handleEditar = (id: string) => {
    const empleado = empleados.find((e) => e.id_empleado === id) || null;
    setSelectedEmpleado(empleado);
    setShowEditarModal(true);
  };

  const handleRegistrarPago = (id: string) => {
    const empleado = empleados.find((e) => e.id_empleado === id) || null;
    setSelectedEmpleado(empleado);
    setShowRegistrarPagoModal(true);
  };

  const empleadoNombre = selectedEmpleado
    ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido || ""}`
    : null;
  const empleadoPeriodo = selectedEmpleado?.periodo;
  const empleadoSueldo = selectedEmpleado?.sueldo;

  const handleEditarPago = (row: NominaPago) => {
    setSelectedPago(row);
    setShowEditarPagoModal(true);
  };

  const handleEliminar = async (id: string) => {
    const result = await Swal.fire({
      title: "¿Eliminar empleado?",
      text: "¿Está seguro que desea eliminar este empleado?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteEmpleado(id).unwrap();
        await Swal.fire({
          icon: "success",
          title: "Empleado eliminado",
          text: "El empleado fue eliminado correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text:
            err?.data?.message ||
            "No se pudo eliminar el empleado",
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
          text:
            err?.data?.message || "No se pudo eliminar el pago",
        });
      }
    }
  };

  const getEstadoBadge = (estado: string) => {
    if (estado.toLowerCase() === "activo") {
      return (
        <span className="text-base font-medium text-emerald-600">
          Activo
        </span>
      );
    }
    return (
      <span className="text-base font-medium text-red-600">
        Inactivo
      </span>
    );
  };

  const getPagoStatusBadge = (estatusPago?: string | null) => {
    if (estatusPago?.toLowerCase() === "pagada") {
      return (
        <span className="text-base font-medium text-emerald-600">
          Pagada
        </span>
      );
    }
    if (estatusPago?.toLowerCase() === "vencido") {
      return (
        <span className="text-base font-medium text-red-600">
          Vencido
        </span>
      );
    }
    return (
      <span className="text-base font-medium text-amber-500">
        Pendiente
      </span>
    );
  };

  // Filter empleados by search query
  const filteredEmpleados = useMemo(() => {
    if (!searchQuery.trim()) return empleados;

    const query = searchQuery.toLowerCase();
    return empleados.filter((empleado) => {
      const nombre = empleado.nombre?.toLowerCase() || "";
      const apellido = empleado.apellido?.toLowerCase() || "";
      const cedula = empleado.cedula?.toLowerCase() || "";
      const cargo = empleado.cargo?.toLowerCase() || "";

      return (
        nombre.includes(query) ||
        apellido.includes(query) ||
        cedula.includes(query) ||
        cargo.includes(query)
      );
    });
  }, [empleados, searchQuery]);

  // Paginación para empleados
  const totalPagesEmpleados = Math.ceil(
    filteredEmpleados.length / itemsPerPage,
  );
  const startIndexEmpleados = (currentPageEmpleados - 1) * itemsPerPage;
  const endIndexEmpleados = startIndexEmpleados + itemsPerPage;
  const currentEmpleados = filteredEmpleados.slice(
    startIndexEmpleados,
    endIndexEmpleados,
  );

  const historialRows = historialData ?? [];

  // Paginación para historial
  const totalPagesHistorial = Math.ceil(historialRows.length / itemsPerPage);
  const startIndexHistorial = (currentPageHistorial - 1) * itemsPerPage;
  const endIndexHistorial = startIndexHistorial + itemsPerPage;
  const currentHistorial = historialRows.slice(
    startIndexHistorial,
    endIndexHistorial,
  );

  const empleadosColumns = [
    {
      key: "id_empleado",
      header: "ID",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-base md:text-base font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-base md:text-base text-gray-900 font-mono",
      render: (_row: Empleado, index: number) =>
        String(startIndexEmpleados + index + 1).padStart(3, "0"),
    },
    {
      key: "nombre",
      header: "Nombre",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-gray-900",
      render: (row: Empleado) => `${row.nombre} ${row.apellido || ""}`,
    },
    {
      key: "cedula",
      header: "Cédula",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-gray-900",
      render: (row: Empleado) => row.cedula || "-",
    },
    {
      key: "cargo",
      header: "Cargo",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-gray-900",
      render: (row: Empleado) => row.cargo,
    },
    {
      key: "periodo",
      header: "Período",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-gray-900",
      render: (row: Empleado) => row.periodo,
    },
    {
      key: "sueldo",
      header: "Sueldo",
      headerClassName:
        "px-3 md:px-6 py-3 text-right text-base md:text-base font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-base md:text-base text-right text-gray-900",
      render: (row: Empleado) => `$${Number(row.sueldo).toFixed(2)}`,
    },
    {
      key: "estado",
      header: "Estado",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-center",
      render: (row: Empleado) => getEstadoBadge(row.estado),
    },
    {
      key: "proximo_pago",
      header: "Prox. Pago",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-gray-900",
      render: (row: Empleado) =>
        row.proximo_pago ? formatFechaLocal(row.proximo_pago) : "-",
    },
    {
      key: "estatus_pago",
      header: "Estado",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-center",
      render: (row: Empleado) => getPagoStatusBadge(row.estatus_pago),
    },
    {
      key: "acciones",
      header: "Acciones",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-base md:text-base font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-base md:text-base text-center",
      render: (row: Empleado) => (
        <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
          <button
            onClick={() => handleEditar(row.id_empleado)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-blue-100 text-blue-600 transition-colors"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleRegistrarPago(row.id_empleado)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-emerald-100 text-emerald-600 transition-colors"
            title="Registrar pago"
          >
            <DollarSign size={16} />
          </button>
          <button
            onClick={() => handleEliminar(row.id_empleado)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-red-100 text-red-600 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando empleados...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar los empleados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Nómina</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <SearchBar
            placeholder="Buscar empleados..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPageEmpleados(1);
            }}
            className="w-full md:w-64"
          />
          <button
            onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <Plus size={20} />
            Crear Empleado
          </button>
        </div>
      </div>

      {/* Tabla de Empleados */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <GenericTable<Empleado>
            columns={empleadosColumns}
            rows={currentEmpleados}
            rowKey={(row, index) =>
              `${row.id_empleado}-${startIndexEmpleados + index}`
            }
            tableClassName="w-full min-w-full text-base"
            theadClassName="bg-teal-500 text-white"
            getRowClassName={(_row, index) =>
              index % 2 === 0 ? "bg-gray-50" : "bg-white"
            }
            emptyState="No hay empleados registrados"
          />
        </div>
        {filteredEmpleados.length > 0 && (
          <Pagination
            currentPage={currentPageEmpleados}
            totalPages={totalPagesEmpleados}
            totalItems={filteredEmpleados.length}
            itemsPerPage={itemsPerPage}
            label="empleados"
            onPageChange={setCurrentPageEmpleados}
          />
        )}
      </div>

      {/* Historial de Pagos */}
      <div className="mt-10">
        <HistorialPagosTable
          historial={currentHistorial}
          isLoading={historialLoading}
          variant="nomina"
          onEditar={(row) => handleEditarPago(row as NominaPago)}
          onEliminar={handleEliminarPago}
          paginationInfo={
            !historialLoading && historialRows.length > 0
              ? {
                  currentPage: currentPageHistorial,
                  totalPages: totalPagesHistorial,
                  totalItems: historialRows.length,
                  itemsPerPage,
                  label: "pagos",
                  onPageChange: setCurrentPageHistorial,
                }
              : undefined
          }
        />
      </div>

      {/* Modales */}
      <CrearEmpleadoModal
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
      />

      <EditarEmpleadoModal
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        empleado={selectedEmpleado}
      />

      <RegistrarPagoNominaModal
        isOpen={showRegistrarPagoModal}
        onClose={() => {
          setShowRegistrarPagoModal(false);
          setSelectedEmpleado(null);
        }}
        empleadoId={selectedEmpleado?.id_empleado || null}
        empleadoNombre={empleadoNombre}
        empleadoPeriodo={empleadoPeriodo}
        empleadoSueldo={empleadoSueldo}
      />

      <EditarPagoNominaModal
        isOpen={showEditarPagoModal}
        onClose={() => {
          setShowEditarPagoModal(false);
          setSelectedPago(null);
        }}
        pago={selectedPago}
      />
    </div>
  );
}
