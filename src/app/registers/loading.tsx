import { SkeletonPageHead, SkeletonRows } from "@/components/skeleton";

export default function RegistersLoading() {
  return (
    <main className="container stack">
      <SkeletonPageHead actions={1} />
      <SkeletonRows rows={5} />
    </main>
  );
}
