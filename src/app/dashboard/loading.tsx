import { SkeletonCard, SkeletonPageHead, SkeletonRows, SkeletonStats } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <main className="container stack">
      <SkeletonPageHead actions={2} />
      <SkeletonStats />
      <SkeletonRows rows={4} />
      <SkeletonCard lines={2} />
    </main>
  );
}
