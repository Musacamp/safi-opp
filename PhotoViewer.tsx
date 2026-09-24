import { X } from "lucide-react";
import { useEffect } from "react";

interface PhotoViewerProps {
  photoUrl: string;
  name: string;
  onClose: () => void;
}

export function PhotoViewer({ photoUrl, name, onClose }: PhotoViewerProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <div className="flex flex-col items-center gap-4 px-4 max-w-full max-h-full">
        <img
          src={photoUrl}
          alt={name}
          className="max-w-full max-h-[80vh] rounded-2xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <p className="text-white font-medium text-sm">{name}</p>
      </div>
    </div>
  );
}
