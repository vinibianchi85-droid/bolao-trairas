import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase, LOCK_AT } from './supabase'
import { Trophy, Lock, Users, Save, LogOut, Shield, Table2, Share2, Medal, Search, CalendarDays, Crown } from 'lucide-react'
import './style.css'

const FLAGS = {
  'Brasil':'🇧🇷','México':'🇲🇽','África do Sul':'🇿🇦','Coreia do Sul':'🇰🇷','Tchéquia':'🇨🇿','Canadá':'🇨🇦',
  'Bósnia-Herzegovina':'🇧🇦','Estados Unidos':'🇺🇸','Paraguai':'🇵🇾','Austrália':'🇦🇺','Turquia':'🇹🇷',
  'Catar':'🇶🇦','Suíça':'🇨🇭','Haiti':'🇭🇹','Escócia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Alemanha':'🇩🇪','Curaçao':'🇨🇼',
  'Holanda':'🇳🇱','Japão':'🇯🇵','Costa do Marfim':'🇨🇮','Equador':'🇪🇨','Suécia':'🇸🇪','Tunísia':'🇹🇳',
  'Arábia Saudita':'🇸🇦','Uruguai':'🇺🇾','Espanha':'🇪🇸','Cabo Verde':'🇨🇻','Irã':'🇮🇷','Nova Zelândia':'🇳🇿',
  'Bélgica':'🇧🇪','Egito':'🇪🇬','França':'🇫🇷','Senegal':'🇸🇳','Iraque':'🇮🇶','Noruega':'🇳🇴',
  'Argentina':'🇦🇷','Argélia':'🇩🇿','Áustria':'🇦🇹','Jordânia':'🇯🇴','Gana':'🇬🇭','Panamá':'🇵🇦',
  'Inglaterra':'🏴','Croácia':'🇭🇷','Portugal':'🇵🇹','RD Congo':'🇨🇩','Uzbequistão':'🇺🇿','Colômbia':'🇨🇴'
}

function flag(team) {
  return FLAGS[team] || '⚽'
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function resultOf(a, b) {
  if (a === null || b === null || a === undefined || b === undefined || a === '' || b === '') return null
  a = Number(a); b = Number(b)
  if (a === b) return 'E'
  return a > b ? 'A' : 'B'
}

function calcPoints(ha, hb, ga, gb) {
  if ([ha, hb, ga, gb].some(v => v === null || v === undefined || v === '')) return 0
  ha = Number(ha); hb = Number(hb); ga = Number(ga); gb = Number(gb)
  if (ga === ha && gb === hb) return 5
  if (resultOf(ga, gb) === resultOf(ha, hb)) return 3
  if (ga === ha || gb === hb) return 1
  return 0
}

function locked() {
  return new Date() > LOCK_AT
}

function teamPoints(game, side) {
  if (game.home_score === null || game.away_score === null) return 0
  const r = resultOf(game.home_score, game.away_score)
  if (r === 'E') return 1
  if (side === 'home' && r === 'A') return 3
  if (side === 'away' && r === 'B') return 3
  return 0
}

function makeGroupTables(games) {
  const tables = {}
  games.filter(g => (g.phase || '').startsWith('Grupo')).forEach(g => {
    const group = g.phase
    tables[group] ||= {}
    ;[g.home_team, g.away_team].forEach(t => {
      tables[group][t] ||= { team: t, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 }
    })
    if (g.home_score !== null && g.away_score !== null) {
      const h = tables[group][g.home_team]
      const a = tables[group][g.away_team]
      h.j++; a.j++
      h.gp += Number(g.home_score); h.gc += Number(g.away_score)
      a.gp += Number(g.away_score); a.gc += Number(g.home_score)
      h.pts += teamPoints(g, 'home')
      a.pts += teamPoints(g, 'away')
      if (g.home_score > g.away_score) { h.v++; a.d++ }
      else if (g.home_score < g.away_score) { a.v++; h.d++ }
      else { h.e++; a.e++ }
      h.sg = h.gp - h.gc
      a.sg = a.gp - a.gc
    }
  })
  return Object.fromEntries(Object.entries(tables).map(([grp, teams]) => [
    grp, Object.values(teams).sort((a,b) => b.pts-a.pts || b.sg-a.sg || b.gp-a.gp || a.team.localeCompare(b.team))
  ]))
}

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [whats, setWhats] = useState('')
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [guesses, setGuesses] = useState({})
  const [ranking, setRanking] = useState([])
  const [tab, setTab] = useState('palpites')
  const [msg, setMsg] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todos')

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
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) return setMsg(error.message)
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, nome, whatsapp: whats, is_admin: false })
      setMsg('Cadastro criado com sucesso! Agora pode entrar no bolão.')
    }
  }

  async function login() {
    setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setMsg(error.message)
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
      let acertos = 0
      ;(allGuesses || []).filter(g => g.user_id === p.id).forEach(g => {
        const game = (gameData || []).find(x => x.id === g.game_id)
        if (!game || game.home_score === null || game.away_score === null) return
        const pts = calcPoints(game.home_score, game.away_score, g.guess_home, g.guess_away)
        pontos += pts
        if (pts === 5) exatos += 1
        if (pts > 0) acertos += 1
      })
      return { nome: p.nome || 'Sem nome', pontos, exatos, acertos }
    }).sort((a,b) => b.pontos - a.pontos || b.exatos - a.exatos || b.acertos - a.acertos)

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

  function shareRanking() {
    const text = `🏆 Ranking Bolão Traíras F.C.%0A` + ranking.slice(0,10).map((r,i) => `${i+1}º ${r.nome} - ${r.pontos} pts`).join('%0A')
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const total = useMemo(() => games.reduce((acc, game) => {
    const g = guesses[game.id]
    return acc + calcPoints(game.home_score, game.away_score, g?.guess_home, g?.guess_away)
  }, 0), [games, guesses])

  const phases = useMemo(() => ['Todos', ...Array.from(new Set(games.map(g => g.phase)))], [games])
  const groupTables = useMemo(() => makeGroupTables(games), [games])
  const filteredGames = games.filter(g => {
    const q = `${g.game_no} ${g.phase} ${g.home_team} ${g.away_team}`.toLowerCase()
    const okBusca = q.includes(busca.toLowerCase())
    const okFiltro = filtro === 'Todos' || g.phase === filtro
    return okBusca && okFiltro
  })

  if (!session) {
    return <main className="page login">
      <section className="hero">
        <div className="crest">🐟</div>
        <div className="badge"><Trophy/> Copa do Mundo 2026</div>
        <h1>Bolão Traíras F.C.</h1>
        <p>Palpites, ranking ao vivo, tabela da Copa e disputa bagual entre amigos.</p>
        <div className="heroCards">
          <span>⚽ 104 jogos</span>
          <span>🔒 Bloqueio em {LOCK_AT.toLocaleDateString('pt-BR')}</span>
          <span>🏆 Ranking automático</span>
        </div>
      </section>
      <section className="card form">
        <h2>Entrar ou cadastrar</h2>
        <input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
        <input placeholder="WhatsApp" value={whats} onChange={e => setWhats(e.target.value)} />
        <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
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
      <div className="stat"><Medal/><span>Líder</span><b>{ranking[0]?.nome || '-'}</b></div>
    </div>

    <nav className="tabs">
      <button onClick={() => setTab('palpites')} className={tab==='palpites'?'active':''}><Table2/> Palpites</button>
      <button onClick={() => setTab('ranking')} className={tab==='ranking'?'active':''}><Trophy/> Ranking</button>
      <button onClick={() => setTab('grupos')} className={tab==='grupos'?'active':''}><CalendarDays/> Grupos</button>
      <button onClick={() => setTab('mata')} className={tab==='mata'?'active':''}><Crown/> Mata-mata</button>
      <button onClick={() => setTab('regras')} className={tab==='regras'?'active':''}><Shield/> Regras</button>
      {profile?.is_admin && <button onClick={() => setTab('admin')} className={tab==='admin'?'active':''}><Shield/> Admin</button>}
    </nav>

    {msg && <p className="msg">{msg}</p>}

    {tab === 'palpites' && <section className="card">
      <div className="cardTitle">
        <h2>Meus palpites</h2>
        <div className="filters">
          <Search size={18}/>
          <input placeholder="Buscar jogo..." value={busca} onChange={e => setBusca(e.target.value)} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)}>
            {phases.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="games">
        {filteredGames.map(game => {
          const g = guesses[game.id] || {}
          const pts = calcPoints(game.home_score, game.away_score, g.guess_home, g.guess_away)
          return <div className="game" key={game.id}>
            <span className="fase">Jogo {game.game_no}<br />{game.phase}<br />{formatDate(game.starts_at)}</span>
            <b className="team right"><span>{flag(game.home_team)}</span> {game.home_team}</b>
            <input disabled={locked()} value={g.guess_home ?? ''} onChange={e => setGuess(game.id, 'guess_home', e.target.value)} />
            <span className="versus">x</span>
            <input disabled={locked()} value={g.guess_away ?? ''} onChange={e => setGuess(game.id, 'guess_away', e.target.value)} />
            <b className="team">{flag(game.away_team)} {game.away_team}</b>
            <span className="official">{game.home_score === null ? 'Sem resultado' : `${game.home_score} x ${game.away_score}`} · {pts} pts</span>
          </div>
        })}
      </div>
      <button disabled={locked()} onClick={saveGuesses}><Save/> Salvar palpites</button>
    </section>}

    {tab === 'ranking' && <section className="card">
      <div className="cardTitle">
        <h2>Ranking ao vivo</h2>
        <button className="whats" onClick={shareRanking}><Share2/> Compartilhar</button>
      </div>
      {ranking.map((r, i) => <div className={`rank ${i===0?'leader':''}`} key={r.nome}>
        <strong>{i + 1}º</strong>
        <span>{i===0 ? '👑 ' : ''}{r.nome}</span>
        <b>{r.pontos} pts</b>
        <small>{r.exatos} exatos · {r.acertos} acertos</small>
      </div>)}
    </section>}

    {tab === 'grupos' && <section className="card">
      <h2>Classificação automática dos grupos</h2>
      <div className="groupsGrid">
        {Object.entries(groupTables).map(([group, rows]) => <div className="groupBox" key={group}>
          <h3>{group}</h3>
          <table>
            <thead><tr><th>Seleção</th><th>Pts</th><th>J</th><th>SG</th></tr></thead>
            <tbody>{rows.map((r, idx) => <tr key={r.team} className={idx < 2 ? 'qualified' : ''}>
              <td>{flag(r.team)} {r.team}</td><td>{r.pts}</td><td>{r.j}</td><td>{r.sg}</td>
            </tr>)}</tbody>
          </table>
        </div>)}
      </div>
    </section>}

    {tab === 'mata' && <section className="card">
      <h2>Mata-mata visual</h2>
      <p className="muted">Os confrontos aparecem conforme a tabela oficial. Quando os resultados forem lançados, tu pode atualizar os nomes dos classificados no Admin/Supabase.</p>
      <div className="bracket">
        {games.filter(g => !(g.phase || '').startsWith('Grupo')).map(g => <div className="bracketGame" key={g.id}>
          <small>Jogo {g.game_no} · {g.phase} · {formatDate(g.starts_at)}</small>
          <b>{flag(g.home_team)} {g.home_team}</b>
          <span>x</span>
          <b>{flag(g.away_team)} {g.away_team}</b>
        </div>)}
      </div>
    </section>}

    {tab === 'regras' && <section className="card">
      <h2>Regras do bolão</h2>
      <div className="rules">
        <div><b>5 pontos</b><span>Placar exato.</span></div>
        <div><b>3 pontos</b><span>Acertou vencedor ou empate.</span></div>
        <div><b>1 ponto</b><span>Acertou os gols de uma seleção.</span></div>
        <div><b>0 ponto</b><span>Errou resultado e placar.</span></div>
        <div><b>Desempate</b><span>Mais placares exatos, depois mais acertos.</span></div>
        <div><b>Bloqueio</b><span>Após o prazo final, ninguém altera palpites.</span></div>
      </div>
    </section>}

    {tab === 'admin' && <section className="card">
      <h2>Painel admin — lançar resultados oficiais</h2>
      <div className="games">
        {filteredGames.map(game => <div className="game" key={game.id}>
          <span className="fase">Jogo {game.game_no}<br />{game.phase}<br />{formatDate(game.starts_at)}</span>
          <b className="team right">{flag(game.home_team)} {game.home_team}</b>
          <input value={game.home_score ?? ''} onChange={e => updateResult(game, 'home', e.target.value)} />
          <span className="versus">x</span>
          <input value={game.away_score ?? ''} onChange={e => updateResult(game, 'away', e.target.value)} />
          <b className="team">{flag(game.away_team)} {game.away_team}</b>
          <span className="official">Resultado oficial</span>
        </div>)}
      </div>
    </section>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
