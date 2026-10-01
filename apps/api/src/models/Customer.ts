import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const customerSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    notes: { type: String, trim: true },
    // How the customer got onto the list: added by staff, made a booking,
    // or signed themselves up through the business's invite link.
    source: { type: String, enum: ["manual", "booking", "link", "chat"], default: "manual" },
    // Secret for the customer's own page (/c/:token): their appointments with
    // this business, and booking again without retyping their details.
    portalToken: { type: String, unique: true, sparse: true },
    // "MM-DD": the day and month only; nobody needs to share the year.
    birthday: { type: String, match: [/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Birthday must be MM-DD"] },
  },
  { timestamps: true },
);

// A customer's phone number only needs to be unique within a single
// business, not globally — the same customer may book with two different
// businesses on this platform.
customerSchema.index({ businessId: 1, phone: 1 }, { unique: true });

export type CustomerAttributes = InferSchemaType<typeof customerSchema>;
export type CustomerDocument = HydratedDocument<CustomerAttributes>;

export const Customer = model<CustomerAttributes>("Customer", customerSchema);
