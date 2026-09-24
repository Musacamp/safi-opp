import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthPage } from "@/screens/AuthPage";
import { Dashboard } from "@/screens/Dashboard";
import { ContactsList } from "@/screens/ContactsList";
import { ContactDetail } from "@/screens/ContactDetail";
import { WhatHappened } from "@/screens/WhatHappened";
import { ListPage } from "@/screens/ListPage";
import { VacanciesPage } from "@/screens/VacanciesPage";
import { TodayWork } from "@/screens/TodayWork";
import { AddLandlord } from "@/screens/AddLandlord";
import { ImportContacts } from "@/screens/ImportContacts";
import { BottomNav } from "@/components/BottomNav";
import { ToastContainer } from "@/components/Toast";
import { FullSpinner } from "@/components/Spinner";

function ScreenRouter() {
  const { screen, params } = useApp();

  switch (screen) {
    case "dashboard":
      return <Dashboard />;
    case "contacts":
      return <ContactsList />;
    case "today":
      return <TodayWork />;
    case "vacancies":
      return <VacanciesPage />;
    case "due-today":
      return <ListPage variant="due-today" />;
    case "overdue":
      return <ListPage variant="overdue" />;
    case "called-today":
      return <ListPage variant="called-today" />;
    case "add-landlord":
      return <AddLandlord />;
    case "import-contacts":
      return <ImportContacts />;
    case "contact-detail":
      return <ContactDetail />;
    case "what-happened":
      return <WhatHappened contactId={params.id} />;
    default:
      return <Dashboard />;
  }
}

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <FullSpinner label="Loading Safi OPP..." />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <>
      <ScreenRouter />
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
        <ToastContainer />
      </AppProvider>
    </AuthProvider>
  );
}
