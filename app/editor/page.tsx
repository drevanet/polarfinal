import { redirect } from "next/navigation";
import Editor from "@/components/Editor";
import { getCurrentUser } from "@/lib/auth";

export default async function EditorPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/editor");
  }

  return <Editor userName={user.name || user.email} />;
}
