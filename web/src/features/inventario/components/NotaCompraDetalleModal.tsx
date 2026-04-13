import { X, Receipt, Building, Calendar, Text, Tag } from "lucide-react";
import { useGetNotaCompraQuery } from "../api";

interface NotaCompraDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  idNotaCompra: string | null;
}

export default function NotaCompraDetalleModal({
  isOpen,
  onClose,
  idNotaCompra,
}: NotaCompraDetalleModalProps) {
  const { data: notaCompra, isLoading } = useGetNotaCompraQuery(
    idNotaCompra as string,
    { skip: !isOpen || !idNotaCompra }
  );

  if (!isOpen || !idNotaCompra) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Detalles de Factura
              </h2>
              <p className="text-xs text-gray-500 font-medium">ID: {idNotaCompra.slice(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="text-gray-500 font-medium">Cargando detalles...</span>
            </div>
          ) : !notaCompra ? (
            <div className="flex justify-center py-12">
              <span className="text-gray-500">Error al cargar la factura.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información General */}
              <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-100">
                <div>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> Proveedor
                  </div>
                  <div className="font-semibold text-gray-900">
                    {notaCompra.proveedor_nombre || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Nº Factura
                  </div>
                  <div className="font-semibold text-gray-900">
                    {notaCompra.numero_factura || "S/N"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Fecha
                  </div>
                  <div className="font-medium text-gray-900">
                    {new Date(notaCompra.fecha_compra).toLocaleDateString("es-VE")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Text className="w-3.5 h-3.5" /> Observaciones
                  </div>
                  <div className="text-sm text-gray-700">
                    {notaCompra.observaciones || "Sin observaciones"}
                  </div>
                </div>
              </div>

              {/* Detalle de Productos */}
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-teal-500 rounded-full"></div>
                  Insumos Comprados
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Producto</th>
                          <th className="px-4 py-3 font-semibold text-gray-500 uppercase text-xs text-center">Cant.</th>
                          <th className="px-4 py-3 font-semibold text-gray-500 uppercase text-xs text-right">P. Unitario</th>
                          <th className="px-4 py-3 font-semibold text-gray-500 uppercase text-xs text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {notaCompra.lineas?.map((linea) => (
                          <tr key={linea.id_detalle} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{linea.producto_nombre}</td>
                            <td className="px-4 py-3 text-gray-700 text-center">{linea.cantidad}</td>
                            <td className="px-4 py-3 text-gray-700 text-right">${Number(linea.precio_unitario).toFixed(2)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900 text-right">${Number(linea.precio_total).toFixed(2)}</td>
                          </tr>
                        ))}
                        {(!notaCompra.lineas || notaCompra.lineas.length === 0) && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              No hay detalles disponibles
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="flex justify-end pt-4">
                <div className="w-full max-w-sm bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-medium">${Number(notaCompra.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Impuesto (16%):</span>
                    <span className="font-medium">${Number(notaCompra.impuesto).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 mt-2 pt-2 text-base font-bold text-gray-900">
                    <span>Total USD:</span>
                    <span className="text-teal-600">${Number(notaCompra.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-700">
                    <span>Total Bs:</span>
                    <span>Bs {Number(notaCompra.monto_bs).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
