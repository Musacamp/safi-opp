import { useEffect, useState } from "react";
import { Home, MapPin, Phone, MessageCircle, PartyPopper } from "lucide-react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { FullSpinner, EmptyState } from "@/components/Spinner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { startOfDay, endOfDay, formatTime, formatDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import type { Contact, Vacancy } from "@/types/database";

interface VacancyWithContact extends Vacancy {
  contacts?: Pick<Contact, "full_name" | "phone_number" | "photo_url" | "normalized_phone" | "whatsapp_available">;
}

export function VacanciesPage() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [vacancies, setVacancies] = useState<VacancyWithContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    supabase
      .from("vacancies")
      .select(
        "*, contacts:contact_id(full_name, phone_number, photo_url, normalized_phone, whatsapp_available)"
      )
      .eq("user_id", user.id)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setVacancies(data as VacancyWithContact[]);
        }
        setLoading(false);
      });
  }, [user]);

  const callContact = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const messageContact = (normalizedPhone: string) => {
    window.open(`https://wa.me/${normalizedPhone}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Vacancies Found" subtitle="Rooms discovered today" showBack={false} />

      <div className="px-4 py-4">
        {loading ? (
          <FullSpinner label="Loading vacancies..." />
        ) : vacancies.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="No vacancies recorded today."
            subtitle="When you call a landlord and they have a room, it will appear here."
          />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-success-100 rounded-lg px-3 py-1">
                <span className="text-sm font-bold text-success-700">
                  {vacancies.length} {vacancies.length === 1 ? "vacancy" : "vacancies"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {vacancies.map((vac) => {
                const contact = vac.contacts;
                if (!contact) return null;
                return (
                  <div
                    key={vac.id}
                    className="bg-white rounded-2xl border border-slate-100 p-4"
                  >
                    {/* Contact header */}
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar
                        contact={{
                          photo_url: contact.photo_url,
                          full_name: contact.full_name,
                        }}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold text-sm text-slate-900 truncate cursor-pointer"
                          onClick={() => {
                            // Navigate to contact detail — need contact id
                            // We have vac.contact_id
                            navigate("contact-detail", { id: vac.contact_id });
                          }}
                        >
                          {contact.full_name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Found at {formatTime(vac.created_at)}
                        </p>
                      </div>
                      <div className="bg-success-500 rounded-lg px-2 py-1 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-bold text-white">VACANT</span>
                      </div>
                    </div>

                    {/* Vacancy details */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <DetailItem label="Room Type" value={vac.room_type ?? "—"} />
                      <DetailItem
                        label="Price"
                        value={vac.price ? `UGX ${vac.price.toLocaleString()}/mo` : "—"}
                      />
                      <DetailItem
                        label="Self-contained"
                        value={vac.is_self_contained ? "Yes" : "No"}
                      />
                      <DetailItem
                        label="Available"
                        value={`${vac.number_available} room${vac.number_available !== 1 ? "s" : ""}`}
                      />
                    </div>

                    {vac.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <MapPin className="w-3.5 h-3.5" /> {vac.location}
                      </div>
                    )}

                    {vac.details && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 mb-3">
                        {vac.details}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => callContact(contact.phone_number)}
                        className="flex-1 bg-brand-50 text-brand-700 rounded-xl py-2 flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all"
                      >
                        <Phone className="w-4 h-4" /> Call
                      </button>
                      {contact.whatsapp_available && (
                        <button
                          onClick={() => messageContact(contact.normalized_phone)}
                          className="flex-1 bg-green-50 text-green-700 rounded-xl py-2 flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
