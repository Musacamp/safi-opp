import { useEffect, useState } from "react";
import { CalendarClock, AlertCircle, PartyPopper, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { ContactCard } from "@/components/ContactCard";
import { FullSpinner, EmptyState } from "@/components/Spinner";
import { PhotoViewer } from "@/components/PhotoViewer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { statusConfig } from "@/lib/statusConfig";
import { startOfDay, endOfDay, daysOverdue } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import type { Contact } from "@/types/database";

interface ListPageProps {
  variant: "due-today" | "overdue" | "called-today";
}

export function ListPage({ variant }: ListPageProps) {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoViewer, setPhotoViewer] = useState<Contact | null>(null);

  const config = {
    "due-today": {
      title: "Due Today",
      subtitle: "Follow-ups scheduled for today",
      emptyTitle: "No landlord follow-ups due today.",
      emptySubtitle: "You're all caught up for today.",
      emptyIcon: PartyPopper,
    },
    overdue: {
      title: "Overdue",
      subtitle: "Follow-ups past their due date",
      emptyTitle: "You're all caught up.",
      emptySubtitle: "No overdue follow-ups.",
      emptyIcon: CheckCircle2,
    },
    "called-today": {
      title: "Called Today",
      subtitle: "Landlords contacted today",
      emptyTitle: "No calls made yet today.",
      emptySubtitle: "Start calling from Due Today or Overdue.",
      emptyIcon: CalendarClock,
    },
  }[variant];

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    let q = supabase.from("contacts").select("*").eq("user_id", user.id);

    if (variant === "due-today") {
      q = q
        .gte("next_follow_up_at", todayStart)
        .lte("next_follow_up_at", todayEnd)
        .order("next_follow_up_at", { ascending: true });
    } else if (variant === "overdue") {
      q = q
        .lt("next_follow_up_at", todayStart)
        .order("next_follow_up_at", { ascending: true });
    } else if (variant === "called-today") {
      q = q
        .gte("last_contacted_at", todayStart)
        .lte("last_contacted_at", todayEnd)
        .order("last_contacted_at", { ascending: false });
    }

    q.then(({ data, error }) => {
      if (error) {
        setContacts([]);
      } else {
        setContacts((data ?? []) as Contact[]);
      }
      setLoading(false);
    });
  }, [user, variant]);

  const callContact = (contact: Contact) => {
    window.location.href = `tel:${contact.phone_number}`;
  };

  const messageContact = (contact: Contact) => {
    if (contact.whatsapp_available) {
      window.open(`https://wa.me/${contact.normalized_phone}`, "_blank");
    } else {
      window.location.href = `sms:${formatPhone(contact.phone_number).replace(/\s/g, "")}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title={config.title} subtitle={config.subtitle} />

      <div className="px-4 py-4">
        {loading ? (
          <FullSpinner label="Loading..." />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={config.emptyIcon}
            title={config.emptyTitle}
            subtitle={config.emptySubtitle}
          />
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-3">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2.5">
              {contacts.map((contact) => {
                const overdueDays = contact.next_follow_up_at
                  ? daysOverdue(contact.next_follow_up_at)
                  : 0;

                return (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    statusConfig={statusConfig}
                    onPhotoClick={() => contact.photo_url && setPhotoViewer(contact)}
                    onCall={() => callContact(contact)}
                    onMessage={() => messageContact(contact)}
                    onClick={() => navigate("contact-detail", { id: contact.id })}
                    extra={
                      variant === "overdue" && overdueDays > 0 ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] bg-danger-100 text-danger-700 px-2 py-0.5 rounded-full font-semibold">
                            {overdueDays} {overdueDays === 1 ? "day" : "days"} overdue
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("contact-detail", { id: contact.id });
                            }}
                            className="text-[10px] bg-ocean-600 text-white px-2 py-0.5 rounded-full font-semibold"
                          >
                            Record Result
                          </button>
                        </div>
                      ) : variant === "called-today" ? (
                        <div className="mt-1.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              contact.current_status === "has_vacancy"
                                ? "bg-success-100 text-success-700"
                                : contact.current_status === "no_vacancy"
                                  ? "bg-danger-100 text-danger-700"
                                  : "bg-warning-100 text-warning-700"
                            }`}
                          >
                            {contact.current_status === "has_vacancy"
                              ? "Vacancy Found"
                              : contact.current_status === "no_vacancy"
                                ? "No Vacancy"
                                : "Call Later"}
                          </span>
                        </div>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {photoViewer?.photo_url && (
        <PhotoViewer
          photoUrl={photoViewer.photo_url}
          name={photoViewer.full_name}
          onClose={() => setPhotoViewer(null)}
        />
      )}
    </div>
  );
}
