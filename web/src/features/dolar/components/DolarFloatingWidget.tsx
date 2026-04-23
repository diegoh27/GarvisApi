import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGetDolarOficialQuery } from "../dolarApi";
import { convertUSDToVES, formatVES, formatFechaHoraLocal, useAuth } from "../../../shared";
import { Calculator, RefreshCw } from "lucide-react";

const DRAG_THRESHOLD_PX = 6;

const formatFechaCorta = (fechaString: string): string =>
	fechaString ? formatFechaHoraLocal(fechaString) : "";

/**
 * Burbuja fija BCV + calculadora: arrastrar la píldora; clic sin movimiento abre el popover.
 */
const DolarFloatingWidget = () => {
	const { user } = useAuth();
	const { data, isLoading, error, refetch } = useGetDolarOficialQuery();
	const [montoUSD, setMontoUSD] = useState("");
	const [calcOpen, setCalcOpen] = useState(false);

	const shellRef = useRef<HTMLDivElement>(null);
	const pillRef = useRef<HTMLDivElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);
	const dragState = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		origLeft: number;
		origTop: number;
	} | null>(null);
	const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
	const [dragging, setDragging] = useState(false);
	const movedDuringDrag = useRef(false);

	useLayoutEffect(() => {
		const el = shellRef.current;
		if (!el || pos !== null) return;
		const r = el.getBoundingClientRect();
		setPos({ left: r.left, top: r.top });
	}, [pos]);

	const clampToViewport = useCallback((left: number, top: number) => {
		const el = shellRef.current;
		const w = el?.offsetWidth ?? 220;
		const h = el?.offsetHeight ?? 48;
		const maxL = Math.max(8, window.innerWidth - w - 8);
		const maxT = Math.max(8, window.innerHeight - h - 8);
		return {
			left: Math.max(8, Math.min(left, maxL)),
			top: Math.max(8, Math.min(top, maxT)),
		};
	}, []);

	useEffect(() => {
		const onResize = () => {
			setPos((p) => (p ? clampToViewport(p.left, p.top) : p));
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [clampToViewport]);

	useEffect(() => {
		if (!calcOpen) return;
		const onDoc = (e: MouseEvent) => {
			const t = e.target as Node;
			if (shellRef.current?.contains(t)) return;
			setCalcOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [calcOpen]);

	const onPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return;
		const el = shellRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		dragState.current = {
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			origLeft: r.left,
			origTop: r.top,
		};
		movedDuringDrag.current = false;
		setDragging(true);
		pillRef.current?.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e: React.PointerEvent) => {
		if (!dragState.current) return;
		const dx = e.clientX - dragState.current.startX;
		const dy = e.clientY - dragState.current.startY;
		if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
			movedDuringDrag.current = true;
		}
		const next = clampToViewport(dragState.current.origLeft + dx, dragState.current.origTop + dy);
		setPos(next);
	};

	const onPointerUp = (e: React.PointerEvent) => {
		const ds = dragState.current;
		if (!ds || e.pointerId !== ds.pointerId) return;
		try {
			pillRef.current?.releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		dragState.current = null;
		setDragging(false);
		if (!movedDuringDrag.current) {
			setCalcOpen((v) => !v);
		}
		movedDuringDrag.current = false;
	};

	if (user?.rol === "paciente") {
		return null;
	}

	const montoNumerico = parseFloat(montoUSD) || 0;
	const montoVES =
		data && montoNumerico > 0 ? convertUSDToVES(montoNumerico, data.promedio) : 0;

	const tasaText =
		data &&
		`Bs. ${data.promedio.toLocaleString("es-VE", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;

	const stylePos: React.CSSProperties =
		pos != null
			? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" }
			: { left: "1.5rem", bottom: "1.5rem", top: "auto", right: "auto" };

	return (
		<div ref={shellRef} className="pointer-events-auto fixed z-[60] inline-block" style={stylePos}>
			<div className="relative">
				<div
					ref={pillRef}
					className={`flex touch-none select-none items-center gap-2.5 rounded-full border border-slate-100 bg-white py-2 pl-2 pr-4 shadow-2xl ${
						dragging ? "cursor-grabbing" : "cursor-grab"
					}`}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
				>
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white">
						<Calculator className="h-5 w-5" aria-hidden />
					</div>
					<div className="min-w-0 pr-0.5">
						{isLoading ? (
							<p className="text-base font-bold text-slate-400">BCV…</p>
						) : error || !data ? (
							<p className="text-base font-bold text-amber-700">BCV: —</p>
						) : (
							<p className="whitespace-nowrap text-base font-bold tabular-nums text-brand-900">
								BCV: {tasaText}
							</p>
						)}
					</div>
				</div>

				{calcOpen && (
				<div
					ref={popoverRef}
					className="absolute bottom-full left-0 z-[70] mb-3 w-[min(calc(100vw-2rem),18rem)] rounded-2xl border border-slate-100 bg-white p-4 shadow-xl"
					onPointerDown={(e) => e.stopPropagation()}
				>
					<div className="mb-3 flex items-center justify-between gap-2">
						<p className="text-sm font-semibold text-brand-900">Calculadora USD → Bs.</p>
						<button
							type="button"
							onClick={() => void refetch()}
							className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-teal-800 hover:bg-slate-50"
							title="Actualizar tasa"
						>
							<RefreshCw className="h-3 w-3" />
							Actualizar
						</button>
					</div>
					{data?.fechaActualizacion && (
						<p className="mb-2 text-[10px] text-slate-500">
							Act. {formatFechaCorta(data.fechaActualizacion)}
						</p>
					)}
					<div className="flex flex-wrap items-center gap-2">
						<input
							type="number"
							step="0.01"
							min="0"
							placeholder="0.00"
							value={montoUSD}
							onChange={(e) => setMontoUSD(e.target.value)}
							className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-base font-semibold text-brand-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
						/>
						<span className="text-sm font-semibold text-slate-600">USD</span>
						<span className="text-sm text-slate-400">=</span>
						<span className="min-w-[100px] rounded-lg bg-slate-50 px-2 py-1.5 text-base font-bold text-brand-900">
							{montoNumerico > 0 && data ? formatVES(montoVES) : "Bs. 0,00"}
						</span>
						{montoUSD ? (
							<button
								type="button"
								onClick={() => setMontoUSD("")}
								className="text-sm font-medium text-teal-700 hover:text-teal-900"
							>
								Limpiar
							</button>
						) : null}
					</div>
				</div>
				)}
			</div>
		</div>
	);
};

export default DolarFloatingWidget;
