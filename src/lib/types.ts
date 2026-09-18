export type Member = {
  photo_path?: string;
  photo_updated_at?: string;
  id: string;
  nis: string;
  name: string;
  class_name: string;
  email: string;
  joined_on: string;
  left_on: string | null;
  active: boolean;
  membership_spans?: { from: string; until: string | null }[];
};
export type Training = {
  id: string;
  title: string;
  material: string;
  date: string;
  location: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  opens_at: string;
  on_time_until: string;
  closes_at: string;
  status: "draf" | "selesai" | "dibatalkan";
  version: number;
};
export type Attendance = {
  qr_checkin?: { received_at: string; session_version: number };
  scores?: Record<string, number | null>;
  id: string;
  member_id: string;
  session_id: string;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "alpa";
  activity: number | null;
  skill: number | null;
  note: string;
  automatic_absence?: boolean;
  evidence?: {
    path: string;
    received_at: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    distance: number;
    session_version: number;
    token_id: string;
  };
};
export type Rules = {
  criteria?: { id: string; name: string }[];
  month: string;
  present: number;
  late: number;
  activity: number;
  skill: number;
};
export type Result = {
  month: string;
  version: number;
  certified_at: string;
  certified_by: string;
  winners: string[];
  rows: Ranking[];
  note: string;
  reopened_at?: string;
};
export type Audit = {
  id: string;
  at: string;
  actor: string;
  action: string;
  reason: string;
  before: unknown;
  after: unknown;
};
export type Ranking = {
  evaluation?: number;
  id: string;
  name: string;
  class_name: string;
  total: number;
  attendance: number;
  activity: number;
  skill: number;
  incomplete: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  rank: number;
};
export type State = {
  trainers?: TrainerProfile[];
  announcements?: Announcement[];
  competencies?: Competency[];
  competency_assessments?: CompetencyAssessment[];
  school: string;
  timezone: string;
  members: Member[];
  sessions: Training[];
  attendance: Attendance[];
  rules: Rules[];
  results: Result[];
  audits: Audit[];
  achievements: {
    id: string;
    member_id: string;
    title: string;
    date: string;
    note: string;
  }[];
};
export type Viewer = { id: string; name: string; role: "admin" | "member" };
export type TrainerProfile = {
  id: string;
  name: string;
  photo_path?: string;
  photo_updated_at?: string;
};
export type TrainerInfo = Omit<TrainerProfile, "photo_path"> & {
  has_photo: boolean;
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  updated_at: string;
};
export type Competency = {
  id: string;
  title: string;
  description: string;
  active: boolean;
};
export type CompetencyAssessment = {
  id: string;
  member_id: string;
  competency_id: string;
  level: "perlu_latihan" | "berkembang" | "menguasai";
  note: string;
  assessed_on: string;
  updated_at: string;
};
export type DashboardData = {
  state: State;
  viewer: Viewer;
  ranking: Ranking[];
  allTime: number;
  configured: boolean;
  trainers: TrainerInfo[];
};
export const emptyState = (): State => ({
  announcements: [],
  competencies: [],
  competency_assessments: [],
  school: "Paskibra",
  timezone: "",
  members: [],
  sessions: [],
  attendance: [],
  rules: [],
  results: [],
  audits: [],
  achievements: [],
});
