import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadContactPhoto } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/Toast";

interface PhotoUploaderProps {
  contactId: string;
  photoUrl: string | null;
  userId: string;
  onUploaded: (url: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-7 h-7",
};

export function PhotoUploader({
  contactId,
  photoUrl,
  userId,
  onUploaded,
  size = "sm",
  className = "",
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadContactPhoto(userId, file);
      const { error } = await supabase
        .from("contacts")
        .update({ photo_url: url })
        .eq("id", contactId);
      if (error) throw error;
      onUploaded(url);
      showToast("Photo updated", "success");
    } catch {
      showToast("Could not upload photo. Please try again.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        inputRef.current?.click();
      }}
      disabled={uploading}
      className={`${className} inline-flex items-center justify-center rounded-full bg-white/90 shadow border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-all`}
      title="Change photo"
    >
      {uploading ? (
        <Loader2 className={`${sizeMap[size]} animate-spin`} />
      ) : (
        <Camera className={`${sizeMap[size]}`} />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
