import {
  useGetComprasProductoQuery,
  useGetAjustesProductoQuery,
} from "../../api";
import { formatFechaCortaLocal } from "../../../../shared";
import { X } from "lucide-react";

const formatDate = (dateString: string): string => formatFechaCortaLocal(dateString);

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProducto: string;
  type: "compras" | "ajustes";
}

export default function HistorialModal({
  isOpen,
  onClose,
  idProducto,
  type,
}: HistorialModalProps) {
  const { data: compras = [], isLoading: loadingCompras } =
    useGetComprasProductoQuery(idProducto, { skip: !isOpen || type !== "compras" });
  const { data: ajustes = [], isLoading: loadingAjustes } =
    useGetAjustesProductoQuery(idProducto, { skip: !isOpen || type !== "ajustes" });

  const isLoading = type === "compras" ? loadingCompras : loadingAjustes;
  const data = type === "compras" ? compras : ajustes;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl md:max-w-4xl max-h-[90vh] md:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">
            {type === "compras" ? "Historial de Compras" : "Historial de Ajustes"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 md:p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando historial...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {type === "compras"
                  ? "No hay compras registradas"
                  : "No hay ajustes registrados"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              {type === "compras" ? (
                <table className="w-full min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        ID
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Fecha Ingreso
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">
                        Cantidad
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">
                        Precio Unitario ($)
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">
                        Precio Total ($)
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Proveedor
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Referencia
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compras as any[]).map((compra, index) => (
                      <tr
                        key={compra.id_compra}
                        className={
                          index % 2 === 0 ? "bg-gray-50" : "bg-white"
                        }
                      >
                        <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-gray-900">
                          {compra.id_compra.slice(0, 6)}...
                        </td>
                        <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-gray-900 hidden sm:table-cell">
                          {formatDate(compra.fecha_ingreso)}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-right text-xs md:text-sm text-gray-900">
                          {compra.cantidad}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-right text-xs md:text-sm text-gray-900 hidden sm:table-cell">
                          ${Number(compra.precio_unitario).toFixed(2)}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-right text-xs md:text-sm font-semibold text-gray-900 hidden md:table-cell">
                          ${Number(compra.precio_total).toFixed(2)}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-gray-900 hidden lg:table-cell">
                          {compra.proveedor || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-full text-xs md:text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-gray-700">
                        ID
                      </th>
                      <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-gray-700 hidden sm:table-cell">
                        Fecha
                      </th>
                      <th className="px-2 md:px-4 py-2 text-center text-xs font-medium text-gray-700 hidden md:table-cell">
                        S.Anterior
                      </th>
                      <th className="px-2 md:px-4 py-2 text-center text-xs font-medium text-gray-700 hidden md:table-cell">
                        S.Nuevo
                      </th>
                      <th className="px-2 md:px-4 py-2 text-center text-xs font-medium text-gray-700">
                        Cambio
                      </th>
                      <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-gray-700 hidden lg:table-cell">
                        Motivo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ajustes as any[]).map((ajuste, index) => (
                      <tr
                        key={ajuste.id_ajuste}
                        className={
                          index % 2 === 0 ? "bg-gray-50" : "bg-white"
                        }
                      >
                        <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-gray-900">
                          {ajuste.id_ajuste.slice(0, 6)}...
                        </td>
                        <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-gray-900 hidden sm:table-cell">
                          {formatDate(ajuste.fecha)}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center text-xs md:text-sm text-gray-900 hidden md:table-cell">
                          {ajuste.stock_anterior}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center text-xs md:text-sm text-gray-900 hidden md:table-cell">
                          {ajuste.stock_nuevo}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center text-xs md:text-sm font-semibold">
                          <span
                            className={
                              ajuste.stock_nuevo - ajuste.stock_anterior > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {ajuste.stock_nuevo - ajuste.stock_anterior > 0 ? "+" : ""}
                            {ajuste.stock_nuevo - ajuste.stock_anterior}
                          </span>
                        </td>
                        <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-gray-900 hidden lg:table-cell">
                          {ajuste.motivo || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 md:px-6 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
