import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * One item on the public roadmap: something shipped, being built, planned,
 * or an idea a business owner suggested. Anyone can vote; owners can suggest.
 */
const ideaSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 90 },
    description: { type: String, trim: true, maxlength: 600 },
    kind: { type: String, enum: ["feature", "design"], default: "feature" },
    status: { type: String, enum: ["idea", "planned", "in_progress", "shipped"], default: "idea" },
    votes: { type: Number, default: 0 },
    // Hashed voter keys (user id, or IP + browser for visitors), so each person votes once.
    voters: { type: [String], default: [], select: false },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, trim: true },
    hidden: { type: Boolean, default: false },
    shippedAt: { type: Date },
  },
  { timestamps: true },
);

ideaSchema.index({ hidden: 1, status: 1, votes: -1 });

export type IdeaAttributes = InferSchemaType<typeof ideaSchema>;
export type IdeaDocument = HydratedDocument<IdeaAttributes>;

export const Idea = model<IdeaAttributes>("Idea", ideaSchema);
