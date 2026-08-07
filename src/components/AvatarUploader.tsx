import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import CropDialog from "./CropDialog";

interface Props {
  currentUrl?: string;
  name: string;
  onUploaded: (url: string) => void;
}

export default function AvatarUploader({ currentUrl, name, onUploaded }: Props) {
  const { user } = useAuth();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file || !user) return;
    setError(null);
    const url = URL.createObjectURL(file);
    setCropUrl(url);
  };

  const applyCropped = async (dataUrl: string) => {
    if (!user) return;
    setCropUrl(null);
    setBusy(true);
    setError(null);
    try {
      if (dataUrl.length > 300_000) {
        throw new Error("Image is still too large after cropping. Try a smaller photo.");
      }
      onUploaded(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar src={currentUrl} name={name} size={72} />
      <div>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choose profile picture from gallery"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          aria-label="Take a profile photo with the camera"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="btn-primary disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            {busy ? "Uploading…" : "Take photo"}
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={busy}
            className="btn-secondary disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> Upload
          </button>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Camera className="h-3.5 w-3.5" /> Crop and resize to 256px, saved in the database.
        </p>
        {error && (
          <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {cropUrl && (
        <CropDialog
          imageUrl={cropUrl}
          onCancel={() => setCropUrl(null)}
          onDone={applyCropped}
        />
      )}
    </div>
  );
}
