import type { Contact } from "@/types/database";
import { Phone, MessageCircle, MessageSquare } from "lucide-react";
import { Avatar } from "./Avatar";
import { formatPhone } from "@/lib/phone";
import { formatDate, relativeDay, daysOverdue } from "@/lib/dates";
import type { StatusConfig } from "@/lib/statusConfig";

interface ContactCardProps {
  contact: Contact;
  statusConfig: StatusConfig;
  onSelect?: (id: string) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onPhotoClick?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onClick?: () => void;
  extra?: React.ReactNode;
}

export function ContactCard({
  contact,
  statusConfig,
  onSelect,
  selected,
  selectionMode,
  onPhotoClick,
  onCall,
  onMessage,
  onClick,
  extra,
}: ContactCardProps) {
  const statusInfo = statusConfig[contact.current_status as keyof typeof statusConfig];

  const handleCardClick = () => {
    if (selectionMode && onSelect) {
      onSelect(contact.id);
    } else if (onClick) {
      onClick();
    }
  };

  const overdueDays = contact.next_follow_up_at
    ? daysOverdue(contact.next_follow_up_at)
    : 0;

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-2xl border p-3.5 transition-all ${
        selected
          ? "border-ocean-500 bg-ocean-50 ring-2 ring-ocean-200"
          : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
      } ${selectionMode ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {selectionMode && (
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 ${
              selected ? "bg-ocean-600 border-ocean-600" : "border-slate-300"
            }`}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {/* Avatar */}
        <Avatar
          contact={contact}
          size="md"
          onClick={selectionMode ? undefined : onPhotoClick}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-slate-900 truncate text-sm"
              onClick={(e) => {
                if (!selectionMode && onClick) {
                  e.stopPropagation();
                  onClick();
                }
              }}
            >
              {contact.full_name}
            </h3>
            {statusInfo && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusInfo.bg} ${statusInfo.text}`}
              >
                {statusInfo.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {formatPhone(contact.phone_number)}
          </p>

          {overdueDays > 0 && (
            <p className="text-xs text-danger-600 font-medium mt-0.5">
              {overdueDays} {overdueDays === 1 ? "day" : "days"} overdue
            </p>
          )}
          {contact.next_follow_up_at && overdueDays <= 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              Follow-up: {relativeDay(contact.next_follow_up_at)}
            </p>
          )}
          {contact.last_contacted_at && !contact.next_follow_up_at && (
            <p className="text-xs text-slate-400 mt-0.5">
              Last: {formatDate(contact.last_contacted_at)}
            </p>
          )}

          {extra}
        </div>

        {/* Action buttons */}
        {!selectionMode && (
          <div className="flex flex-col gap-1.5 shrink-0">
            {onCall && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCall();
                }}
                className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center hover:bg-brand-100 active:scale-95 transition-all"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
            {onMessage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage();
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all ${
                  contact.whatsapp_available
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : "bg-ocean-50 text-ocean-700 hover:bg-ocean-100"
                }`}
                title={contact.whatsapp_available ? "WhatsApp" : "SMS"}
              >
                {contact.whatsapp_available ? (
                  <MessageCircle className="w-4 h-4" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
