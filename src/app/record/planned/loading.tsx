import { SkeletonCard, SkeletonPageHead, SkeletonRows } from "@/components/skeleton";

export default function PlannedLoading() {
  return (
    <main className="container stack">
      <SkeletonPageHead actions={2} />
      <SkeletonRows rows={3} />
      <SkeletonCard lines={6} />
    </main>
  );
}
