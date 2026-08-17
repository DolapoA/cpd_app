import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getDb, type Register } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { getShareBase } from "@/lib/base-url";

export const metadata = { title: "Projector mode — CPD Register" };

export default async function ProjectorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireConfirmedUser();

  const { id } = await params;
  const reg = await (await getDb())
    .prepare("SELECT * FROM registers WHERE id = ?").get(Number(id)) as
    | Register
    | undefined;
  if (!reg || reg.organiser_id !== user.id) notFound();

  const shareBase = await getShareBase();
  const shareUrl = `${shareBase.url}/r/${reg.code}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 960, margin: 1 });

  return (
    <div className="projector">
      <h1>{reg.title}</h1>
      <p className="muted">Scan to sign the attendance register</p>
      <img src={qrDataUrl} alt={`QR code linking to ${shareUrl}`} />
      <div className="url mono">{shareUrl}</div>
      {reg.access_code && (
        <div className="access-code">
          Access code: <strong className="mono">{reg.access_code}</strong>
        </div>
      )}
    </div>
  );
}
