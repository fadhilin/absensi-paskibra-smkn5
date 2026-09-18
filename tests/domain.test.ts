import { describe, it, expect } from "vitest";
import {
  pointRulesSchema,
  rankMembers,
  trainingPoints,
  validateAttendance,
} from "../src/lib/domain";

describe("Aturan PRD", () => {
  const session = {
    opensAt: 100,
    onTimeUntil: 200,
    closesAt: 300,
  };
  it("menerima batas inklusif waktu absensi QR", () => {
    expect(validateAttendance({ ...session, receivedAt: 100 })).toBe("hadir");
    expect(validateAttendance({ ...session, receivedAt: 200 })).toBe("hadir");
    expect(validateAttendance({ ...session, receivedAt: 201 })).toBe(
      "terlambat",
    );
    expect(validateAttendance({ ...session, receivedAt: 300 })).toBe(
      "terlambat",
    );
  });
  it("menolak di luar jendela absensi", () => {
    for (const receivedAt of [99, 301])
      expect(() => validateAttendance({ ...session, receivedAt })).toThrow();
  });
  it("menghitung 10 + 4 + 3 dan mempertahankan nilai belum lengkap", () => {
    expect(trainingPoints("hadir", 4, 3, { present: 10, late: 7 })).toEqual({
      total: 17,
      complete: true,
    });
    expect(trainingPoints("hadir", null, 0, { present: 10, late: 7 })).toEqual({
      total: 10,
      complete: false,
    });
    for (const status of ["izin", "sakit", "alpa"])
      expect(trainingPoints(status, 4, 3, { present: 10, late: 7 }).total).toBe(
        0,
      );
  });
  it("menghasilkan ranking kompetisi dan pemenang bersama", () => {
    expect(
      rankMembers([50, 40, 40, 20].map((total) => ({ total }))).map(
        (r) => r.rank,
      ),
    ).toEqual([1, 2, 2, 4]);
    expect(
      rankMembers([50, 50, 40].map((total) => ({ total }))).filter(
        (r) => r.rank === 1,
      ),
    ).toHaveLength(2);
  });
  it("memvalidasi besaran poin", () => {
    expect(
      pointRulesSchema.safeParse({
        month: "2026-09",
        present: 10,
        late: 7,
        activity: 5,
        skill: 5,
      }).success,
    ).toBe(true);
    expect(
      pointRulesSchema.safeParse({
        month: "2026-09",
        present: 5,
        late: 7,
        activity: 5,
        skill: 5,
      }).success,
    ).toBe(false);
  });
});
