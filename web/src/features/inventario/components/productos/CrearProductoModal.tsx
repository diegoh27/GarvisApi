import { useState, useEffect } from "react";
import { useCreateProductoMutation } from "../../api";
import { X, Plus, Save, Bell, Info } from "lucide-react";
import { pluralizarUnidad, formatUnidad } from "../../../../utils/pluralizar";

interface CrearProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CrearProductoModal({
  isOpen,
  onClose,
}: CrearProductoModalProps) {
  const [createProducto, { isLoading }] = useCreateProductoMutation();
  const [formData, setFormData] = useState({
    nombre: "",
    presentacion: "",
    categoria: "General",
    unidad_compra: "Caja",
    unidad_consumo: "Par",
    factor_conversion: "1",
    stock_base_total: "0",
    stock_minimo_base: "0",
    activo: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (formData.nombre.trim().length > 120) {
      setError("El nombre del producto no puede superar 120 caracteres");
      return;
    }
    const fConv = Number(formData.factor_conversion);
    if (!Number.isFinite(fConv) || fConv <= 0) {
      setError("El factor de conversión debe ser numérico y mayor a 0");
      return;
    }
    if (!formData.unidad_compra.trim() || !formData.unidad_consumo.trim()) {
      setError("Las unidades de compra y consumo son obligatorias");
      return;
    }
    const stock = Number(formData.stock_base_total);
    if (!Number.isFinite(stock) || stock < 0) {
      setError("El stock inicial base debe ser un número igual o mayor a 0");
      return;
    }
    const minStock = Number(formData.stock_minimo_base);
    if (!Number.isFinite(minStock) || minStock < 0) {
      setError("El stock mínimo base debe ser un número igual o mayor a 0");
      return;
    }

    try {
      await createProducto({
        nombre: formData.nombre.trim(),
        presentacion: formData.presentacion.trim() || undefined,
        categoria: formData.categoria,
        unidad_compra: formData.unidad_compra.trim(),
        unidad_consumo: formData.unidad_consumo.trim(),
        factor_conversion: fConv,
        stock_base_total: Number(formData.stock_base_total) || 0,
        stock_minimo_base: Number(formData.stock_minimo_base) || 0,
        activo: formData.activo ? 1 : 0,
      }).unwrap();

      setSuccess("Producto creado exitosamente");
      setTimeout(() => {
        setFormData({
          nombre: "",
          presentacion: "",
          categoria: "General",
          unidad_compra: "Caja",
          unidad_consumo: "Par",
          factor_conversion: "1",
          stock_base_total: "0",
          stock_minimo_base: "0",
          activo: true,
        });
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al crear el producto");
    }
  };

  if (!isOpen) return null;

  const inputClassName =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006965] focus:bg-white placeholder-slate-400 transition-all";
  const labelClassName =
    "block text-xs font-bold text-slate-600 mb-1.5";

  const UNIDADES_MEDIDA = [
    "Litro", "Mililitro", 
    "Par", "Unidad", "Kit", "Pieza", "Sobre", "Kilo", "Gramo","Lata","Bolsa","Ampolla","Frasco","Miligramo"
  ].sort();

  const UNIDADES_MEDIDA_MAYOR = [
    "Barril", "Galón  ", "Metro cúbico", "Docena", "Millar", "Bulto", "Caja", "Tonelada", "Saco", "Rollo", "Resma", "Pallet"
  ].sort();

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-transparent">
          <div className="flex items-center gap-3">
            <div className="bg-[#006965] text-white p-1.5 rounded-md flex items-center justify-center">
              <Plus size={18} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              Agregar Nuevo Insumo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Top section: Alerts */}
          {(error || success) && (
            <div className="px-8 mt-2">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}
            </div>
          )}

          {/* PASO 01 */}
          <div className="bg-white px-8 pb-6 pt-2">
            <h3 className="text-sm font-bold text-slate-400 mb-5">
              PASO 01 <span className="text-slate-700 ml-1">Detalles Básicos</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>Nombre del producto</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  maxLength={120}
                  className={inputClassName}
                  placeholder="Ej: Guantes de Nitrilo"
                  required
                />
              </div>

              <div>
                <label className={labelClassName}>Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className={`${inputClassName} appearance-none cursor-pointer`}
                >
                  <option value="General" disabled className="text-slate-400">Seleccionar categoría...</option>
                  <option value="General">General</option>
                  <option value="Insumos Médicos">Insumos Médicos</option>
                  <option value="Medicamentos">Medicamentos</option>
                  <option value="Equipos">Equipos</option>
                  <option value="Descartables">Descartables</option>
                  <option value="Diagnóstico">Diagnóstico</option>
                  <option value="Instrumental">Instrumental</option>
                  <option value="Líquidos">Líquidos</option>
                </select>
              </div>
            </div>
          </div>

          {/* PASO 02 */}
          <div className="bg-slate-50 px-8 py-8 border-y border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 mb-1">
              PASO 02 <span className="text-slate-700 ml-1">Empaque y Consumo</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              Configura cómo entra el producto al almacén y cómo se descuenta en cada cita médica.
            </p>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className={labelClassName}>¿Cómo compras este insumo al mayor?</label>
                <select
                  value={formData.unidad_compra}
                  onChange={(e) => setFormData({ ...formData, unidad_compra: e.target.value })}
                  className={`${inputClassName} appearance-none cursor-pointer`}
                  required
                >
                  <option value="" disabled className="text-slate-400">Seleccionar unidad...</option>
                  {UNIDADES_MEDIDA_MAYOR.map(unidad => (
                    <option key={`compra-${unidad}`} value={unidad}>{unidad}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>¿Cómo se mide este producto?</label>
                <select
                  value={formData.unidad_consumo}
                  onChange={(e) => setFormData({ ...formData, unidad_consumo: e.target.value })}
                  className={`${inputClassName} appearance-none cursor-pointer`}
                  required
                >
                  <option value="" disabled className="text-slate-400">Seleccionar unidad...</option>
                  {UNIDADES_MEDIDA.map(unidad => (
                    <option key={`consumo-${unidad}`} value={unidad}>{unidad}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className={labelClassName}>¿Cuánta cantidad trae cada empaque de este producto?</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={formData.factor_conversion}
                  onChange={(e) => setFormData({ ...formData, factor_conversion: e.target.value })}
                  className={`${inputClassName} pr-24`}
                  placeholder="Ej: 100"
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-50 text-teal-700 text-[10px] font-bold px-2 py-1 rounded uppercase">
                  {pluralizarUnidad(formData.unidad_consumo || "Unidad", Number(formData.factor_conversion) || 1)}
                </div>
              </div>
            </div>

            {/* Helper Mágico */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex gap-3">
              <div className="text-teal-600 mt-0.5">
                <Info size={18} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-[#006965]">Ejemplo visual:</span>
                <p className="text-xs font-medium text-teal-800/80 leading-relaxed">
                  1 <span className="font-bold">{formData.unidad_compra || 'Caja'}</span> equivale a <span className="font-bold">{formatUnidad(Number(formData.factor_conversion) || 1, formData.unidad_consumo || 'Unidad')}</span>. El sistema descontará "<span className="font-bold">{formData.unidad_consumo || 'Unidad'}</span>" automáticamente.
                </p>
              </div>
            </div>
          </div>

          {/* PASO 03 */}
          <div className="bg-white px-8 pt-8 pb-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 mb-5">
              PASO 03 <span className="text-slate-700 ml-1">Stock y Alertas</span>
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelClassName}>
                  Cantidad inicial <span className="text-slate-400 font-normal">(cuanto dispones actualmente)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.stock_base_total}
                  onChange={(e) => setFormData({ ...formData, stock_base_total: e.target.value })}
                  className={inputClassName}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Stock mínimo <span className="text-slate-400 font-normal">(alerta cuando queda poco)</span>
                </label>
                <div className="relative">
                  <Bell size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.stock_minimo_base}
                    onChange={(e) => setFormData({ ...formData, stock_minimo_base: e.target.value })}
                    className={`${inputClassName} pl-10`}
                    placeholder="Mínimo de unidades"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white px-8 py-5 flex items-center justify-between rounded-b-2xl">
            {/* Left: Switch */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#006965] focus:ring-offset-2 ${
                  formData.activo ? 'bg-[#006965]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.activo ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-slate-600">Producto activo</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 flex items-center gap-2 bg-[#006965] text-white rounded-lg text-sm font-semibold hover:bg-teal-800 transition-colors shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isLoading ? "Guardando..." : "Guardar Insumo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
