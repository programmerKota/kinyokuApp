import { formatDuration, toDate, formatRelative } from "../date";

describe("date utils", () => {
  test("formatDuration formats days/hours/minutes/seconds", () => {
    expect(formatDuration(0)).toBe("0日 00:00:00");
    expect(formatDuration(59)).toBe("0日 00:00:59");
    expect(formatDuration(60)).toBe("0日 00:01:00");
    expect(formatDuration(3600)).toBe("0日 01:00:00");
    expect(formatDuration(24 * 3600)).toBe("1日 00:00:00");
  });

  test("toDate handles primitives and Date-like", () => {
    const now = new Date();
    expect(toDate(now)).toBe(now);
    expect(toDate(now.getTime())).toEqual(new Date(now.getTime()));
    expect(toDate(now.toISOString()).getTime()).toBeCloseTo(now.getTime(), -2);
  });

  test("formatRelative basic thresholds", () => {
    const now = new Date();
    const sec10 = new Date(now.getTime() - 10 * 1000);
    const min5 = new Date(now.getTime() - 5 * 60 * 1000);
    const hour2 = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const day3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    expect(formatRelative(sec10, { showSeconds: true })).toMatch(/秒前$/);
    expect(formatRelative(min5)).toBe("5分前");
    expect(formatRelative(hour2)).toBe("2時間前");
    expect(formatRelative(day3)).toBe("3日前");
  });
});
