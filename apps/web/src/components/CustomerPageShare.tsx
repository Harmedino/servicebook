import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import type { CustomerProfile } from "@servicebook/types";
import { customerPageUrl, useCustomerPortalLink } from "../lib/customerPortal";
import { useMyBusiness } from "../lib/business";
import { whatsappNumberFor } from "../lib/socials";
import { useCopyLink } from "./CopyLinkDialog";

/** On a customer's profile: the private link to their own page, ready to copy or send on WhatsApp. */
export function CustomerPageShare({ customer }: { customer: CustomerProfile }) {
  const { data } = useCustomerPortalLink(customer.id);
  const { data: businessData } = useMyBusiness();
  const { copied, copy: copyLink, dialog: copyDialog } = useCopyLink();
  const business = businessData?.business;
  if (!data || !business) return <div className="skeleton-shimmer h-28 rounded-2xl bg-stone-100" />;

  const url = customerPageUrl(data.token);
  const firstName = customer.name.split(" ")[0];
  const message = `Hi ${firstName}, here are your appointments with ${business.name}. You can also book your next one from here: ${url}`;
  const whatsapp = customer.phone ? whatsappNumberFor(customer.phone, business.socials?.whatsapp) : "";

  async function copy() {
    await copyLink(url, "Their page link");
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-surface p-5">
      {copyDialog}
      <p className="font-semibold text-stone-900">{firstName}&apos;s page</p>
      <p className="mt-1 text-sm text-stone-500">
        A private link where {firstName} sees past and upcoming appointments and books again without typing their details.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white hover:brightness-95"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send on WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview
        </a>
      </div>
    </div>
  );
}
