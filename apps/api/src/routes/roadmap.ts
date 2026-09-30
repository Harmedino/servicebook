import { createHash } from "node:crypto";
import { Router, type Request } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { ApiErrorBody, IdeaProfile, IdeaResponse, IdeaStatus, RoadmapResponse } from "@servicebook/types";
import { Idea, type IdeaDocument } from "../models/Idea";
import { Business } from "../models/Business";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { adminEmails } from "../config/env";
import { DEMO_EMAIL } from "../lib/demo";

const STATUS_ORDER: IdeaStatus[] = ["in_progress", "planned", "idea", "shipped"];

const suggestSchema = z.object({
  title: z.string().trim().min(4, "Give it a short title").max(90, "Keep the title under 90 characters"),
  description: z.string().trim().max(600, "Keep the details under 600 characters").optional(),
  kind: z.enum(["feature", "design"]).default("feature"),
});

const adminUpdateSchema = z
  .object({
    status: z.enum(["idea", "planned", "in_progress", "shipped"]).optional(),
    hidden: z.boolean().optional(),
    title: z.string().trim().min(4).max(90).optional(),
    description: z.string().trim().max(600).optional(),
  })
  .strict();

const voteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many votes. Please slow down.", code: "RATE_LIMITED" } } satisfies ApiErrorBody,
});

function isAdmin(req: Request): boolean {
  return Boolean(req.user && adminEmails.has(req.user.email.toLowerCase()));
}

/** One vote per person: signed-in users by id, visitors by a hash of IP and browser. */
function voterKey(req: Request): string {
  const raw = req.user ? `user:${req.user.id}` : `anon:${req.ip}:${req.headers["user-agent"] ?? ""}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function toIdeaProfile(idea: IdeaDocument, includeHidden = false): IdeaProfile {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description ?? undefined,
    kind: (idea.kind as IdeaProfile["kind"]) ?? "feature",
    status: (idea.status as IdeaStatus) ?? "idea",
    votes: idea.votes ?? 0,
    authorName: idea.authorName ?? undefined,
    shippedAt: idea.shippedAt?.toISOString(),
    createdAt: idea.createdAt.toISOString(),
    ...(includeHidden ? { hidden: Boolean(idea.hidden) } : {}),
  };
}

export const roadmapRouter = Router();

roadmapRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const admin = isAdmin(req);
    const [ideas, voted] = await Promise.all([
      Idea.find(admin ? {} : { hidden: false }).sort({ votes: -1, createdAt: -1 }).limit(300),
      Idea.find({ voters: voterKey(req) }).select("_id"),
    ]);
    ideas.sort((a, b) => STATUS_ORDER.indexOf(a.status as IdeaStatus) - STATUS_ORDER.indexOf(b.status as IdeaStatus));
    const body: RoadmapResponse = {
      items: ideas.map((idea) => toIdeaProfile(idea, admin)),
      myVotes: voted.map((idea) => idea.id),
      isAdmin: admin,
      canSuggest: Boolean(req.user) && req.user?.email !== DEMO_EMAIL,
    };
    res.json(body);
  }),
);

/** Toggles the caller's vote. The update is conditional, so double taps can't count twice. */
roadmapRouter.post(
  "/:id/vote",
  voteRateLimit,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const key = voterKey(req);
    const added = await Idea.findOneAndUpdate(
      { _id: req.params.id, hidden: false, voters: { $ne: key } },
      { $addToSet: { voters: key }, $inc: { votes: 1 } },
      { new: true },
    );
    if (added) {
      const body: IdeaResponse = { item: toIdeaProfile(added), voted: true };
      res.json(body);
      return;
    }
    const removed = await Idea.findOneAndUpdate(
      { _id: req.params.id, voters: key },
      { $pull: { voters: key }, $inc: { votes: -1 } },
      { new: true },
    );
    if (!removed) {
      throw new NotFoundError("That idea isn't on the roadmap anymore");
    }
    const body: IdeaResponse = { item: toIdeaProfile(removed), voted: false };
    res.json(body);
  }),
);

/** Business owners suggest features or design changes; their own vote is counted straight away. */
roadmapRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (req.user.email === DEMO_EMAIL) {
      throw new ForbiddenError("The demo account can vote but not post ideas. Create a free account to suggest something.");
    }
    const payload = suggestSchema.parse(req.body);
    const recent = await Idea.countDocuments({ userId: req.user.id, createdAt: { $gt: new Date(Date.now() - 86_400_000) } });
    if (recent >= 5 && !isAdmin(req)) {
      throw new BadRequestError("That's five ideas today, thank you! Add more tomorrow.");
    }
    const business = await Business.findOne({ ownerId: req.user.id }).select("name");
    const idea = await Idea.create({
      ...payload,
      userId: req.user.id,
      authorName: business?.name ?? req.user.name,
      votes: 1,
      voters: [voterKey(req)],
    });
    const body: IdeaResponse = { item: toIdeaProfile(idea), voted: true };
    res.status(201).json(body);
  }),
);

roadmapRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isAdmin(req)) {
      throw new ForbiddenError("Only ServiceBook admins can change the roadmap");
    }
    const updates = adminUpdateSchema.parse(req.body);
    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      throw new NotFoundError("Idea not found");
    }
    if (updates.status === "shipped" && idea.status !== "shipped") idea.shippedAt = new Date();
    idea.set(updates);
    await idea.save();
    const body: IdeaResponse = { item: toIdeaProfile(idea, true) };
    res.json(body);
  }),
);
