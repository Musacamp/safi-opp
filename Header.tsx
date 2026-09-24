import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, subtitle, showBack = true, rightAction }: HeaderProps) {
  const { goBack } = useApp();

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="flex items-center gap-3 px-4 py-3">
        {showBack && (
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
        {rightAction}
      </div>
    </div>
  );
}
