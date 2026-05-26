
import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase, LOCK_AT } from './supabase'
import { Trophy, Lock, Users, Save, LogOut, Shield, Table2 } from 'lucide-react'
import './style.css'

function calcPoints(ha, hb, ga, gb) {
  if ([ha, hb, ga, gb].some(v => v === null || v === undefined || v === '')) return 0
  ha = Number(ha); hb = Number(hb); ga = Number(ga); gb = Number(gb)
  if (ga === ha && gb === hb) return 5
  const gr = ga === gb ? 'E' : ga > gb ? 'A' : 'B'
  const rr = ha === hb ? 'E' : ha > hb ? 'A' : 'B'
  if (gr === rr) return 3
  if (ga === ha || gb === hb) return 1
  return 0
}

function locked() {
  return new Date() > LOCK_AT
}

function usuarioToEmail(usuario) {
  const clean = (usuario || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '')

  if (!clean) return ''
  if (clean.includes('@')) return clean
  return `${clean}@bolao-trairas.local`
}


function App() {
  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [whats, setWhats] = useState('')
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [guesses, setGuesses] = useState({})
  const [ranking, setRanking] = useState([])
  const [tab, setTab] = useState('palpites')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    loadAll()
  }, [session])

  async function signUp() {
    setMsg('')
    const authEmail = usuarioToEmail(usuario)
    const username = (usuario || '').trim().toLowerCase()

    if (!nome || !username || !senha) return setMsg('Preencha nome, usuário e senha.')
    if (senha.length < 6) return setMsg('A senha precisa ter pelo menos 6 caracteres.')
    if (!authEmail) return setMsg('Usuário inválido. Use letras, números, ponto, traço ou underline.')

    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: senha })
    if (error) return setMsg(error.message)

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nome,
        whatsapp: whats,
        username,
        email: authEmail,
        is_admin: false
      })
      setMsg('Cadastro criado com sucesso! Agora entre usando seu usuário e senha.')
    }
  }

  async function login() {
    setMsg('')
    const authEmail = usuarioToEmail(usuario)
    if (!authEmail || !senha) return setMsg('Informe usuário e senha.')

    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: senha })
    if (error) setMsg('Usuário ou senha incorretos.')
  }

  async function logout() {
    await supabase.auth.signOut()
    setSession(null)
  }

  async function loadAll() {
    const uid = (await supabase.auth.getUser()).data.user.id
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(prof)

    const { data: gameData } = await supabase.from('games').select('*').order('game_no')
    setGames(gameData || [])

    const { data: guessData } = await supabase.from('guesses').select('*').eq('user_id', uid)
    const map = {}
    ;(guessData || []).forEach(g => { map[g.game_id] = g })
    setGuesses(map)

    await loadRanking()
  }

  async function loadRanking() {
    const { data: players } = await supabase.from('profiles').select('id,nome')
    const { data: allGuesses } = await supabase.from('guesses').select('*')
    const { data: gameData } = await supabase.from('games').select('*')

    const rows = (players || []).map(p => {
      let pontos = 0
      let exatos = 0
      ;(allGuesses || []).filter(g => g.user_id === p.id).forEach(g => {
        const game = (gameData || []).find(x => x.id === g.game_id)
        if (!game || game.home_score === null || game.away_score === null) return
        const pts = calcPoints(game.home_score, game.away_score, g.guess_home, g.guess_away)
        pontos += pts
        if (pts === 5) exatos += 1
      })
      return { nome: p.nome || 'Sem nome', pontos, exatos }
    }).sort((a,b) => b.pontos - a.pontos || b.exatos - a.exatos)

    setRanking(rows)
  }

  function setGuess(gameId, field, value) {
    if (locked()) return
    if (value !== '' && (Number(value) < 0 || Number(value) > 30)) return
    setGuesses(old => ({ ...old, [gameId]: { ...(old[gameId] || {}), [field]: value } }))
  }

  async function saveGuesses() {
    if (locked()) return setMsg('Palpites bloqueados. O prazo já encerrou.')
    const uid = session.user.id
    const rows = Object.entries(guesses).map(([game_id, g]) => ({
      user_id: uid,
      game_id,
      guess_home: g.guess_home === '' ? null : Number(g.guess_home),
      guess_away: g.guess_away === '' ? null : Number(g.guess_away)
    }))
    const { error } = await supabase.from('guesses').upsert(rows, { onConflict: 'user_id,game_id' })
    if (error) setMsg(error.message)
    else setMsg('Palpites salvos com sucesso!')
    await loadRanking()
  }

  async function updateResult(game, side, value) {
    if (!profile?.is_admin) return
    const payload = side === 'home' ? { home_score: value === '' ? null : Number(value) } : { away_score: value === '' ? null : Number(value) }
    await supabase.from('games').update(payload).eq('id', game.id)
    await loadAll()
  }

  const total = useMemo(() => games.reduce((acc, game) => {
    const g = guesses[game.id]
    return acc + calcPoints(game.home_score, game.away_score, g?.guess_home, g?.guess_away)
  }, 0), [games, guesses])

  if (!session) {
    return <main className="page login">
      <section className="hero">
        <div className="badge"><Trophy/> Bolão Traíras F.C.</div>
        <h1>Bolão estilo Copa do Mundo</h1>
        <p>Cadastro dos participantes, palpites bloqueados em {LOCK_AT.toLocaleString('pt-BR')} e ranking automático rodada a rodada.</p>
      </section>
      <section className="card form">
        <h2>Entrar ou cadastrar</h2>
        <p className="loginHint">Depois do cadastro, entre usando usuário e senha.</p>
        <input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
        <input placeholder="WhatsApp" value={whats} onChange={e => setWhats(e.target.value)} />
        <input placeholder="Usuário" value={usuario} onChange={e => setUsuario(e.target.value)} />
        <input placeholder="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} />
        <button onClick={login}>Entrar</button>
        <button className="secondary" onClick={signUp}>Criar cadastro</button>
        {msg && <p className="msg">{msg}</p>}
      </section>
    </main>
  }

  return <main className="page">
    <header className="top">
      <div>
        <div className="badge"><Trophy/> Bolão Traíras F.C.</div>
        <h1>Área do Participante</h1>
        <p>{locked() ? 'Palpites bloqueados: prazo encerrado.' : `Palpites liberados até ${LOCK_AT.toLocaleString('pt-BR')}.`}</p>
      </div>
      <button className="secondary small" onClick={logout}><LogOut/> Sair</button>
    </header>

    <div className="stats">
      <div className="stat"><Users/><span>Participante</span><b>{profile?.nome || 'Sem nome'}</b></div>
      <div className="stat"><Trophy/><span>Meus pontos</span><b>{total}</b></div>
      <div className="stat"><Lock/><span>Status</span><b>{locked() ? 'Bloqueado' : 'Aberto'}</b></div>
      <div className="stat"><Shield/><span>Admin</span><b>{profile?.is_admin ? 'Sim' : 'Não'}</b></div>
    </div>

    <nav className="tabs">
      <button onClick={() => setTab('palpites')} className={tab==='palpites'?'active':''}><Table2/> Palpites</button>
      <button onClick={() => setTab('ranking')} className={tab==='ranking'?'active':''}><Trophy/> Ranking</button>
      {profile?.is_admin && <button onClick={() => setTab('admin')} className={tab==='admin'?'active':''}><Shield/> Admin</button>}
    </nav>

    {msg && <p className="msg">{msg}</p>}

    {tab === 'palpites' && <section className="card">
      <h2>Meus palpites</h2>
      <div className="games">
        {games.map(game => {
          const g = guesses[game.id] || {}
          const pts = calcPoints(game.home_score, game.away_score, g.guess_home, g.guess_away)
          return <div className="game" key={game.id}>
            <span className="fase">
            {game.phase}<br />
            {game.starts_at ? new Date(game.starts_at).toLocaleString('pt-BR') : ''}
          </span>
            <b className="team right">{game.home_team}</b>
            <input disabled={locked()} value={g.guess_home ?? ''} onChange={e => setGuess(game.id, 'guess_home', e.target.value)} />
            <span>x</span>
            <input disabled={locked()} value={g.guess_away ?? ''} onChange={e => setGuess(game.id, 'guess_away', e.target.value)} />
            <b className="team">{game.away_team}</b>
            <span className="official">{game.home_score === null ? 'Sem resultado' : `${game.home_score} x ${game.away_score}`} · {pts} pts</span>
          </div>
        })}
      </div>
      <button disabled={locked()} onClick={saveGuesses}><Save/> Salvar palpites</button>
    </section>}

    {tab === 'ranking' && <section className="card">
      <h2>Ranking</h2>
      {ranking.map((r, i) => <div className="rank" key={r.nome}>
        <strong>{i + 1}º</strong>
        <span>{r.nome}</span>
        <b>{r.pontos} pts</b>
        <small>{r.exatos} exatos</small>
      </div>)}
    </section>}

    {tab === 'admin' && <section className="card">
      <h2>Lançar resultados oficiais</h2>
      <div className="games">
        {games.map(game => <div className="game" key={game.id}>
          <span className="fase">
            {game.phase}<br />
            {game.starts_at ? new Date(game.starts_at).toLocaleString('pt-BR') : ''}
          </span>
          <b className="team right">{game.home_team}</b>
          <input value={game.home_score ?? ''} onChange={e => updateResult(game, 'home', e.target.value)} />
          <span>x</span>
          <input value={game.away_score ?? ''} onChange={e => updateResult(game, 'away', e.target.value)} />
          <b className="team">{game.away_team}</b>
          <span className="official">Resultado oficial</span>
        </div>)}
      </div>
    </section>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
 