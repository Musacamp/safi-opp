import { useCallback, useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, Trash2, CheckSquare, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import type { Contact } from "@/types/database";
import { ContactCard } from "@/components/ContactCard";
import { statusConfig } from "@/lib/statusConfig";
import { FullSpinner, EmptyState, Spinner } from "@/components/Spinner";
import { Modal } from "@/components/Modal";
import { showToast } from "@/components/Toast";
import { PhotoViewer } from "@/components/PhotoViewer";
import { formatPhone } from "@/lib/phone";

const PAGE_SIZE = 30;

type FilterKey =
  | "due_today"
  | "overdue"
  | "called_today"
  | "has_vacancy"
  | "no_vacancy"
  | "call_later"
  | "whatsapp"
  | "no_whatsapp";

const filterLabels: Record<FilterKey, string> = {
  due_today: "Due Today",
  overdue: "Overdue",
  called_today: "Called Today",
  has_vacancy: "Has Vacancy",
  no_vacancy: "No Vacancy",
  call_later: "Call Later",
  whatsapp: "WhatsApp",
  no_whatsapp: "No WhatsApp",
};

type SortKey = "name" | "recently_contacted" | "next_follow_up" | "oldest_follow_up" | "recently_added";

const sortLabels: Record<SortKey, string> = {
  name: "Name (A-Z)",
  recently_contacted: "Recently Contacted",
  next_follow_up: "Next Follow-up",
  oldest_follow_up: "Oldest Follow-up",
  recently_added: "Recently Added",
};

export function ContactsList() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [sort, setSort] = useState<SortKey>("name");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<Contact | null>(null);

  const buildQuery = useCallback(
    (page: number) => {
      if (!user) return null;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      let q = supabase.from("contacts").select("*").eq("user_id", user.id);

      if (search.trim()) {
        q = q.or(
          `full_name.ilike.%${search.trim()}%,phone_number.ilike.%${search.trim()}%,notes.ilike.%${search.trim()}%`
        );
      }

      activeFilters.forEach((f) => {
        switch (f) {
          case "due_today":
            q = q
              .gte("next_follow_up_at", todayStart.toISOString())
              .lte("next_follow_up_at", todayEnd.toISOString());
            break;
          case "overdue":
            q = q.lt("next_follow_up_at", todayStart.toISOString());
            break;
          case "called_today":
            q = q
              .gte("last_contacted_at", todayStart.toISOString())
              .lte("last_contacted_at", todayEnd.toISOString());
            break;
          case "has_vacancy":
            q = q.eq("current_status", "has_vacancy");
            break;
          case "no_vacancy":
            q = q.eq("current_status", "no_vacancy");
            break;
          case "call_later":
            q = q.eq("current_status", "call_later");
            break;
          case "whatsapp":
            q = q.eq("whatsapp_available", true);
            break;
          case "no_whatsapp":
            q = q.eq("whatsapp_available", false);
            break;
        }
      });

      const sortField: Record<SortKey, string> = {
        name: "full_name",
        recently_contacted: "last_contacted_at",
        next_follow_up: "next_follow_up_at",
        oldest_follow_up: "next_follow_up_at",
        recently_added: "created_at",
      };
      const ascending = sort === "name" || sort === "oldest_follow_up";
      const field = sortField[sort];
      if (field === "full_name") {
        q = q.order(field, { ascending: true });
      } else {
        q = q.order(field, { ascending, nullsFirst: false });
      }

      q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      return q;
    },
    [user, search, activeFilters, sort]
  );

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      const q = buildQuery(page);
      if (!q) return;
      const { data, error } = await q;
      if (error) {
        showToast("Failed to load contacts", "error");
        return;
      }
      const newContacts = (data ?? []) as Contact[];
      setContacts((prev) => (replace ? newContacts : [...prev, ...newContacts]));
      setHasMore(newContacts.length === PAGE_SIZE);
    },
    [buildQuery]
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(0, true).finally(() => setLoading(false));
  }, [fetchPage]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(Math.floor(contacts.length / PAGE_SIZE), false);
    setLoadingMore(false);
  };

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(contacts.map((c) => c.id)));
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("contacts")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id);
      if (error) throw error;
      setContacts((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
      setSelectionMode(false);
      setDeleteConfirm(false);
      showToast(`${ids.length} contact(s) deleted`, "success");
    } catch {
      showToast("Failed to delete contacts", "error");
    } finally {
      setDeleting(false);
    }
  };

  const callContact = (contact: Contact) => {
    window.location.href = `tel:${contact.phone_number}`;
  };

  const messageContact = (contact: Contact) => {
    const phone = formatPhone(contact.phone_number).replace(/\s/g, "");
    if (contact.whatsapp_available) {
      window.open(`https://wa.me/${contact.normalized_phone}`, "_blank");
    } else {
      window.location.href = `sms:${phone}`;
    }
  };

  const filteredCount = contacts.length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-900">Contacts</h1>
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <button
                    onClick={selectAll}
                    className="text-xs font-medium text-ocean-600 px-2 py-1"
                  >
                    <CheckSquare className="w-4 h-4 inline mr-1" />
                    All
                  </button>
                  {selected.size > 0 && (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="text-danger-600 p-1.5 rounded-lg hover:bg-danger-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectionMode(false);
                      setSelected(new Set());
                    }}
                    className="text-slate-500 p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate("import-contacts")}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                  title="Import"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, location..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
            />
          </div>

          {/* Filter/sort bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilters.size > 0
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilters.size > 0 && (
                <span className="bg-brand-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                  {activeFilters.size}
                </span>
              )}
            </button>
            <span className="text-xs text-slate-400">
              {loading ? "..." : `${filteredCount} contact${filteredCount !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
      </div>

      {/* Long-press hint */}
      {!selectionMode && !loading && contacts.length > 0 && (
        <p className="text-center text-xs text-slate-400 py-2">
          Long-press a contact to select
        </p>
      )}

      {/* Contacts list */}
      <div className="px-4 space-y-2.5 mt-1">
        {loading ? (
          <FullSpinner label="Loading contacts..." />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search || activeFilters.size > 0 ? "No contacts found" : "No contacts yet"}
            subtitle={
              search || activeFilters.size > 0
                ? "Try adjusting your search or filters"
                : "Add your first landlord to get started"
            }
          />
        ) : (
          <>
            {contacts.map((contact) => (
              <ContactCardWithLongPress
                key={contact.id}
                contact={contact}
                selectionMode={selectionMode}
                selected={selected.has(contact.id)}
                onSelect={toggleSelection}
                onPhotoClick={() => contact.photo_url && setPhotoViewer(contact)}
                onCall={() => callContact(contact)}
                onMessage={() => messageContact(contact)}
                onClick={() => navigate("contact-detail", { id: contact.id })}
                onLongPress={() => {
                  setSelectionMode(true);
                  setSelected(new Set([contact.id]));
                }}
              />
            ))}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-sm text-ocean-600 font-medium px-4 py-2"
                >
                  {loadingMore ? <Spinner size={16} /> : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Modal */}
      <Modal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters & Sort"
      >
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Filter By
            </h4>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeFilters.has(key)
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {filterLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Sort By
            </h4>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sort === key
                      ? "bg-ocean-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          </div>

          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="text-xs text-danger-600 font-medium"
            >
              Clear all filters
            </button>
          )}

          <button
            onClick={() => setShowFilters(false)}
            className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Contacts"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-4">
          Are you sure you want to delete {selected.size} contact
          {selected.size !== 1 ? "s" : ""}? This will also delete all their
          interaction history, vacancies, and follow-ups. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteConfirm(false)}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-danger-600 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            {deleting ? <Spinner size={16} /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </Modal>

      {/* Photo viewer */}
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

/** ContactCard wrapper with long-press support for mobile. */
function ContactCardWithLongPress({
  contact,
  selectionMode,
  selected,
  onSelect,
  onPhotoClick,
  onCall,
  onMessage,
  onClick,
  onLongPress,
}: {
  contact: Contact;
  selectionMode: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onPhotoClick: () => void;
  onCall: () => void;
  onMessage: () => void;
  onClick: () => void;
  onLongPress: () => void;
}) {
  const timerRef = useRef<number | null>(null);

  const startPress = () => {
    timerRef.current = window.setTimeout(() => {
      onLongPress();
    }, 600);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      <ContactCard
        contact={contact}
        statusConfig={statusConfig}
        selectionMode={selectionMode}
        selected={selected}
        onSelect={onSelect}
        onPhotoClick={onPhotoClick}
        onCall={onCall}
        onMessage={onMessage}
        onClick={onClick}
      />
    </div>
  );
}


