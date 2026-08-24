// Shared row shapes for the carpool feature. These mirror
// supabase/migrations/0003_carpool.sql — keep them in step.

export type CarpoolGroup = {
  id: string;
  name: string;
  school: string | null;
  join_code: string;
  timezone: string;
  created_by: string | null;
  created_at: string;
};

export type CarpoolMember = {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
};

export type CarpoolStop = {
  id: string;
  group_id: string;
  member_id: string | null;
  label: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  riders: string | null;
  position: number;
  active: boolean;
};

export type RunDirection = "to_school" | "from_school";

export type CarpoolRun = {
  id: string;
  group_id: string;
  driver_id: string;
  direction: RunDirection;
  status: "active" | "done" | "canceled";
  note: string | null;
  started_at: string;
  ended_at: string | null;
};

export type CarpoolLocation = {
  member_id: string;
  group_id: string;
  run_id: string | null;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  heading: number | null;
  speed_mps: number | null;
  updated_at: string;
};

export type PingKind =
  | "heads_up"
  | "one_minute"
  | "arrived"
  | "waiting"
  | "skipped"
  | "running_late"
  | "message";

export type CarpoolPing = {
  id: string;
  group_id: string;
  run_id: string | null;
  stop_id: string | null;
  from_member: string | null;
  kind: PingKind;
  message: string | null;
  eta_seconds: number | null;
  created_at: string;
};
