import { useEffect, useState } from "react";
import {
  Users,
  CalendarClock,
  AlertCircle,
  PhoneCall,
  UserPlus,
  Download,
  Home,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { fetchDashboardCounts, type DashboardCounts } from "@/lib/contacts";
import { Spinner } from "@/components/Spinner";

interface DashboardCard {
  key: string;
  title: string;
  count?: number;
  icon: typeof Users;
  color: string;
  bgColor: string;
  action: string;
  screen: Parameters<ReturnType<typeof useApp>["navigate"]>[0];
}

export function Dashboard() {
  const { navigate } = useApp();
  const { user } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDashboardCounts(user.id)
      .then(setCounts)
      .finally(() => setLoading(false));
  }, [user]);

  const cards: DashboardCard[] = [
    {
      key: "total",
      title: "Total Contacts",
      count: counts?.total,
      icon: Users,
      color: "text-ocean-700",
      bgColor: "bg-ocean-50",
      action: "View Contacts",
      screen: "contacts",
    },
    {
      key: "due",
      title: "Due Today",
      count: counts?.dueToday,
      icon: CalendarClock,
      color: "text-brand-700",
      bgColor: "bg-brand-50",
      action: "Call Today",
      screen: "due-today",
    },
    {
      key: "overdue",
      title: "Overdue",
      count: counts?.overdue,
      icon: AlertCircle,
      color: "text-danger-600",
      bgColor: "bg-danger-50",
      action: "Follow Up",
      screen: "overdue",
    },
    {
      key: "called",
      title: "Called Today",
      count: counts?.calledToday,
      icon: PhoneCall,
      color: "text-brand-700",
      bgColor: "bg-brand-50",
      action: "View Results",
      screen: "called-today",
    },
    {
      key: "add",
      title: "Add Landlord",
      icon: UserPlus,
      color: "text-ocean-700",
      bgColor: "bg-ocean-50",
      action: "+ Add Contact",
      screen: "add-landlord",
    },
    {
      key: "import",
      title: "Import Contacts",
      icon: Download,
      color: "text-brand-700",
      bgColor: "bg-brand-50",
      action: "Import from Phone",
      screen: "import-contacts",
    },
    {
      key: "vacancies",
      title: "Vacancies Found",
      count: counts?.vacanciesToday,
      icon: Home,
      color: "text-success-600",
      bgColor: "bg-success-50",
      action: "View Vacancies",
      screen: "vacancies",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-800 to-ocean-900 px-5 pt-8 pb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Building2 className="w-6 h-6 text-brand-300" />
          <h1 className="text-xl font-bold text-white">Safi OPP</h1>
        </div>
        <p className="text-sm text-brand-200">Landlord Operations</p>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-brand-200">
            <Spinner size={16} className="text-brand-300" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <div className="bg-white/10 backdrop-blur rounded-xl px-3 py-1.5">
              <span className="text-xs text-brand-200">Today</span>
              <p className="text-sm font-semibold text-white">
                {new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            {counts && counts.overdue > 0 && (
              <div className="bg-danger-500/20 backdrop-blur rounded-xl px-3 py-1.5">
                <span className="text-xs text-red-200">{counts.overdue} overdue</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="px-4 -mt-3 space-y-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => navigate(card.screen)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-all hover:shadow-md text-left"
            >
              <div
                className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center shrink-0`}
              >
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">
                  {card.title}
                </h3>
                {card.count !== undefined ? (
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                    {loading ? (
                      <Spinner size={16} />
                    ) : (
                      card.count.toLocaleString()
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">{card.action}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {card.count !== undefined && (
                  <span className="text-xs font-medium text-slate-400">
                    {card.action}
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Today's work summary */}
      {!loading && counts && (counts.dueToday > 0 || counts.overdue > 0) && (
        <div className="px-4 mt-5">
          <button
            onClick={() => navigate("today")}
            className="w-full bg-gradient-to-r from-brand-600 to-ocean-700 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform shadow-lg"
          >
            <h3 className="text-white font-bold text-sm">Today's Work</h3>
            <p className="text-brand-100 text-xs mt-1">
              {counts.overdue} overdue · {counts.dueToday} due today
            </p>
            <div className="flex items-center gap-2 mt-3 text-white/90 text-xs font-medium">
              Start Calling <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
