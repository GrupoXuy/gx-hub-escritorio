import { loginByEmail } from "@/lib/auth-login";

export const dynamic = "force-dynamic";

/**
 * Deprecada — não use.
 *
 * Apesar do nome, esta rota NUNCA trocou senha: sempre foi um segundo
 * endpoint de login. Quem troca credenciais de verdade é
 * `/api/auth/credentials`.
 *
 * Está mantida apenas para não derrubar abas abertas com um bundle antigo do
 * front-end (a tela de login passou a chamar `/api/auth/login`). Remover
 * depois de um ciclo completo de deploy.
 */
export async function POST(request: Request) {
  return loginByEmail(request);
}
