import type { UserRole } from "../models/User";
import type { BusinessDocument } from "../models/Business";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
      business?: BusinessDocument;
      businessId?: string;
    }
  }
}

export {};
