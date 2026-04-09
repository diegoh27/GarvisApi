import fs from "fs";
const p = "c:/Users/USER/Desktop/www/GarvisApi/web/src/features/calendario/components/CalendarGrid.tsx";
let s = fs.readFileSync(p, "utf8");
const fromCompute = "\tconst computeRangeFromRect = useCallback(";
const toEnd = "\t\t[dayKeys, timeOptions, isSlotOccupied, minFecha],\n\t);";
const idxStart = s.indexOf(fromCompute);
if (idxStart === -1) throw new Error("start not found");
const idxEnd = s.indexOf(toEnd, idxStart);
if (idxEnd === -1) throw new Error("end not found");
const newCompute = `\tconst computeRangeSingleDay = useCallback(
\t\t(
\t\t\tdayIdx: number,
\t\t\ts0: number,
\t\t\ts1: number,
\t\t): { fechaDesde: string; fechaHasta: string; horaInicio: string; horaFin: string } | null => {
\t\t\tconst dk = dayKeys[dayIdx];
\t\t\tif (!dk || dk < minFecha) return null;
\t\t\tconst minS = Math.min(s0, s1);
\t\t\tconst maxS = Math.max(s0, s1);
\t\t\tconst keys: string[] = [];
\t\t\tfor (let s = minS; s <= maxS; s += 1) {
\t\t\t\tconst hv = timeOptions[s]?.value;
\t\t\t\tif (!hv) continue;
\t\t\t\tif (isSlotOccupied(dk, hv)) continue;
\t\t\t\tkeys.push(cellKey(dk, hv));
\t\t\t}
\t\t\tif (keys.length === 0) return null;

\t\t\tlet minT = Infinity;
\t\t\tlet maxT = -Infinity;
\t\t\tfor (const k of keys) {
\t\t\t\tconst hh = k.split("|")[1]!;
\t\t\t\tconst t = parseTimeToMinutes(hh);
\t\t\t\tminT = Math.min(minT, t);
\t\t\t\tmaxT = Math.max(maxT, t);
\t\t\t}
\t\t\tconst horaInicio = \`\${String(Math.floor(minT / 60)).padStart(2, "0")}:\${String(minT % 60).padStart(2, "0")}:00\`;
\t\t\tconst endSlotMin = maxT + 20;
\t\t\tconst horaFin = \`\${String(Math.floor(endSlotMin / 60)).padStart(2, "0")}:\${String(endSlotMin % 60).padStart(2, "0")}:00\`;
\t\t\treturn { fechaDesde: dk, fechaHasta: dk, horaInicio, horaFin };
\t\t},
\t\t[dayKeys, timeOptions, isSlotOccupied, minFecha],
\t);`;
s = s.slice(0, idxStart) + newCompute + s.slice(idxEnd + toEnd.length);
fs.writeFileSync(p, s);
console.log("p2 ok");
