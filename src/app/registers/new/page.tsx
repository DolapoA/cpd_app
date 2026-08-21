import { createRegister } from "@/lib/actions";
import { requireConfirmedUser } from "@/lib/auth";
import { RegisterFields } from "@/components/register-fields";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "New register — CPD Register" };

export default async function NewRegisterPage() {
  const user = await requireConfirmedUser();

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Create an attendance register</h1>
          <p>
            It opens at the start time and closes automatically afterwards, so signatures are
            credible evidence.
          </p>
        </div>
      </div>
      <div className="card">
        <ActionForm action={createRegister} submitLabel="Create register">
          <RegisterFields defaultOrganiser={user.full_name} />
        </ActionForm>
      </div>
    </main>
  );
}
