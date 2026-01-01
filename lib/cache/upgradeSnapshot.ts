import type { Snapshot } from "@/lib/github/types";
import { computeEngineering } from "@/lib/signals/engineering";
import { computeCoverage } from "@/lib/signals/coverage";

/**
 * Upgrades old snapshots to the latest schema at read-time.
 * This avoids cache invalidation and prevents runtime crashes.
 */
export function upgradeSnapshotIfNeeded(snap: Snapshot): Snapshot {
  // Ensure unique exists
  if (!snap.unique) {
    // extremely old snapshot – should not happen, but guard anyway
    snap.unique = {} as any;
  }

  // ENGINEERING (v1)
  if (!("engineering" in snap.unique) || !snap.unique.engineering) {
    snap.unique.engineering = computeEngineering(snap.repos);
  }

  // COVERAGE (v1)
  if (!("coverage" in snap.unique) || !snap.unique.coverage) {
    snap.unique.coverage = computeCoverage(snap.repos);
  }

  return snap;
}
