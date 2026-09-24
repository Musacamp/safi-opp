import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  PhoneCall,
  Home,
  ChevronRight,
  PartyPopper,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { ContactCard } from "@/components/ContactCard";
import { FullSpinner, EmptyState } from "@/components/Spinner";
import { PhotoViewer } from "@/components/PhotoViewer";
import { statusConfig } from "@/lib/statusConfig";
import { startOfDay, endOfDay, daysOverdue } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import type { Contact } from "@/types/database";

interface Counts {
  dueToday: number;
  overdue: number;
  calledToday: number;
  vacanciesToday: number;
}

export function TodayWork() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [overdueContacts, setOverdueContacts] = useState<Contact[]>([]);
  const [dueContacts, setDueContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoViewer, setPhotoViewer] = useState<Contact | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    Promise.all([
      // Counts
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("next_follow_up_at", todayStart)
        .lte("next_follow_up_at", todayEnd),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lt("next_follow_up_at", todayStart),
      supabase
        .from("interactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("interaction_date", todayStart)
        .lte("interaction_date", todayEnd),
      supabase
        .from("vacancies")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd),
      // Overdue contacts (prioritized)
      supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .lt("next_follow_up_at", todayStart)
        .order("next_follow_up_at", { ascending: true })
        .limit(20),
      // Due today contacts
      supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .gte("next_follow_up_at", todayStart)
        .lte("next_follow_up_at", todayEnd)
        .order("next_follow_up_at", { ascending: true })
        .limit(20),
    ]).then(([dueRes, overdueRes, calledRes, vacRes, overdueData, dueData]) => {
      setCounts({
        dueToday: dueRes.count ?? 0,
        overdue: overdueRes.count ?? 0,
        calledToday: calledRes.count ?? 0,
        vacanciesToday: vacRes.count ?? 0,
      });
      setOverdueContacts((overdueData.data ?? []) as Contact[]);
      setDueContacts((dueData.data ?? []) as Contact[]);
      setLoading(false);
    });
  }, [user]);

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

  const renderContact = (contact: Contact, isOverdue: boolean) => {
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
          isOverdue && overdueDays > 0 ? (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] bg-danger-100 text-danger-700 px-2 py-0.5 rounded-full font-semibold">
                {overdueDays} {overdueDays === 1 ? "day" : "days"} overdue
              </span>
            </div>
          ) : undefined
        }
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-gradient-to-br from-brand-800 to-ocean-900 px-5 pt-8 pb-6">
        <h1 className="text-xl font-bold text-white">Today's Work</h1>
        <p className="text-sm text-brand-200 mt-0.5">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Summary cards */}
        {!loading && counts && (
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={AlertCircle}
              label="Overdue"
              count={counts.overdue}
              color="text-danger-600"
              bg="bg-danger-50"
              onClick={() => navigate("overdue")}
            />
            <SummaryCard
              icon={CalendarClock}
              label="Due Today"
              count={counts.dueToday}
              color="text-brand-700"
              bg="bg-brand-50"
              onClick={() => navigate("due-today")}
            />
            <SummaryCard
              icon={PhoneCall}
              label="Called Today"
              count={counts.calledToday}
              color="text-ocean-700"
              bg="bg-ocean-50"
              onClick={() => navigate("called-today")}
            />
            <SummaryCard
              icon={Home}
              label="Vacancies Found"
              count={counts.vacanciesToday}
              color="text-success-600"
              bg="bg-success-50"
              onClick={() => navigate("vacancies")}
            />
          </div>
        )}

        {/* Prioritized working list */}
        {loading ? (
          <FullSpinner label="Loading your work list..." />
        ) : overdueContacts.length === 0 && dueContacts.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="All caught up!"
            subtitle="No overdue or due today contacts. Great work."
          />
        ) : (
          <div className="space-y-4">
            {/* Overdue section */}
            {overdueContacts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-danger-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Overdue ({overdueContacts.length})
                  </h2>
                  <button
                    onClick={() => navigate("overdue")}
                    className="text-xs text-slate-400 flex items-center"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {overdueContacts.map((c) => renderContact(c, true))}
                </div>
              </div>
            )}

            {/* Due today section */}
            {dueContacts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-brand-700 flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4" />
                    Due Today ({dueContacts.length})
                  </h2>
                  <button
                    onClick={() => navigate("due-today")}
                    className="text-xs text-slate-400 flex items-center"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {dueContacts.map((c) => renderContact(c, false))}
                </div>
              </div>
            )}

            {overdueContacts.length === 0 && dueContacts.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-success-600" />
                <p className="text-sm text-slate-600">
                  All follow-ups are handled. Check back tomorrow.
                </p>
              </div>
            )}
          </div>
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

function SummaryCard({
  icon: Icon,
  label,
  count,
  color,
  bg,
  onClick,
}: {
  icon: typeof AlertCircle;
  label: string;
  count: number;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all text-left hover:shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 tabular-nums">{count}</p>
        <p className="text-[10px] text-slate-500 font-medium">{label}</p>
      </div>
    </button>
  );
}
