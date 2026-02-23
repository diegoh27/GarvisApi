import { useMemo, useState } from "react";
import { useGetEspecialistasInventarioQuery } from "../api/especialistasApi";
import type { EspecialistaInventario } from "../api/especialistasApi";
import GenericTable from "../components/GenericTable";
import Pagination from "../components/Pagination";
import SearchBar from "../components/SearchBar";

export default function PorEspecialistaPage() {
  const { data: especialistasData, isLoading, error } =
    useGetEspecialistasInventarioQuery();

  const especialistas = especialistasData ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredEspecialistas = useMemo(() => {
    if (!searchQuery.trim()) return especialistas;

    const query = searchQuery.toLowerCase();
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
  }, [especialistas, searchQuery]);

  const totalPages = Math.ceil(filteredEspecialistas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEspecialistas = filteredEspecialistas.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
      render: (_row: EspecialistaInventario, index: number) =>
        String(startIndex + index + 1).padStart(3, "0"),
    },
    {
      key: "nombre",
      header: "Nombre",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaInventario) =>
        `${row.nombre} ${row.apellido}`,
    },
    {
      key: "especialidad",
      header: "Especialidad",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaInventario) => row.especialidad || "-",
    },
    {
      key: "porcentaje",
      header: "Porcentaje",
      headerClassName:
        "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
      render: (row: EspecialistaInventario) =>
        row.porcentaje !== null && row.porcentaje !== undefined
          ? `${Number(row.porcentaje).toFixed(2)}%`
          : "-",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando especialistas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar especialistas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          Inventario - Por Especialista
        </h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <SearchBar
            placeholder="Buscar especialistas..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            className="w-full md:w-64"
          />
          <a
            href="/admin/registrar-especialista"
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <span className="text-lg leading-none">+</span>
            Registrar especialista
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <GenericTable<EspecialistaInventario>
            columns={columns}
            rows={currentEspecialistas}
            rowKey={(row) => row.id_especialista}
            tableClassName="w-full min-w-full text-sm"
            theadClassName="bg-teal-500 text-white"
            getRowClassName={(_row, index) =>
              index % 2 === 0 ? "bg-gray-50" : "bg-white"
            }
            emptyState="No hay especialistas registrados"
          />
        </div>
      </div>

      {filteredEspecialistas.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEspecialistas.length}
          itemsPerPage={itemsPerPage}
          label="especialistas"
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
