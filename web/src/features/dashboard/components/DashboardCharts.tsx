import { useState, useMemo } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	LineChart,
	Line,
} from "recharts";
import { useGetAllCitasQuery } from "../../citas/citasApi";
import { useListMovimientosFacturacionQuery } from "../../inventario/api/facturacionApi";
import { useGetProductosQuery } from "../../inventario/api";

const DashboardCharts = () => {
	const [activeTab, setActiveTab] = useState<"citas" | "facturacion" | "productos">("citas");
	const [citasView, setCitasView] = useState<"dias" | "semanas" | "meses">("dias");
	const [facturacionView, setFacturacionView] = useState<"semanal" | "mensual" | "trimestral" | "anual">("semanal");

	const { data: citas = [], isLoading: loadingCitas } = useGetAllCitasQuery();
	const { data: movRes, isLoading: loadingMov } = useListMovimientosFacturacionQuery({
		limit: 1000,
	});
	const movimientos = movRes?.rows ?? [];
	const { data: productos = [], isLoading: loadingProd } = useGetProductosQuery();

	// 1. Gráfica de Citas
	const chartDataCitas = useMemo(() => {
		if (!citas.length) return [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (citasView === "dias") {
			// Últimos 7 días
			const data = [];
			for (let i = 6; i >= 0; i--) {
				const d = new Date(today);
				d.setDate(today.getDate() - i);
				const dateStr = d.toISOString().slice(0, 10);
				const label = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
				
				const citasDia = citas.filter((c) => c.fecha_cita.startsWith(dateStr));
				const atendidas = citasDia.filter((c) => c.estado_cita === 3).length;
				const canceladas = citasDia.filter((c) => c.estado_cita === 2).length;
				const otras = citasDia.length - atendidas - canceladas;
				
				data.push({
					name: label,
					Total: citasDia.length,
					Atendidas: atendidas,
					Canceladas: canceladas,
					Pendientes: otras,
				});
			}
			return data;
		} else if (citasView === "semanas") {
			// Últimas 4 semanas
			const data = [];
			for (let i = 4; i >= 0; i--) {
				const start = new Date(today);
				start.setDate(today.getDate() - (i * 7 + today.getDay()));
				const end = new Date(start);
				end.setDate(start.getDate() + 6);

				const label = `Semana ${start.getDate()}/${start.getMonth() + 1}`;
				let total = 0, atendidas = 0, canceladas = 0, otras = 0;

				citas.forEach((c) => {
					const [y, m, d] = c.fecha_cita.split("T")[0].split("-").map(Number);
					const cDate = new Date(y, m - 1, d);
					if (cDate >= start && cDate <= end) {
						total++;
						if (c.estado_cita === 3) atendidas++;
						else if (c.estado_cita === 2) canceladas++;
						else otras++;
					}
				});
				data.push({ name: label, Total: total, Atendidas: atendidas, Canceladas: canceladas, Pendientes: otras });
			}
			return data;
		} else {
			// Últimos 6 meses
			const data = [];
			for (let i = 5; i >= 0; i--) {
				const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
				const label = start.toLocaleDateString("es-ES", { month: "short" });
				let total = 0, atendidas = 0, canceladas = 0, otras = 0;

				citas.forEach((c) => {
					const [y, mStr] = c.fecha_cita.split("T")[0].split("-");
					if (Number(y) === start.getFullYear() && Number(mStr) === start.getMonth() + 1) {
						total++;
						if (c.estado_cita === 3) atendidas++;
						else if (c.estado_cita === 2) canceladas++;
						else otras++;
					}
				});
				data.push({ name: label, Total: total, Atendidas: atendidas, Canceladas: canceladas, Pendientes: otras });
			}
			return data;
		}
	}, [citas, citasView]);

	// 2. Gráfica de Facturación
	const chartDataFacturacion = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (facturacionView === "semanal") {
			// Últimos 7 días
			const data = [];
			for (let i = 6; i >= 0; i--) {
				const d = new Date(today);
				d.setDate(today.getDate() - i);
				const dateStr = d.toISOString().slice(0, 10);
				const label = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
				
				const movsDia = movimientos.filter((m) => m.fecha.startsWith(dateStr));
				let ingresos = 0, egresos = 0;
				movsDia.forEach((m) => {
					if (m.tipo === "Ingreso") ingresos += Number(m.monto);
					else egresos += Number(m.monto);
				});
				data.push({ name: label, Ingresos: ingresos, Egresos: egresos, Balance: ingresos - egresos });
			}
			return data;
		} else if (facturacionView === "mensual") {
			// Últimas 4 semanas
			const data = [];
			for (let i = 3; i >= 0; i--) {
				const start = new Date(today);
				start.setDate(today.getDate() - (i * 7 + today.getDay()));
				const end = new Date(start);
				end.setDate(start.getDate() + 6);
				const label = `Semana ${start.getDate()}/${start.getMonth() + 1}`;
				
				let ingresos = 0, egresos = 0;
				movimientos.forEach((m) => {
					const [y, mth, dStr] = m.fecha.split("T")[0].split("-").map(Number);
					const cDate = new Date(y, mth - 1, dStr);
					if (cDate >= start && cDate <= end) {
						if (m.tipo === "Ingreso") ingresos += Number(m.monto);
						else egresos += Number(m.monto);
					}
				});
				data.push({ name: label, Ingresos: ingresos, Egresos: egresos, Balance: ingresos - egresos });
			}
			return data;
		} else if (facturacionView === "trimestral") {
			// Últimos 3 meses
			const data = [];
			for (let i = 2; i >= 0; i--) {
				const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
				const label = start.toLocaleDateString("es-ES", { month: "short" });
				let ingresos = 0, egresos = 0;
				movimientos.forEach((m) => {
					const [y, mStr] = m.fecha.split("T")[0].split("-");
					if (Number(y) === start.getFullYear() && Number(mStr) === start.getMonth() + 1) {
						if (m.tipo === "Ingreso") ingresos += Number(m.monto);
						else egresos += Number(m.monto);
					}
				});
				data.push({ name: label, Ingresos: ingresos, Egresos: egresos, Balance: ingresos - egresos });
			}
			return data;
		} else {
			// Anual: Últimos 12 meses
			const data = [];
			for (let i = 11; i >= 0; i--) {
				const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
				const label = start.toLocaleDateString("es-ES", { month: "short" });
				let ingresos = 0, egresos = 0;
				movimientos.forEach((m) => {
					const [y, mStr] = m.fecha.split("T")[0].split("-");
					if (Number(y) === start.getFullYear() && Number(mStr) === start.getMonth() + 1) {
						if (m.tipo === "Ingreso") ingresos += Number(m.monto);
						else egresos += Number(m.monto);
					}
				});
				data.push({ name: label, Ingresos: ingresos, Egresos: egresos, Balance: ingresos - egresos });
			}
			return data;
		}
	}, [movimientos, facturacionView]);

	// 3. Gráfica de Inventario / Consumo
	const chartDataProductos = useMemo(() => {
		return productos
			.filter((p) => p.activo === 1)
			.map((p) => ({
				name: p.nombre,
				Existencia: p.stock_base_total,
				Consumido: p.consumo_actual,
			}))
			.sort((a, b) => b.Consumido - a.Consumido)
			.slice(0, 10);
	}, [productos]);

	return (
		<div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm sm:p-5 mb-5 border border-slate-100">
			<div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
				<h3 className="font-headline text-base font-bold text-brand-900">
					Métricas y estadísticas
				</h3>

				<div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1 space-x-1 overflow-x-auto w-full sm:w-auto">
					<button
						onClick={() => setActiveTab("citas")}
						className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${
							activeTab === "citas"
								? "bg-white text-teal-800 shadow-sm border border-slate-200"
								: "text-slate-500 hover:text-brand-900"
						}`}
					>
						Gestión de citas
					</button>
					<button
						onClick={() => setActiveTab("facturacion")}
						className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${
							activeTab === "facturacion"
								? "bg-white text-teal-800 shadow-sm border border-slate-200"
								: "text-slate-500 hover:text-brand-900"
						}`}
					>
						Flujo de caja
					</button>
					<button
						onClick={() => setActiveTab("productos")}
						className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${
							activeTab === "productos"
								? "bg-white text-teal-800 shadow-sm border border-slate-200"
								: "text-slate-500 hover:text-brand-900"
						}`}
					>
						Inventario
					</button>
				</div>
			</div>

			<div className="w-full h-80 relative">
				{activeTab === "citas" && (
					<div className="w-full h-full flex flex-col">
						<div className="flex justify-end mb-2">
							<select
								value={citasView}
								onChange={(e) => setCitasView(e.target.value as any)}
								className="text-xs border border-slate-200 rounded-md py-1 px-2 focus:ring-teal-500"
							>
								<option value="dias">Estadística diaria (7 días)</option>
								<option value="semanas">Estadística semanal (1 mes)</option>
								<option value="meses">Estadística mensual (6 meses)</option>
							</select>
						</div>
						{loadingCitas ? (
							<div className="flex flex-1 items-center justify-center text-slate-400 text-sm">Cargando...</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={chartDataCitas} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
									<XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
									<YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
									<Tooltip 
										contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
										labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
									/>
									<Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
									<Line type="monotone" dataKey="Total" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
									<Line type="monotone" dataKey="Atendidas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
									<Line type="monotone" dataKey="Canceladas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				)}

				{activeTab === "facturacion" && (
					<div className="w-full h-full flex flex-col">
						<div className="flex justify-end mb-2">
							<select
								value={facturacionView}
								onChange={(e) => setFacturacionView(e.target.value as any)}
								className="text-xs border border-slate-200 rounded-md py-1 px-2 focus:ring-teal-500"
							>
								<option value="semanal">Flujo Semanal (Últimos 7 días)</option>
								<option value="mensual">Flujo Mensual (Últimas 4 semanas)</option>
								<option value="trimestral">Flujo Trimestral (Últimos 3 meses)</option>
								<option value="anual">Flujo Anual (Últimos 12 meses)</option>
							</select>
						</div>
						{loadingMov ? (
							<div className="flex flex-1 items-center justify-center text-slate-400 text-sm">Cargando...</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartDataFacturacion} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
									<XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
									<YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
									<Tooltip 
										contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
										formatter={(value: any) => [`$${Number(value).toFixed(2)}`, undefined]}
									/>
									<Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
									<Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
									<Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				)}

				{activeTab === "productos" && (
					<div className="w-full h-full flex flex-col">
						<div className="flex justify-between items-center mb-2">
							<span className="text-xs text-slate-500 font-medium">Existencia vs Consumo (Top 10 más consumidos)</span>
						</div>
						{loadingProd ? (
							<div className="flex flex-1 items-center justify-center text-slate-400 text-sm">Cargando...</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart layout="vertical" data={chartDataProductos} margin={{ top: 5, right: 30, left: 40, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
									<XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
									<YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} width={90} tickLine={false} axisLine={false} />
									<Tooltip 
										contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
									/>
									<Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
									<Bar dataKey="Existencia" fill="#0ea5e9" radius={[0, 4, 4, 0]} maxBarSize={20} />
									<Bar dataKey="Consumido" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default DashboardCharts;
