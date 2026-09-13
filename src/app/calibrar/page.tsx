import { notFound } from "next/navigation";
import { Calibrador } from "@/components/calibrador";

/**
 * Ferramenta de calibração das mobílias.
 *
 * Disponível em desenvolvimento. Em produção fica desligada por padrão e
 * precisa ser habilitada de propósito com `GX_CALIBRATOR=1` — a página não
 * lê nem escreve nada no banco (só posiciona pontos sobre a ilustração), mas
 * não faz sentido deixá-la aberta no app de produção sem querer.
 */
export default function CalibrarPage() {
  const enabled = process.env.NODE_ENV !== "production" || process.env.GX_CALIBRATOR === "1";
  if (!enabled) notFound();
  return <Calibrador />;
}
