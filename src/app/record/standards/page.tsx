import { redirect } from "next/navigation";

/** Superseded by /record/complete, which covers standards alongside the other
 *  things an entry can be missing. Kept so existing links still land somewhere. */
export default function StandardsPageRedirect() {
  redirect("/record/complete");
}
