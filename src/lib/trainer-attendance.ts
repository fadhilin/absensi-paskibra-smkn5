import { eligible, schoolDate } from "./engine";
import type { State } from "./types";

export function trainerAttendance(state: State, selectedId = "", now = new Date()) {
  const today = schoolDate(now, state.timezone);
  const sessions = state.sessions
    .filter((session) => session.date === today && session.status !== "dibatalkan")
    .sort((a, b) => a.opens_at.localeCompare(b.opens_at));
  const closed = (session: State["sessions"][number]) =>
    session.status === "selesai" || Date.parse(session.closes_at) < now.getTime();
  const session = sessions.find((item) => item.id === selectedId)
    ?? sessions.find((item) => !closed(item) && Date.parse(item.opens_at) <= now.getTime())
    ?? sessions.find((item) => !closed(item))
    ?? sessions.at(-1);
  const participants = session
    ? state.members.filter((member) => eligible(member, session.date))
    : [];
  const records = new Map(
    state.attendance
      .filter((record) => record.session_id === session?.id)
      .map((record) => [record.member_id, record]),
  );
  let present = 0;
  let excused = 0;
  let absent = 0;
  for (const member of participants) {
    const status = records.get(member.id)?.status;
    if (status === "hadir" || status === "terlambat") present++;
    else if (status === "izin" || status === "sakit") excused++;
    else absent++;
  }
  return {
    today,
    sessions,
    session,
    activeMembers: state.members.filter((member) => member.active).length,
    closed: session ? closed(session) : false,
    started: session ? Date.parse(session.opens_at) <= now.getTime() : false,
    present,
    excused,
    absent,
  };
}
