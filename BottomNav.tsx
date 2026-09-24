import { LayoutDashboard, Users, CalendarCheck, Home, MoreHorizontal } from "lucide-react";
import { useApp, type Screen } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { LogOut, User as UserIcon, ChevronRight } from "lucide-react";
import { Modal } from "@/components/Modal";

const tabs: { screen: Screen; label: string; icon: typeof LayoutDashboard }[] = [
  { screen: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { screen: "contacts", label: "Contacts", icon: Users },
  { screen: "today", label: "Today", icon: CalendarCheck },
  { screen: "vacancies", label: "Vacancies", icon: Home },
  { screen: "more", label: "More", icon: MoreHorizontal },
];

export function BottomNav() {
  const { screen, navigate } = useApp();
  const { signOut, user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  // Don't show bottom nav on sub-screens
  const subScreens: Screen[] = [
    "contact-detail",
    "what-happened",
    "add-landlord",
    "import-contacts",
    "due-today",
    "overdue",
    "called-today",
  ];
  if (subScreens.includes(screen)) return null;

  const activeTab = tabs.find((t) => t.screen === screen) ?? tabs[0];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-safe">
        <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab.screen === tab.screen;
            return (
              <button
                key={tab.screen}
                onClick={() => {
                  if (tab.screen === "more") {
                    setShowMore(true);
                  } else {
                    navigate(tab.screen);
                  }
                }}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? "text-brand-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "fill-brand-100" : ""}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Modal open={showMore} onClose={() => setShowMore(false)} title="More">
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-ocean-700 flex items-center justify-center text-white">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-slate-500">Signed in</p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowMore(false);
              navigate("import-contacts");
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-sm font-medium text-slate-700 flex-1">
              Import Contacts
            </span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={() => {
              setShowMore(false);
              signOut();
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-danger-50 transition-colors text-left"
          >
            <LogOut className="w-5 h-5 text-danger-600" />
            <span className="text-sm font-medium text-danger-600">Sign Out</span>
          </button>
        </div>
      </Modal>
    </>
  );
}
