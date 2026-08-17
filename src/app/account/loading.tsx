import { SkeletonCard, SkeletonPageHead } from "@/components/skeleton";

export default function AccountLoading() {
  return (
    <main className="container container--narrow stack">
      <SkeletonPageHead />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </main>
  );
}
