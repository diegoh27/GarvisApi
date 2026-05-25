const { Router } = require("express");
const router = Router();

const medicosRoutes = require("./medicosRoutes");
const userRoutes = require("./userRoutes");
const pacientesRoutes = require("./pacientesRoutes");
const representadosRoutes = require("./representadosRoutes");
const moderadoresRoutes = require("./moderadoresRoutes");
const disponibilidadRoutes = require("./disponibilidadRoutes");

const especialidadesRoutes = require("./especialidadesRoutes");
const ecosRoutes = require("./ecosRoutes");
const especialistaEcosRoutes = require("./especialistaEcosRoutes");

const citasRoutes = require("./citasRoutes");
const resultadosRoutes = require("./resultadosRoutes");
const informesRoutes = require("./informesRoutes");

const pagosRoutes = require("./pagosRoutes");
const metodosPagoRoutes = require("./metodosPagoRoutes");
const notificacionesRoutes = require("./notificacionesRoutes");
const pagosGuardadosRoutes = require("./pagosGuardadosRoutes");

const inventarioRoutes = require("./inventarioRoutes");
const productosRoutes = require("./productosRoutes");
const entesLegalesRoutes = require("./entesLegalesRoutes");
const obligacionesRoutes = require("./obligacionesRoutes");
const empleadosRoutes = require("./empleadosRoutes");
const nominaRoutes = require("./nominaRoutes");
const alquilerRoutes = require("./alquilerRoutes");
const espComisionRoutes = require("./espComisionRoutes");
const facturacionRoutes = require("./facturacionRoutes");
const proveedoresRoutes = require("./proveedoresRoutes");
const notaCompraRoutes = require("./notaCompraRoutes");
const ordenesCompraRoutes = require("./ordenesCompraRoutes");
const ecoInsumosRoutes = require("./ecoInsumosRoutes");
const kardexRoutes = require("./kardexRoutes");

const rolesRoutes = require("./rolesRoutes");
const dolarRoutes = require("./dolarRoutes");
const backupRoutes = require("./backupRoutes");

router.use("/medicos", medicosRoutes);
router.use("/users", userRoutes);
router.use("/pacientes", pacientesRoutes);
router.use("/representados", representadosRoutes);
router.use("/moderadores", moderadoresRoutes);
router.use("/disponibilidad", disponibilidadRoutes);

router.use("/especialidades", especialidadesRoutes);
router.use("/ecos", ecosRoutes);
router.use("/especialista-ecos", especialistaEcosRoutes);

router.use("/citas", citasRoutes);
router.use("/resultados", resultadosRoutes);
router.use("/informes", informesRoutes);

router.use("/pagos", pagosRoutes);
router.use("/metodos-pago", metodosPagoRoutes);
router.use("/notificaciones", notificacionesRoutes);
router.use("/pagos-guardados", pagosGuardadosRoutes);

router.use("/inventario", inventarioRoutes);
router.use("/productos", productosRoutes);
router.use("/entes-legales", entesLegalesRoutes);
router.use("/obligaciones", obligacionesRoutes);
router.use("/empleados", empleadosRoutes);
router.use("/nomina", nominaRoutes);
router.use("/alquiler", alquilerRoutes);
router.use("/comisiones-especialistas", espComisionRoutes);
router.use("/facturacion", facturacionRoutes);
router.use("/proveedores", proveedoresRoutes);
router.use("/notas-compra", notaCompraRoutes);
router.use("/ordenes-compra", ordenesCompraRoutes);
router.use("/eco-insumos", ecoInsumosRoutes);
router.use("/kardex", kardexRoutes);

router.use("/roles", rolesRoutes);
router.use("/dolar", dolarRoutes);
router.use("/backup", backupRoutes);

const loginRoutes = require("./loginRoutes");
router.use("/auth", loginRoutes);

const orthancRoutes = require("./orthancRoutes");
router.use("/orthanc", orthancRoutes);

const auditoriaRoutes = require("./auditoriaRoutes");
router.use("/auditoria", auditoriaRoutes);

module.exports = router;
