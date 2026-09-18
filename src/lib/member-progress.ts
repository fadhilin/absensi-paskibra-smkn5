import { attendanceTotal, evaluation } from "./scoring";
import type { Member, State } from "./types";

type PercentageMetric = {
  percentage: number | null;
  current: number;
  maximum: number;
};

export type MemberProgress = {
  attendance: PercentageMetric;
  score: PercentageMetric & { assessed: number; missing: number };
  points: PercentageMetric;
};

function memberIsEligible(member: Member, date: string) {
  const spans = member.membership_spans ?? [
    { from: member.joined_on, until: member.left_on },
  ];
  return spans.some((span) => span.from <= date && (!span.until || span.until >= date));
}

function percentage(current: number, maximum: number) {
  return maximum > 0 ? Math.round((current / maximum) * 100) : null;
}

/**
 * Returns only progress that has become relevant in the selected period.
 * Upcoming sessions are deliberately excluded from attendance so they do not
 * reduce a member's percentage before the member can attend.
 */
export function memberProgress(
  state: State,
  memberId: string,
  month: string,
  now = new Date(),
): MemberProgress {
  const member = state.members.find((item) => item.id === memberId);
  const empty: MemberProgress = {
    attendance: { percentage: null, current: 0, maximum: 0 },
    score: { percentage: null, current: 0, maximum: 0, assessed: 0, missing: 0 },
    points: { percentage: null, current: 0, maximum: 0 },
  };
  if (!member) return empty;

  const sessions = state.sessions.filter(
    (session) =>
      session.date.startsWith(month) &&
      session.status !== "dibatalkan" &&
      memberIsEligible(member, session.date),
  );
  const startedSessions = sessions.filter(
    (session) => new Date(session.opens_at) <= now,
  );
  const startedIds = new Set(startedSessions.map((session) => session.id));
  const attendanceRecords = state.attendance.filter(
    (record) => record.member_id === memberId && startedIds.has(record.session_id),
  );
  const attendedRecords = attendanceRecords.filter((record) =>
    ["hadir", "terlambat"].includes(record.status),
  );
  const rules = state.rules.find((item) => item.month === month);

  const attendance = {
    current: attendedRecords.length,
    maximum: startedSessions.length,
  };
  if (!rules) {
    return {
      attendance: { ...attendance, percentage: percentage(attendance.current, attendance.maximum) },
      score: empty.score,
      points: empty.points,
    };
  }

  const evaluations = attendedRecords.map((record) => evaluation(record, rules));
  const score = {
    current: evaluations.reduce((total, item) => total + item.total, 0),
    maximum: evaluations.reduce((total, item) => total + item.max, 0),
    assessed: evaluations.reduce((total, item) => total + item.assessed, 0),
    missing: evaluations.reduce(
      (total, item) => total + item.components.length - item.assessed,
      0,
    ),
  };
  const points = {
    current: attendedRecords.reduce(
      (total, record) => total + attendanceTotal(record, rules).total,
      0,
    ),
    maximum: evaluations.reduce(
      (total, item) => total + rules.present + item.max,
      0,
    ),
  };

  return {
    attendance: { ...attendance, percentage: percentage(attendance.current, attendance.maximum) },
    score: {
      ...score,
      percentage: score.assessed > 0 ? percentage(score.current, score.maximum) : null,
    },
    points: { ...points, percentage: percentage(points.current, points.maximum) },
  };
}
