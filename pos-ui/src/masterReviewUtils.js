export const REVIEW_RANGES = [30, 60, 90, 180];

const DAY_MS = 24 * 60 * 60 * 1000;

export const reviewAgeDays = (
  lastReviewedAt,
  nowMs = Date.now()
) => {
  if (!lastReviewedAt) return null;

  const reviewedMs = new Date(lastReviewedAt).getTime();

  if (!Number.isFinite(reviewedMs)) return null;

  return Math.floor(
    Math.max(0, nowMs - reviewedMs) / DAY_MS
  );
};

export const isReviewedWithinRange = (
  lastReviewedAt,
  days,
  nowMs = Date.now()
) => {
  const reviewedMs = new Date(lastReviewedAt).getTime();
  const numericDays = Number(days);

  if (
    !lastReviewedAt ||
    !Number.isFinite(reviewedMs) ||
    !Number.isFinite(numericDays) ||
    numericDays <= 0
  ) {
    return false;
  }

  return reviewedMs >= nowMs - numericDays * DAY_MS;
};
