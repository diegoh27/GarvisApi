import fs from "fs";
const p = "c:/Users/USER/Desktop/www/GarvisApi/web/src/features/calendario/components/CalendarGrid.tsx";
let s = fs.readFileSync(p, "utf8");
if (!s.includes("dragPreview")) {
  s = s.replace(
    `	const [dragging, setDragging] = useState(false);
	const dragStartRef = useRef<{ dayIdx: number; slotIdx: number } | null>(null);`,
    `	const [dragging, setDragging] = useState(false);
	const [dragPreview, setDragPreview] = useState<{
		dayIdx: number;
		minSlot: number;
		maxSlot: number;
	} | null>(null);
	const dragStartRef = useRef<{ dayIdx: number; slotIdx: number } | null>(null);`
  );
}
fs.writeFileSync(p, s);
console.log("step1 ok");
