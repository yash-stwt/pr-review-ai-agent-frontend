import { useMemo } from "react";

/**
 * Returns a filtered copy of reviewData where each category only contains
 * issues whose severity is in the activeSeverities array.
 */
export function useFilteredIssues(reviewData, activeSeverities) {
  return useMemo(() => {
    const filter = (list) =>
      (list ?? []).filter((i) => activeSeverities.includes(i.severity));
    return {
      bugs:         filter(reviewData.bugs),
      security:     filter(reviewData.security),
      quality:      filter(reviewData.quality),
      improvements: filter(reviewData.improvements),
    };
  }, [reviewData, activeSeverities]);
}
