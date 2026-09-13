import { notFound } from "next/navigation";
import { Calibrador } from "@/components/calibrador";

/**
 * Ferramenta de calibração das mobílias.
 *
 * Ligada por padrão — inclusive em produção — porque o preview do sandbox é
 * efêmero e derrubar o acesso a esta página travava a calibração. A página
 * não lê nem escreve nada no banco: só posiciona pontos sobre a ilustração.
 *
 * Para desligar, defina GX_CALIBRATOR=0 no ambiente.
 */
export default function CalibrarPage() {
  if (process.env.GX_CALIBRATOR === "0") notFound();
  return <Calibrador />;
}
