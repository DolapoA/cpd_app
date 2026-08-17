import { SkeletonCard, SkeletonPageHead } from "@/components/skeleton";

export default function ProfileLoading() {
  return (
    <main className="container container--narrow stack">
      <SkeletonPageHead />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={8} />
      <SkeletonCard lines={1} />
    </main>
  );
}
