import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, MessageCircle, ShieldCheck } from "lucide-react";
import type { StaffInviteResponse, StaffProfile } from "@servicebook/types";
import { apiRequest, ApiError } from "../lib/apiClient";
import { useMyBusiness } from "../lib/business";
import { whatsappNumberFor } from "../lib/socials";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ConfirmDialog";

/** Owner, on a staff member's page: give them their own login by invite link, or take it away. */
export function StaffAccessCard({ staff }: { staff: StaffProfile }) {
  const queryClient = useQueryClient();
  const { data: businessData } = useMyBusiness();
  const business = businessData?.business;
  const [invite, setInvite] = useState<StaffInviteResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["staff"] });

  const createInvite = useMutation({
    mutationFn: () => apiRequest<StaffInviteResponse>(`/api/team/${staff.id}/invite`, { method: "POST" }),
    onSuccess: (data) => {
      setInvite(data);
      refresh();
    },
  });
  const removeAccess = useMutation({
    mutationFn: () => apiRequest<void>(`/api/team/${staff.id}/access`, { method: "DELETE" }),
    onSuccess: () => {
      setInvite(null);
      setConfirmRemove(false);
      refresh();
    },
  });

  if (staff.access === "owner") return null;
  const first = staff.name.split(" ")[0];
  const url = invite ? `${window.location.origin}/join-team/${invite.token}` : "";
  const message = `Hi ${first}, here's your login for ${business?.name ?? "the salon"} on ServiceBook. Tap to set your password and see your appointments: ${url}`;
  const whatsapp = staff.phone ? whatsappNumberFor(staff.phone, business?.socials?.whatsapp) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Invite link", url);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${staff.access === "active" ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-500"}`}>
          {staff.access === "active" ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-stone-900">App access</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {staff.access === "active"
              ? `${first} signs in with their own login and sees only their appointments, chats and time off.`
              : staff.access === "invited" && !invite
                ? `Invite sent. Waiting for ${first} to set a password. The link works for 7 days.`
                : `Give ${first} their own login to see their appointments, chat with their customers and add time off. They can't see settings, other people's bookings or your numbers.`}
          </p>
        </div>
      </div>

      {invite && (
        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          <p className="truncate font-mono text-xs text-stone-600">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-sm font-semibold text-white hover:brightness-95"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send on WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {(createInvite.error || removeAccess.error) && (
        <p className="mt-3 text-sm text-red-600">
          {(createInvite.error ?? removeAccess.error) instanceof ApiError ? ((createInvite.error ?? removeAccess.error) as ApiError).message : "Something went wrong."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {staff.access !== "active" && (
          <Button size="sm" onClick={() => createInvite.mutate()} isLoading={createInvite.isPending} disabled={!staff.isActive}>
            {staff.access === "invited" || invite ? "Make a new invite link" : `Invite ${first}`}
          </Button>
        )}
        {(staff.access === "active" || staff.access === "invited") && (
          <Button size="sm" variant="danger" onClick={() => setConfirmRemove(true)}>
            {staff.access === "active" ? "Remove access" : "Cancel invite"}
          </Button>
        )}
      </div>

      {confirmRemove && (
        <ConfirmDialog
          title={staff.access === "active" ? `Remove ${first}'s access?` : "Cancel the invite?"}
          confirmLabel={staff.access === "active" ? "Remove access" : "Cancel invite"}
          destructive
          isConfirming={removeAccess.isPending}
          onConfirm={() => removeAccess.mutate()}
          onCancel={() => setConfirmRemove(false)}
        >
          <p>{staff.access === "active" ? `${first} is signed out straight away. Their bookings and history stay.` : "The link stops working."}</p>
        </ConfirmDialog>
      )}
    </Card>
  );
}
