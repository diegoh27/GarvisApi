import { useState, useMemo } from "react";
import { X, FileDown } from "lucide-react";
import type { Obligacion, HistorialEnteLegal } from "../../api";
import GenericTable from "../GenericTable";
import { formatFechaCortaLocal, formatFechaHoraLocal } from "../../../../shared";
import { generateTableReport } from "../../../../utils/generateTableReport";

interface HistorialObligacionModalProps {
  isOpen: boolean;
  obligacion: Obligacion | null;
  historialData: HistorialEnteLegal[];
  isLoading: boolean;
  onClose: () => void;
}

type HistorialRow = HistorialEnteLegal;

export default function HistorialObligacionModal({
  isOpen,
  obligacion,
  historialData,
  isLoading,
  onClose,
}: HistorialObligacionModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtrar historial para solo esta obligación
  const historialFiltrado = useMemo(() => {
    if (!obligacion || !historialData) return [];
    return historialData.filter(
      (pago) => pago.concepto === obligacion.concepto
    );
  }, [obligacion, historialData]);

  const totalPages = Math.ceil(historialFiltrado.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistorial = historialFiltrado.slice(startIndex, endIndex);

  const columns = [
    {
      key: "id_pago",
      header: "ID",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: HistorialRow) => `${row.id_historial?.slice(0, 6)}...` || "-",
    },
    {
      key: "fecha",
      header: "Fecha de Pago",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: HistorialRow) =>
        formatFechaCortaLocal(row.fecha_ingreso),
    },
    {
      key: "monto",
      header: "Monto ($)",
      headerClassName: "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
      render: (row: HistorialRow) => `$${Number(row.precio_unitario).toFixed(2)}`,
    },
    {
      key: "registrado",
      header: "Registrado en",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: HistorialRow) =>
        formatFechaHoraLocal(row.creado_en),
    },
  ];

  const handleDownloadReport = () => {
    const tableHeaders = columns.map(c => c.header);
    const tableData = historialFiltrado.map(row => {
      return columns.map(c => typeof c.render(row) === "string" ? c.render(row) : "-");
    });

    const suma = historialFiltrado.reduce((sum, p) => sum + (Number(p.precio_unitario) || 0), 0);
    
    generateTableReport({
      title: "HISTORIAL DE PAGOS OBLIGACIÓN",
      subtitle: `Fecha: ${new Date().toLocaleDateString("es-VE")}`,
      reportInfo: [
        { label: "Ente Legal", value: obligacion?.nombre_ente || "-" },
        { label: "Concepto", value: obligacion?.concepto || "-" },
        { label: "Total Intervenciones", value: historialFiltrado.length.toString() }
      ],
      tableHeaders,
      tableData,
      total: `$${suma.toFixed(2)}`,
      filename: `Pagos_${obligacion?.nombre_ente?.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`
    });
  };

  if (!isOpen || !obligacion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Historial de Pagos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {obligacion.nombre_ente} - {obligacion.concepto}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {historialFiltrado.length > 0 && (
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
              >
                <FileDown size={18} />
                <span className="hidden sm:inline">Descargar Reporte</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando historial...</p>
            </div>
          ) : historialFiltrado.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay pagos registrados para esta obligación</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <GenericTable<HistorialRow>
                  columns={columns}
                  rows={currentHistorial}
                  rowKey={(row) => row.id_historial || ""}
                  tableClassName="w-full min-w-[500px] text-sm"
                  theadClassName="bg-gray-100"
                  getRowClassName={(_row, index) =>
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  }
                  emptyState="No hay pagos registrados"
                />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a{" "}
                    {Math.min(endIndex, historialFiltrado.length)} de{" "}
                    {historialFiltrado.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600 flex items-center px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Total de pagos:</strong> {historialFiltrado.length}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Monto total pagado:</strong> $
                  {historialFiltrado
                    .reduce((sum, p) => sum + (Number(p.precio_unitario) || 0), 0)
                    .toFixed(2)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
