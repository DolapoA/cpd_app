import { SkeletonPageHead, SkeletonRows } from "@/components/skeleton";

export default function RecordLoading() {
  return (
    <main className="container stack">
      <SkeletonPageHead actions={3} />
      <SkeletonRows rows={8} />
    </main>
  );
}
