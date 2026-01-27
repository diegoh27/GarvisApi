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

const inventarioRoutes = require("./inventarioRoutes");
const productosRoutes = require("./productosRoutes");
const entesLegalesRoutes = require("./entesLegalesRoutes");
const empleadosRoutes = require("./empleadosRoutes");

const rolesRoutes = require("./rolesRoutes");
const dolarRoutes = require("./dolarRoutes");

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

router.use("/inventario", inventarioRoutes);
router.use("/productos", productosRoutes);
router.use("/entes-legales", entesLegalesRoutes);
router.use("/empleados", empleadosRoutes);

router.use("/roles", rolesRoutes);
router.use("/dolar", dolarRoutes);

const loginRoutes = require("./loginRoutes");
router.use("/auth", loginRoutes);
module.exports = router;
