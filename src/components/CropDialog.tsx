import { useEffect, useRef, useState } from "react";
import { Check, X, ZoomIn } from "lucide-react";

interface Props {
  imageUrl: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}

const VIEWPORT = 280;

export default function CropDialog({ imageUrl, onCancel, onDone }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const coverScale = natural
    ? Math.max(VIEWPORT / natural.w, VIEWPORT / natural.h) * scale
    : 1;
  const displayW = natural ? natural.w * coverScale : 0;
  const displayH = natural ? natural.h * coverScale : 0;

  const clampOffset = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VIEWPORT - displayW, x)),
    y: Math.min(0, Math.max(VIEWPORT - displayH, y)),
  });

  useEffect(() => {
    if (!natural || scale <= 1) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    setOffset(clampOffset(offset.x, offset.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  const crop = () => {
    const img = imgRef.current;
    if (!img || !natural) return;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const srcX = (-offset.x / displayW) * natural.w;
    const srcY = (-offset.y / displayH) * natural.h;
    const srcSize = (VIEWPORT / displayW) * natural.w;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 256, 256);
    onDone(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop photo"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div className="card relative w-full max-w-sm p-5 shadow-xl animate-fade-in">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Crop photo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Drag to position and zoom to fit. The avatar is a square.
        </p>

        <div
          className="mx-auto mt-4 h-[280px] w-[280px] max-w-full touch-none select-none overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy));
          }}
          onPointerUp={() => {
            dragRef.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            setDragging(false);
          }}
          role="application"
          aria-label="Drag to position the photo"
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Photo to crop"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            className={`h-full w-full max-w-none object-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{
              width: displayW || "100%",
              height: displayH || "100%",
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-emerald-600"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            <X className="h-4 w-4" /> Cancel
          </button>
          <button type="button" onClick={crop} className="btn-primary">
            <Check className="h-4 w-4" /> Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
