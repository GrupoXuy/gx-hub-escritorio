import { loginByEmail } from "@/lib/auth-login";

export async function POST(request: Request) {
  return loginByEmail(request);
}
