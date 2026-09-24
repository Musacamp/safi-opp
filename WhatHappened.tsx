import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { showToast } from "@/components/Toast";
import { Spinner, FullSpinner } from "@/components/Spinner";
import {
  calculateFollowUpDate,
  formatDate,
  type FollowUpOption,
} from "@/lib/dates";
import type { Contact, InteractionResult } from "@/types/database";

const resultCards: {
  result: InteractionResult;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    result: "has_vacancy",
    label: "Has Vacancy",
    description: "Landlord has a room available",
    icon: CheckCircle2,
    color: "text-success-700",
    bgColor: "bg-success-50",
    borderColor: "border-success-500",
  },
  {
    result: "call_later",
    label: "Call Later",
    description: "Couldn't reach, or need to follow up",
    icon: Clock,
    color: "text-warning-700",
    bgColor: "bg-warning-50",
    borderColor: "border-warning-500",
  },
  {
    result: "no_vacancy",
    label: "No Vacancy",
    description: "No rooms available right now",
    icon: XCircle,
    color: "text-danger-700",
    bgColor: "bg-danger-50",
    borderColor: "border-danger-500",
  },
];

const roomTypes = [
  "Single",
  "Double",
  "Self-contained Single",
  "Self-contained Double",
  "Apartment",
  "Business room",
  "Other",
];

const followUpOptions: { value: FollowUpOption; label: string }[] = [
  { value: "3_days", label: "3 days" },
  { value: "1_week", label: "1 week" },
  { value: "2_weeks", label: "2 weeks" },
  { value: "1_month", label: "1 month" },
  { value: "3_months", label: "3 months" },
];

const callLaterOptions: { value: FollowUpOption; label: string }[] = [
  { value: "later_today", label: "Later today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "3_days", label: "3 days" },
  { value: "1_week", label: "1 week" },
  { value: "2_weeks", label: "2 weeks" },
  { value: "1_month", label: "1 month" },
  { value: "3_months", label: "3 months" },
];

interface WhatHappenedProps {
  contactId: string;
}

export function WhatHappened({ contactId }: WhatHappenedProps) {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .maybeSingle()
      .then(({ data }) => {
        setContact(data as Contact | null);
        setLoading(false);
      });
  }, [contactId]);

  // Vacancy form state
  const [roomType, setRoomType] = useState("Single");
  const [price, setPrice] = useState("");
  const [isSelfContained, setIsSelfContained] = useState(false);
  const [location, setLocation] = useState("");
  const [numVacancies, setNumVacancies] = useState("1");
  const [vacancyDetails, setVacancyDetails] = useState("");
  const [followUp, setFollowUp] = useState<FollowUpOption>("1_month");
  const [customDate, setCustomDate] = useState("");

  // Call later form state
  const [callLaterFollowUp, setCallLaterFollowUp] = useState<FollowUpOption>("tomorrow");
  const [callLaterNote, setCallLaterNote] = useState("");
  const [customDateTime, setCustomDateTime] = useState("");

  // No vacancy form state
  const [noVacancyFollowUp, setNoVacancyFollowUp] = useState<FollowUpOption>("2_weeks");
  const [noVacancyNote, setNoVacancyNote] = useState("");
  const [noVacancyCustomDate, setNoVacancyCustomDate] = useState("");

  const recordInteraction = async (
    interactionResult: InteractionResult,
    notes: string,
    followUpDate: Date,
    vacancyData?: {
      room_type: string;
      price: number;
      is_self_contained: boolean;
      location: string;
      number_available: number;
      details: string;
    }
  ) => {
    if (!user || !contact) return;
    setSaving(true);

    try {
      // 1. Create interaction record
      const { data: interaction, error: interError } = await supabase
        .from("interactions")
        .insert({
          contact_id: contact.id,
          user_id: user.id,
          result: interactionResult,
          notes: notes || null,
          interaction_date: new Date().toISOString(),
        })
        .select()
        .single();
      if (interError) throw interError;

      // 2. Mark previous pending follow-ups as completed
      await supabase
        .from("follow_ups")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("contact_id", contact.id)
        .eq("user_id", user.id)
        .eq("status", "pending");

      // 3. Create new follow-up
      const followUpType =
        interactionResult === "has_vacancy"
          ? followUp
          : interactionResult === "call_later"
            ? callLaterFollowUp
            : noVacancyFollowUp;

      const { error: followError } = await supabase.from("follow_ups").insert({
        contact_id: contact.id,
        interaction_id: interaction.id,
        user_id: user.id,
        follow_up_type: followUpType,
        scheduled_for: followUpDate.toISOString(),
        status: "pending",
      });
      if (followError) throw followError;

      // 4. Create vacancy record if applicable
      if (vacancyData && interactionResult === "has_vacancy") {
        const { error: vacError } = await supabase.from("vacancies").insert({
          contact_id: contact.id,
          interaction_id: interaction.id,
          user_id: user.id,
          room_type: vacancyData.room_type,
          price: vacancyData.price,
          is_self_contained: vacancyData.is_self_contained,
          location: vacancyData.location || null,
          number_available: vacancyData.number_available,
          details: vacancyData.details || null,
          active: true,
        });
        if (vacError) throw vacError;

        // Deactivate previous active vacancies for this contact
        await supabase
          .from("vacancies")
          .update({ active: false })
          .neq("id", "00000000-0000-0000-0000-000000000000")
          .eq("contact_id", contact.id)
          .eq("user_id", user.id)
          .eq("active", true)
          .neq("interaction_id", interaction.id);
      }

      // 5. Update contact record
      const newStatus =
        interactionResult === "has_vacancy"
          ? "has_vacancy"
          : interactionResult === "call_later"
            ? "call_later"
            : "no_vacancy";

      const { error: contactError } = await supabase
        .from("contacts")
        .update({
          last_contacted_at: new Date().toISOString(),
          next_follow_up_at: followUpDate.toISOString(),
          current_status: newStatus,
          times_contacted: contact.times_contacted + 1,
        })
        .eq("id", contact.id);
      if (contactError) throw contactError;

      showToast(
        interactionResult === "has_vacancy"
          ? "Vacancy recorded!"
          : interactionResult === "call_later"
            ? "Follow-up scheduled"
            : "Result saved",
        "success"
      );

      navigate("contact-detail", { id: contact.id });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save result",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!result || !user) return;

    if (result === "has_vacancy") {
      const followUpDate = calculateFollowUpDate(
        followUp,
        new Date(),
        customDate ? new Date(customDate) : undefined
      );
      recordInteraction("has_vacancy", vacancyDetails, followUpDate, {
        room_type: roomType,
        price: parseFloat(price) || 0,
        is_self_contained: isSelfContained,
        location,
        number_available: parseInt(numVacancies) || 1,
        details: vacancyDetails,
      });
    } else if (result === "call_later") {
      const followUpDate = calculateFollowUpDate(
        callLaterFollowUp,
        new Date(),
        customDateTime ? new Date(customDateTime) : undefined
      );
      recordInteraction("call_later", callLaterNote, followUpDate);
    } else if (result === "no_vacancy") {
      const followUpDate = calculateFollowUpDate(
        noVacancyFollowUp,
        new Date(),
        noVacancyCustomDate ? new Date(noVacancyCustomDate) : undefined
      );
      recordInteraction("no_vacancy", noVacancyNote, followUpDate);
    }
  };

  const previewDate = (() => {
    if (!result) return null;
    const opt =
      result === "has_vacancy"
        ? followUp
        : result === "call_later"
          ? callLaterFollowUp
          : noVacancyFollowUp;
    const custom =
      result === "has_vacancy"
        ? customDate
        : result === "call_later"
          ? customDateTime
          : noVacancyCustomDate;
    if (opt === "custom" && custom) {
      return formatDate(custom);
    }
    return formatDate(calculateFollowUpDate(opt).toISOString());
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="What Happened?" />
        <FullSpinner label="Loading contact..." />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="What Happened?" />
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-slate-500">Contact not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header
        title="What Happened?"
        subtitle={contact.full_name}
      />

      <div className="px-4 py-4">
        {/* Step 1: Select result */}
        {!result && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm text-slate-500 text-center mb-4">
              You called {contact.full_name}. What was the result?
            </p>
            {resultCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.result}
                  onClick={() => setResult(card.result)}
                  className={`w-full ${card.bgColor} border-2 ${card.borderColor} rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-all text-left hover:shadow-md`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-white/60 flex items-center justify-center shrink-0`}>
                    <Icon className={`w-7 h-7 ${card.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold ${card.color}`}>
                      {card.label}
                    </h3>
                    <p className="text-sm text-slate-600">{card.description}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${card.color}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Has Vacancy form */}
        {result === "has_vacancy" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-success-50 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-success-600" />
              <h3 className="font-bold text-success-700">Has Vacancy</h3>
            </div>

            <FormField label="Room Type">
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
              >
                {roomTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Price (UGX/month)">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150000"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
              />
              {price && (
                <p className="text-xs text-slate-500 mt-1">
                  UGX {parseInt(price).toLocaleString()}/month
                </p>
              )}
            </FormField>

            <FormField label="Self-contained">
              <button
                onClick={() => setIsSelfContained(!isSelfContained)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                  isSelfContained
                    ? "bg-brand-50 border-brand-500 text-brand-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {isSelfContained ? "Yes, self-contained" : "Not self-contained"}
                <div
                  className={`w-10 h-6 rounded-full transition-all relative ${
                    isSelfContained ? "bg-brand-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      isSelfContained ? "left-4" : "left-0.5"
                    }`}
                  />
                </div>
              </button>
            </FormField>

            <FormField label="Location">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pamba, Jinja"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
              />
            </FormField>

            <FormField label="Number of Vacancies">
              <input
                type="number"
                value={numVacancies}
                onChange={(e) => setNumVacancies(e.target.value)}
                min="1"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
              />
            </FormField>

            <FormField label="Additional Details">
              <textarea
                value={vacancyDetails}
                onChange={(e) => setVacancyDetails(e.target.value)}
                placeholder="Kitchen inside, water available, 2k boda to town..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm resize-none"
              />
            </FormField>

            <FollowUpSelector
              label="When should we follow up?"
              options={followUpOptions}
              value={followUp}
              onChange={setFollowUp}
              customDate={customDate}
              onCustomDateChange={setCustomDate}
              previewDate={previewDate}
            />

            <SaveButton onClick={handleSave} saving={saving} label="Save Vacancy" />
          </div>
        )}

        {/* Step 2: Call Later form */}
        {result === "call_later" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-warning-50 rounded-2xl p-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-warning-600" />
              <h3 className="font-bold text-warning-700">Call Later</h3>
            </div>

            <FormField label="Note (optional)">
              <textarea
                value={callLaterNote}
                onChange={(e) => setCallLaterNote(e.target.value)}
                placeholder="Landlord is away, call after 6pm..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm resize-none"
              />
            </FormField>

            <FollowUpSelector
              label="When should we call again?"
              options={callLaterOptions}
              value={callLaterFollowUp}
              onChange={setCallLaterFollowUp}
              customDate={customDateTime}
              onCustomDateChange={setCustomDateTime}
              previewDate={previewDate}
              showTime
            />

            <SaveButton onClick={handleSave} saving={saving} label="Schedule Follow-up" />
          </div>
        )}

        {/* Step 2: No Vacancy form */}
        {result === "no_vacancy" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-danger-50 rounded-2xl p-4 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-danger-600" />
              <h3 className="font-bold text-danger-700">No Vacancy</h3>
            </div>

            <FormField label="Notes (optional)">
              <textarea
                value={noVacancyNote}
                onChange={(e) => setNoVacancyNote(e.target.value)}
                placeholder="All rooms occupied. Check again next month..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm resize-none"
              />
            </FormField>

            <FollowUpSelector
              label="When should we check again?"
              options={followUpOptions}
              value={noVacancyFollowUp}
              onChange={setNoVacancyFollowUp}
              customDate={noVacancyCustomDate}
              onCustomDateChange={setNoVacancyCustomDate}
              previewDate={previewDate}
            />

            <SaveButton onClick={handleSave} saving={saving} label="Save & Schedule Check" />
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function FollowUpSelector({
  label,
  options,
  value,
  onChange,
  customDate,
  onCustomDateChange,
  previewDate,
  showTime,
}: {
  label: string;
  options: { value: FollowUpOption; label: string }[];
  value: FollowUpOption;
  onChange: (v: FollowUpOption) => void;
  customDate: string;
  onCustomDateChange: (v: string) => void;
  previewDate: string | null;
  showTime?: boolean;
}) {
  const allOptions = [...options, { value: "custom" as FollowUpOption, label: "Custom date" }];
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              value === opt.value
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value === "custom" && (
        <input
          type={showTime ? "datetime-local" : "date"}
          value={customDate}
          onChange={(e) => onCustomDateChange(e.target.value)}
          className="w-full mt-2 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
        />
      )}
      {previewDate && (
        <div className="mt-2 bg-brand-50 rounded-xl px-3 py-2">
          <p className="text-xs text-brand-700">
            Next follow-up: <span className="font-semibold">{previewDate}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function SaveButton({ onClick, saving, label }: { onClick: () => void; saving: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 sticky bottom-4"
    >
      {saving ? <Spinner size={18} /> : label}
    </button>
  );
}
