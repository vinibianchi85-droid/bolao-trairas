# Bolão Traíras F.C. — Mini App

Mini app com cadastro, palpites, ranking automático e área admin.

## Prazo de bloqueio
Configurado para **10/06/2026 às 23:59:59**, horário de Brasília.
Depois disso, ninguém consegue inserir ou alterar palpites.

## Como colocar online, sem custo
1. Crie uma conta grátis no Supabase.
2. Crie um projeto.
3. Vá em SQL Editor e rode o arquivo `supabase_schema.sql`.
4. Crie uma conta grátis na Vercel.
5. Suba este projeto na Vercel.
6. Configure as variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_LOCK_AT=2026-06-10T23:59:59-03:00`

## Rodar no computador
```bash
npm install
cp .env.example .env
npm run dev
```

## Regras de pontuação
- Placar exato: 5 pontos
- Acertou vencedor/empate: 3 pontos
- Acertou um dos gols: 1 ponto
- Errou tudo: 0 ponto

## Observação
Os 104 jogos vêm como "Time 1A x Time 1B" etc. O administrador pode editar os nomes no banco ou diretamente no Supabase.
