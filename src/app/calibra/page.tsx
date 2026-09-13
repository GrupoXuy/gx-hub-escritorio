import { redirect } from "next/navigation";

/**
 * Atalho tolerante a digitação: "/calibra" (sem o r final) leva para a
 * ferramenta de calibração em vez de devolver 404.
 */
export default function CalibraRedirect() {
  redirect("/calibrar");
}
