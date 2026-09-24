import { useEffect, useState } from "react";
import {
  Phone,
  MessageCircle,
  MessageSquare,
  Pencil,
  MapPin,
  Home,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Camera,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { PhotoViewer } from "@/components/PhotoViewer";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Modal } from "@/components/Modal";
import { FullSpinner, EmptyState, Spinner } from "@/components/Spinner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { formatPhone } from "@/lib/phone";
import { formatDateTime, formatDate, daysOverdue } from "@/lib/dates";
import { statusConfig } from "@/lib/statusConfig";
import { showToast } from "@/components/Toast";
import type { Contact, Interaction, Vacancy } from "@/types/database";

export function ContactDetail() {
  const { params, navigate, goBack } = useApp();
  const { user } = useAuth();
  const contactId = params.id;

  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoViewer, setPhotoViewer] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editWhatsApp, setEditWhatsApp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contactId || !user) return;
    setLoading(true);
    Promise.all([
      supabase.from("contacts").select("*").eq("id", contactId).maybeSingle(),
      supabase
        .from("interactions")
        .select("*")
        .eq("contact_id", contactId)
        .order("interaction_date", { ascending: false }),
      supabase
        .from("vacancies")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false }),
    ]).then(([c, i, v]) => {
      if (c.data) {
        setContact(c.data as Contact);
        setEditName(c.data.full_name);
        setEditPhone(c.data.phone_number);
        setEditNotes(c.data.notes ?? "");
        setEditWhatsApp(c.data.whatsapp_available);
      }
      setInteractions((i.data ?? []) as Interaction[]);
      setVacancies((v.data ?? []) as Vacancy[]);
      setLoading(false);
    });
  }, [contactId, user]);

  if (loading) return <div className="min-h-screen bg-slate-50"><FullSpinner label="Loading contact..." /></div>;
  if (!contact) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="Contact" />
        <EmptyState icon={XCircle} title="Contact not found" subtitle="This contact may have been deleted." />
      </div>
    );
  }

  const statusInfo = statusConfig[contact.current_status as keyof typeof statusConfig];
  const overdueDays = contact.next_follow_up_at ? daysOverdue(contact.next_follow_up_at) : 0;

  const callContact = () => {
    window.location.href = `tel:${contact.phone_number}`;
  };

  const messageContact = () => {
    if (contact.whatsapp_available) {
      window.open(`https://wa.me/${contact.normalized_phone}`, "_blank");
    } else {
      window.location.href = `sms:${formatPhone(contact.phone_number).replace(/\s/g, "")}`;
    }
  };

  const handleSaveEdit = async () => {
    if (!contact || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .update({
          full_name: editName.trim(),
          phone_number: editPhone.trim(),
          notes: editNotes.trim() || null,
          whatsapp_available: editWhatsApp,
        })
        .eq("id", contact.id)
        .select()
        .single();
      if (error) throw error;
      setContact(data as Contact);
      setEditOpen(false);
      showToast("Contact updated", "success");
    } catch {
      showToast("Failed to update contact", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header
        title={contact.full_name}
        showBack
        rightAction={
          <button
            onClick={() => setEditOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <Pencil className="w-5 h-5" />
          </button>
        }
      />

      {/* Profile section */}
      <div className="bg-gradient-to-br from-brand-700 to-ocean-800 px-5 py-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar
              contact={contact}
              size="xl"
              onClick={() => contact.photo_url && setPhotoViewer(true)}
            />
            {user && (
              <div className="absolute -bottom-1 -right-1">
                <PhotoUploader
                  contactId={contact.id}
                  photoUrl={contact.photo_url}
                  userId={user.id}
                  onUploaded={(url) => setContact({ ...contact, photo_url: url })}
                  size="sm"
                  className="w-7 h-7"
                />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-xl font-bold text-white truncate">{contact.full_name}</h2>
            <p className="text-sm text-brand-200 truncate">
              {formatPhone(contact.phone_number)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {statusInfo && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                  {statusInfo.label}
                </span>
              )}
              {contact.whatsapp_available && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={callContact}
            className="flex-1 bg-white rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Phone className="w-5 h-5 text-brand-700" />
            <span className="text-sm font-semibold text-slate-900">Call</span>
          </button>
          <button
            onClick={messageContact}
            className="flex-1 bg-white rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {contact.whatsapp_available ? (
              <>
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-slate-900">WhatsApp</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5 text-ocean-600" />
                <span className="text-sm font-semibold text-slate-900">SMS</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status section */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">
            Contact Status
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatusItem
              label="Last Contacted"
              value={formatDate(contact.last_contacted_at)}
            />
            <StatusItem
              label="Next Follow-up"
              value={formatDate(contact.next_follow_up_at)}
              highlight={overdueDays > 0 ? "overdue" : undefined}
              subtext={
                overdueDays > 0
                  ? `${overdueDays} days overdue`
                  : undefined
              }
            />
            <StatusItem
              label="Times Contacted"
              value={String(contact.times_contacted)}
            />
            <StatusItem
              label="Vacancy Status"
              value={
                contact.current_status === "has_vacancy"
                  ? "Available"
                  : contact.current_status === "no_vacancy"
                    ? "None"
                    : "Unknown"
              }
              highlight={
                contact.current_status === "has_vacancy"
                  ? "success"
                  : contact.current_status === "no_vacancy"
                    ? "danger"
                    : undefined
              }
            />
          </div>
          {contact.notes && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Record result button */}
        <button
          onClick={() => navigate("what-happened", { id: contact.id })}
          className="w-full bg-gradient-to-r from-brand-600 to-ocean-700 text-white rounded-2xl py-4 font-semibold text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Call & Record Result
        </button>

        {/* Active vacancy */}
        {vacancies.filter((v) => v.active).length > 0 && (
          <div className="bg-success-50 rounded-2xl border border-success-500/30 p-4">
            <h3 className="text-xs font-semibold text-success-700 uppercase mb-3 flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> Active Vacancy
            </h3>
            {vacancies
              .filter((v) => v.active)
              .slice(0, 1)
              .map((v) => (
                <div key={v.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-success-800">
                      {v.room_type}
                    </span>
                    {v.price && (
                      <span className="text-sm font-bold text-success-700">
                        UGX {v.price.toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-success-700">
                    {v.is_self_contained && (
                      <span className="bg-success-500/20 px-2 py-0.5 rounded-full">
                        Self-contained
                      </span>
                    )}
                    {v.location && (
                      <span className="bg-success-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {v.location}
                      </span>
                    )}
                    <span className="bg-success-500/20 px-2 py-0.5 rounded-full">
                      {v.number_available} available
                    </span>
                  </div>
                  {v.details && (
                    <p className="text-xs text-success-600 mt-1">{v.details}</p>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* History timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> Contact History
          </h3>
          {interactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No interactions recorded yet. Call and record a result to start building history.
            </p>
          ) : (
            <div className="space-y-0">
              {interactions.map((interaction, idx) => {
                const relatedVacancy = vacancies.find(
                  (v) => v.interaction_id === interaction.id
                );
                const resultIcon =
                  interaction.result === "has_vacancy"
                    ? CheckCircle2
                    : interaction.result === "call_later"
                      ? Clock
                      : XCircle;
                const ResultIcon = resultIcon;
                const resultColor =
                  interaction.result === "has_vacancy"
                    ? "text-success-600"
                    : interaction.result === "call_later"
                      ? "text-warning-600"
                      : "text-danger-600";

                return (
                  <div key={interaction.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 ${resultColor}`}>
                        <ResultIcon className="w-4 h-4" />
                      </div>
                      {idx < interactions.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-200 min-h-[40px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <p className="text-xs text-slate-400">
                        {formatDateTime(interaction.interaction_date)}
                      </p>
                      <p className={`text-sm font-semibold mt-0.5 ${resultColor}`}>
                        {interaction.result === "has_vacancy"
                          ? "Has Vacancy"
                          : interaction.result === "call_later"
                            ? "Call Later"
                            : "No Vacancy"}
                      </p>
                      {relatedVacancy && (
                        <div className="mt-2 bg-slate-50 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700">
                              {relatedVacancy.room_type}
                            </span>
                            {relatedVacancy.price && (
                              <span className="font-semibold text-slate-700">
                                UGX {relatedVacancy.price.toLocaleString()}/mo
                              </span>
                            )}
                          </div>
                          {relatedVacancy.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {relatedVacancy.location}
                            </p>
                          )}
                          {relatedVacancy.is_self_contained && (
                            <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                              Self-contained
                            </span>
                          )}
                        </div>
                      )}
                      {interaction.notes && (
                        <p className="text-xs text-slate-500 mt-1">
                          {interaction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Created date */}
        <p className="text-center text-xs text-slate-400">
          Added {formatDate(contact.created_at)}
        </p>
      </div>

      {/* Photo viewer */}
      {photoViewer && contact.photo_url && (
        <PhotoViewer
          photoUrl={contact.photo_url}
          name={contact.full_name}
          onClose={() => setPhotoViewer(false)}
        />
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Contact">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">WhatsApp</label>
            <button
              onClick={() => setEditWhatsApp(!editWhatsApp)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                editWhatsApp
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {editWhatsApp ? "WhatsApp number" : "Not a WhatsApp number"}
              <div className={`w-10 h-6 rounded-full transition-all relative ${editWhatsApp ? "bg-green-500" : "bg-slate-300"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editWhatsApp ? "left-4" : "left-0.5"}`} />
              </div>
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm resize-none"
            />
          </div>
          <button
            onClick={handleSaveEdit}
            disabled={saving || !editName.trim()}
            className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            {saving ? <Spinner size={16} /> : "Save Changes"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function StatusItem({
  label,
  value,
  highlight,
  subtext,
}: {
  label: string;
  value: string;
  highlight?: "overdue" | "success" | "danger";
  subtext?: string;
}) {
  const color =
    highlight === "overdue"
      ? "text-danger-600"
      : highlight === "success"
        ? "text-success-600"
        : highlight === "danger"
          ? "text-danger-600"
          : "text-slate-900";
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
      {subtext && <p className={`text-xs ${color}`}>{subtext}</p>}
    </div>
  );
}
