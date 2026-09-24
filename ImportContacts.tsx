import { useRef, useState } from "react";
import {
  Download,
  Check,
  Users,
  AlertCircle,
  Camera,
  Loader2,
  X,
  User as UserIcon,
  Phone as PhoneIcon,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Spinner } from "@/components/Spinner";
import { Modal } from "@/components/Modal";
import { showToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { normalizePhone, isValidPhone, formatPhone } from "@/lib/phone";
import { checkDuplicatePhone } from "@/lib/contacts";
import { uploadContactPhoto } from "@/lib/storage";
import type { Contact } from "@/types/database";

type Stage = "intro" | "picking" | "confirm" | "saving" | "done";

interface PickedContact {
  name: string | string[];
  tel: string | string[];
}

interface ImportedContact {
  name: string;
  phone: string;
  photoUrl: string | null;
}

function firstVal<T>(val: T | T[] | undefined): T | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val[0];
  return val;
}

export function ImportContacts() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [stage, setStage] = useState<Stage>("intro");
  const [supported] = useState<boolean>("contacts" in navigator);
  const [pickedName, setPickedName] = useState("");
  const [pickedPhone, setPickedPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [whatsappAvailable, setWhatsappAvailable] = useState(false);
  const [duplicate, setDuplicate] = useState<Contact | null>(null);
  const [imported, setImported] = useState<ImportedContact | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSave =
    pickedName.trim().length > 0 &&
    isValidPhone(pickedPhone) &&
    !!photoFile;

  const handlePickContact = async () => {
    if (!user) return;
    setStage("picking");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const navigatorAny = navigator as any;

      // Only request properties supported by the Contact Picker API.
      // "photo" is NOT a valid Contact Picker property on most browsers —
      // we handle the profile photo separately via gallery file picker.
      const props = ["name", "tel"];

      const contacts = (await navigatorAny.contacts.select(props, {
        multiple: true,
      })) as PickedContact[];

      if (!contacts || contacts.length === 0) {
        setStage("intro");
        showToast("No contacts selected", "info");
        return;
      }

      // Take the first selected contact
      const first = contacts[0];
      const name = (firstVal(first.name) ?? "").trim();
      const phone = (firstVal(first.tel) ?? "").trim();

      if (!name && !phone) {
        setStage("intro");
        showToast("Could not read contact details", "error");
        return;
      }

      setPickedName(name);
      setPickedPhone(phone);
      setPhotoFile(null);
      setPhotoPreview(null);
      setWhatsappAvailable(false);
      setDuplicate(null);
      setStage("confirm");
    } catch (err) {
      setStage("intro");
      showToast(
        err instanceof Error ? err.message : "Failed to pick contact",
        "error"
      );
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !canSave) return;

    const normalized = normalizePhone(pickedPhone);

    // Check for duplicates before saving
    const existing = await checkDuplicatePhone(user.id, pickedPhone);
    if (existing) {
      setDuplicate(existing);
      return;
    }

    setStage("saving");

    try {
      // Upload photo to Supabase Storage
      let photoUrl: string | null = null;
      try {
        photoUrl = await uploadContactPhoto(user.id, photoFile!);
      } catch {
        showToast("Profile photo could not be uploaded. Please try again.", "error");
        setStage("confirm");
        return;
      }

      // Insert contact into Supabase
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          full_name: pickedName.trim(),
          phone_number: pickedPhone.trim(),
          normalized_phone: normalized,
          photo_url: photoUrl,
          whatsapp_available: whatsappAvailable,
          current_status: "new",
        })
        .select()
        .single();

      if (error) {
        showToast("Contact could not be saved. Please check your connection and try again.", "error");
        setStage("confirm");
        return;
      }

      setImported({
        name: pickedName.trim(),
        phone: pickedPhone.trim(),
        photoUrl,
      });
      setStage("done");
      showToast("Contact saved successfully", "success");
    } catch {
      showToast("Contact could not be saved. Please check your connection and try again.", "error");
      setStage("confirm");
    }
  };

  const reset = () => {
    setStage("intro");
    setPickedName("");
    setPickedPhone("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setDuplicate(null);
    setImported(null);
  };

  // ── Intro screen ──
  if (stage === "intro") {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Header title="Import Contacts" />
        <div className="px-4 py-6">
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
              <Download className="w-10 h-10 text-brand-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Import from Phone Contacts
            </h2>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
              Select a contact from your phone's address book. You'll then
              add a profile photo and confirm before saving.
            </p>

            {supported ? (
              <button
                onClick={handlePickContact}
                className="w-full max-w-xs py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Select Contact
              </button>
            ) : (
              <div className="w-full max-w-xs space-y-3">
                <div className="bg-warning-50 rounded-xl p-4 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-warning-700">
                      Contact import is not supported on this browser. Please
                      use Add Landlord or open Safi OPP in a supported mobile
                      browser like Chrome on Android.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("add-landlord")}
                  className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  Add Landlord Manually
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Picking (spinner) ──
  if (stage === "picking") {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Header title="Import Contacts" />
        <div className="flex flex-col items-center py-12">
          <Spinner size={32} />
          <p className="text-sm text-slate-500 mt-4">Opening contact picker...</p>
        </div>
      </div>
    );
  }

  // ── Saving (spinner) ──
  if (stage === "saving") {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Header title="Import Contacts" />
        <div className="flex flex-col items-center py-12">
          <Spinner size={32} />
          <p className="text-sm text-slate-500 mt-4">Saving contact...</p>
        </div>
      </div>
    );
  }

  // ── Done screen ──
  if (stage === "done" && imported) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Header title="Import Contacts" />
        <div className="px-4 py-6">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-success-100 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Contact Saved</h2>
            <p className="text-sm text-slate-500 mb-6">
              {imported.name} has been added to your landlords.
            </p>

            {/* Contact preview card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 w-full max-w-xs mb-6">
              <div className="flex items-center gap-3">
                {imported.photoUrl ? (
                  <img
                    src={imported.photoUrl}
                    alt={imported.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-600 to-ocean-700 flex items-center justify-center text-white font-semibold">
                    {imported.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{imported.name}</p>
                  <p className="text-xs text-slate-500">{formatPhone(normalizePhone(imported.phone))}</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-2">
              <button
                onClick={() => navigate("contacts")}
                className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold"
              >
                View All Contacts
              </button>
              <button
                onClick={reset}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
              >
                Import Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirm screen (main flow) ──
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Confirm Import" subtitle="Review and add profile photo" />

      <div className="px-4 py-5">
        {/* Profile photo section */}
        <div className="flex flex-col items-center mb-6">
          <label className="relative cursor-pointer">
            <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-600 to-ocean-700 border-4 border-white shadow-lg">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-200">
              <Camera className="w-5 h-5 text-slate-600" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </label>
          <p className="text-xs text-slate-400 mt-3">
            {photoFile ? "Photo selected — tap to replace" : "A profile photo is required"}
          </p>
        </div>

        {/* Contact details */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={pickedName}
                onChange={(e) => setPickedName(e.target.value)}
                placeholder="Contact name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={pickedPhone}
                onChange={(e) => setPickedPhone(e.target.value)}
                placeholder="+256 7XX XXX XXX"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
              />
            </div>
            {pickedPhone && isValidPhone(pickedPhone) && (
              <p className="text-xs text-success-600 mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {formatPhone(normalizePhone(pickedPhone))}
              </p>
            )}
          </div>

          {/* WhatsApp toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              WhatsApp Number
            </label>
            <button
              onClick={() => setWhatsappAvailable(!whatsappAvailable)}
              className={`w-full px-3 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                whatsappAvailable
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {whatsappAvailable ? "Yes, this number has WhatsApp" : "Not a WhatsApp number"}
              <div className={`w-10 h-6 rounded-full transition-all relative ${whatsappAvailable ? "bg-green-500" : "bg-slate-300"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${whatsappAvailable ? "left-4" : "left-0.5"}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Validation checklist */}
        <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5">
          <ChecklistItem done={pickedName.trim().length > 0} label="Name entered" />
          <ChecklistItem done={isValidPhone(pickedPhone)} label="Valid phone number" />
          <ChecklistItem done={!!photoFile} label="Profile photo selected" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Save Contact
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
            <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center gap-3">
              {duplicate.photo_url ? (
                <img
                  src={duplicate.photo_url}
                  alt={duplicate.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-600 to-ocean-700 flex items-center justify-center text-white font-semibold">
                  {duplicate.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{duplicate.full_name}</p>
                <p className="text-sm text-slate-500">{formatPhone(duplicate.phone_number)}</p>
              </div>
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
                  navigate("contact-detail", { id: duplicate.id });
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
              >
                Update Existing Contact
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

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          done ? "bg-success-500" : "bg-slate-300"
        }`}
      >
        {done ? (
          <Check className="w-3 h-3 text-white" />
        ) : (
          <X className="w-3 h-3 text-white" />
        )}
      </div>
      <span className={`text-xs ${done ? "text-slate-700" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}
