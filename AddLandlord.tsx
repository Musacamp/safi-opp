import { useState } from "react";
import { UserPlus, Camera, Loader2, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { showToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { normalizePhone, isValidPhone, formatPhone } from "@/lib/phone";
import { uploadContactPhoto } from "@/lib/storage";
import { checkDuplicatePhone } from "@/lib/contacts";
import type { Contact } from "@/types/database";

export function AddLandlord() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<Contact | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      showToast("Please enter a name", "error");
      return;
    }
    if (!isValidPhone(phone)) {
      showToast("Please enter a valid phone number", "error");
      return;
    }

    // Check for duplicates
    const existing = await checkDuplicatePhone(user.id, phone);
    if (existing) {
      setDuplicate(existing);
      return;
    }

    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadContactPhoto(user.id, photoFile);
      }

      const normalized = normalizePhone(phone);
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          full_name: name.trim(),
          phone_number: phone.trim(),
          normalized_phone: normalized,
          photo_url: photoUrl,
          whatsapp_available: whatsapp,
          notes: notes.trim() || null,
          current_status: "new",
        })
        .select()
        .single();

      if (error) throw error;

      showToast("Contact saved successfully", "success");
      navigate("contact-detail", { id: data.id });
    } catch {
      showToast("Could not save contact. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Add Landlord" />

      <div className="px-4 py-4">
        {/* Photo */}
        <div className="flex flex-col items-center mb-6">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-600 to-ocean-700 border-4 border-white shadow-lg">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-200">
              <Camera className="w-4 h-4 text-slate-600" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </label>
          <p className="text-xs text-slate-400 mt-2">Tap to add photo (optional)</p>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Full Name <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Mukasa"
              className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Phone Number <span className="text-danger-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+256 7XX XXX XXX or 07XXXXXXXX"
              className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
            />
            {phone && isValidPhone(phone) && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-success-500" />
                {formatPhone(normalizePhone(phone))}
              </p>
            )}
          </div>

          {/* WhatsApp toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              WhatsApp Number
            </label>
            <button
              onClick={() => setWhatsapp(!whatsapp)}
              className={`w-full px-3 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                whatsapp
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {whatsapp ? "Yes, this number has WhatsApp" : "No WhatsApp"}
              <div className={`w-10 h-6 rounded-full transition-all relative ${whatsapp ? "bg-green-500" : "bg-slate-300"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${whatsapp ? "left-4" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any initial notes about this landlord..."
              rows={3}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm resize-none"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !phone.trim()}
            className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Save Contact
              </>
            )}
          </button>
        </div>
      </div>

      {/* Duplicate found modal */}
      <Modal
        open={!!duplicate}
        onClose={() => setDuplicate(null)}
        title="Contact Already Exists"
        size="sm"
      >
        {duplicate && (
          <div>
            <p className="text-sm text-slate-600 mb-3">
              A contact with this phone number already exists:
            </p>
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="font-semibold text-slate-900">{duplicate.full_name}</p>
              <p className="text-sm text-slate-500">{formatPhone(duplicate.phone_number)}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setDuplicate(null);
                  navigate("contact-detail", { id: duplicate.id });
                }}
                className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium"
              >
                Open Existing Contact
              </button>
              <button
                onClick={() => {
                  setDuplicate(null);
                  showToast(
                    "Update the existing contact from its detail page",
                    "info"
                  );
                  navigate("contact-detail", { id: duplicate.id });
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
              >
                Update Information
              </button>
              <button
                onClick={() => setDuplicate(null)}
                className="w-full py-2.5 rounded-xl text-slate-400 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
