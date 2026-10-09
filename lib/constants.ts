export const LOCATIONS = [
  "Riverside Centre",
  "Hillcrest Centre",
  "Harbour Centre",
] as const;
export const ROLES = ["admin", "manager", "staff"] as const;
export const WORKSHOP_STATUSES = [
  "draft",
  "open",
  "cancelled",
  "completed",
] as const;

export const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

export const STATUS_LABEL: Record<(typeof WORKSHOP_STATUSES)[number], string> =
  {
    draft: "Draft",
    open: "Open",
    cancelled: "Cancelled",
    completed: "Completed",
  };
