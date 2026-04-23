import { useState, useEffect } from "react";
import { useCreateProveedorMutation } from "../api";
import { X } from "lucide-react";

interface CrearProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CrearProveedorModal({
  isOpen,
  onClose,
}: CrearProveedorModalProps) {
  const [createProveedor, { isLoading }] = useCreateProveedorMutation();
  const [formData, setFormData] = useState({
    nombre: "",
    rif: "",
    telefono: "",
    correo: "",
    contacto_nombre: "",
    direccion: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      setFormData({
        nombre: "",
        rif: "",
        telefono: "",
        correo: "",
        contacto_nombre: "",
        direccion: "",
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.nombre.trim()) {
      setError("La Razón Social es obligatoria");
      return;
    }

    try {
      await createProveedor({
        nombre: formData.nombre.trim(),
        rif: formData.rif.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        correo: formData.correo.trim() || undefined,
        contacto_nombre: formData.contacto_nombre.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
      }).unwrap();

      setSuccess("Proveedor creado exitosamente");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al crear el proveedor");
    }
  };

  if (!isOpen) return null;

  const inputClassName =
    "w-full px-4 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 transition-shadow";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-base font-bold uppercase tracking-widest text-teal-600">
                Nuevo Registro
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                Agregar Proveedor
              </h2>
              <p className="text-base text-gray-500 mt-1">
                Complete la información del socio comercial para registrarlo en el sistema.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
          {/* Razón Social */}
          <div>
            <label className="block text-base font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Razón Social *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              maxLength={120}
              className={inputClassName}
              placeholder="Ej: Distribuidora Médica C.A."
              required
            />
          </div>

          {/* RIF + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                RIF
              </label>
              <input
                type="text"
                value={formData.rif}
                onChange={(e) =>
                  setFormData({ ...formData, rif: e.target.value })
                }
                maxLength={50}
                className={inputClassName}
                placeholder="Ej: J-30928471-0"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                maxLength={50}
                className={inputClassName}
                placeholder="Teléfono de contacto"
              />
            </div>
          </div>

          {/* Correo + Nombre de Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.correo}
                onChange={(e) =>
                  setFormData({ ...formData, correo: e.target.value })
                }
                maxLength={100}
                className={inputClassName}
                placeholder="Email corporativo"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Nombre de Contacto
              </label>
              <input
                type="text"
                value={formData.contacto_nombre}
                onChange={(e) =>
                  setFormData({ ...formData, contacto_nombre: e.target.value })
                }
                maxLength={100}
                className={inputClassName}
                placeholder="Persona de contacto"
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-base font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Dirección
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              maxLength={250}
              className={inputClassName}
              placeholder="Dirección física"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-base">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-base">
              {success}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-base font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-base font-medium hover:bg-teal-700 transition-colors shadow-sm disabled:bg-teal-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Guardando..." : "Guardar Proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
