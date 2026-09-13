import { notFound } from "next/navigation";
import { Calibrador } from "@/components/calibrador";

/**
 * Ferramenta de calibração das mobílias. Só existe em desenvolvimento:
 * em produção a rota responde 404.
 */
export default function CalibrarPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Calibrador />;
}
