import { notFound } from "next/navigation";
import { Calibrador } from "@/components/calibrador";

/**
 * Ferramenta de calibração das mobílias.
 *
 * Fechada por padrão — inclusive em produção — porque os dois andares já
 * estão calibrados e a página não tem motivo para ficar exposta: ela não lê
 * nem escreve nada no banco, mas mostra o layout interno por inteiro.
 *
 * Para usar (local ou produção), defina GX_CALIBRATOR=1 no ambiente. Em
 * produção isso exige definir a variável na Vercel e fazer redeploy — mudança
 * de env var nunca vale para o deployment que já está no ar.
 */
export default function CalibrarPage() {
  if (process.env.GX_CALIBRATOR !== "1") notFound();
  return <Calibrador />;
}
