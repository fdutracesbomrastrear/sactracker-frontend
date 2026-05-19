import { redirect } from 'next/navigation';

export default function Home() {
  // Por enquanto, vamos redirecionar a página inicial direto para o Login.
  // Depois que tivermos o sistema de autenticação, verificaremos se o usuário
  // está logado para mandar para /inbox, senão vai para /login.
  redirect('/login');
}
