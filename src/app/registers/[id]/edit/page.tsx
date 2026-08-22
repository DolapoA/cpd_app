import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type Register } from "@/lib/db";
import { updateRegister } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { RegisterFields } from "@/components/register-fields";
import { isOrganiserPlan } from "@/lib/entitlements";

export const metadata = { title: "Edit event — CPD Register" };

export default async function EditRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireConfirmedUser();
  const { id } = await params;

  const db = await getDb();
  const register = (await db
    .prepare("SELECT * FROM registers WHERE id = ?")
    .get(Number(id))) as Register | undefined;
  // Somebody else's register is not found, rather than forbidden: whether a
  // register exists is not a fact worth confirming to a stranger.
  if (!register || register.organiser_id !== user.id) notFound();

  const signed = Number(
    ((await db
      .prepare("SELECT COUNT(*) AS c FROM signatures WHERE register_id = ? AND voided = 0")
      .get(register.id)) as { c: string }).c
  );

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Edit this event</h1>
          <p>
            <Link href={`/registers/${register.id}`}>&larr; Back to {register.title}</Link>
          </p>
        </div>
      </div>

      {/* The warning is specific or it is decoration. How many people, what
          exactly changes for them, and the one part we cannot fix for you. */}
      <div className="notice notice--warn">
        <h3 className="notice__title">
          {signed === 0
            ? "Nobody has signed this yet"
            : `${signed} ${signed === 1 ? "person has" : "people have"} already signed`}
        </h3>
        {signed === 0 ? (
          <p className="small">
            You can change anything here freely. The join code and QR stay as they are, so
            anything you have already handed out still works.
          </p>
        ) : (
          <p className="small">
            Their attendance slips are generated from this event, so changing it changes what
            those slips say &mdash; including any already downloaded. The entry on each person&rsquo;s
            own CPD record will be corrected to match, unless they have edited it themselves, in
            which case theirs is left alone.
          </p>
        )}
        <p className="small">
          <strong>Anyone you have invited still has the old details.</strong> The joining code and
          QR are unchanged, but the date, time and venue on whatever you sent them are not &mdash;
          you will need to tell them what has changed.
        </p>
      </div>

      <div className="card">
        <ActionForm action={updateRegister} submitLabel="Save changes">
          <input type="hidden" name="id" value={register.id} />
          <RegisterFields defaultOrganiser={user.full_name} register={register} organiserPlan={isOrganiserPlan(user)} />
        </ActionForm>
      </div>
    </main>
  );
}
