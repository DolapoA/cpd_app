import { SkeletonPageHead, SkeletonRows } from "@/components/skeleton";

export default function DiscoverLoading() {
  return (
    <main className="container stack">
      <SkeletonPageHead actions={1} />
      <SkeletonRows rows={4} />
    </main>
  );
}
