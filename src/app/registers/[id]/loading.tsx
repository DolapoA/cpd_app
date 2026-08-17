import { SkeletonCard, SkeletonPageHead, SkeletonRows } from "@/components/skeleton";

export default function RegisterLoading() {
  return (
    <main className="container stack">
      <SkeletonPageHead actions={2} />
      <SkeletonCard lines={3} />
      <SkeletonRows rows={6} />
    </main>
  );
}
