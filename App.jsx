import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase, LOCK_AT } from './supabase'
import {
  Trophy, Lock, Users, Save, LogOut, Shield, Table2, Share2, Medal, Search,
  CalendarDays, Crown, Sparkles, Flame, Clock, RefreshCw, Eye, EyeOff
} from 'lucide-react'
import './style.css'

const LOGO_TRAIRAS = '/logo-trairas.png'

const FLAGS = {
  'Brasil':'🇧🇷','México':'🇲🇽','África do Sul':'🇿🇦','Coreia do Sul':'🇰🇷','Tchéquia':'🇨🇿','Canadá':'🇨🇦',
  'Bósnia-Herzegovina':'🇧🇦','Estados Unidos':'🇺🇸','Paraguai':'🇵🇾','Austrália':'🇦🇺','Turquia':'🇹🇷',
  'Catar':'🇶🇦','Suíça':'🇨🇭','Haiti':'🇭🇹','Escócia':'🏴','Alemanha':'🇩🇪','Curaçao':'🇨🇼',
  'Holanda':'🇳🇱','Japão':'🇯🇵','Costa do Marfim':'🇨🇮','Equador':'🇪🇨','Suécia':'🇸🇪','Tunísia':'🇹🇳',
  'Arábia Saudita':'🇸🇦','Uruguai':'🇺🇾','Espanha':'🇪🇸','Cabo Verde':'🇨🇻','Irã':'🇮🇷','Nova Zelândia':'🇳🇿',
  'Bélgica':'🇧🇪','Egito':'🇪🇬','França':'🇫🇷','Senegal':'🇸🇳','Iraque':'🇮🇶','Noruega':'🇳🇴',
  'Argentina':'🇦🇷','Argélia':'🇩🇿','Áustria':'🇦🇹','Jordânia':'🇯🇴','Gana':'🇬🇭','Panamá':'🇵🇦',
  'Inglaterra':'🏴','Croácia':'🇭🇷','Portugal':'🇵🇹','RD Congo':'🇨🇩','Uzbequistão':'🇺🇿','Colômbia':'🇨🇴'
}

function flag(team) { return FLAGS[team] || '⚽' }

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  }).replace('.', '')
}

function formatLongDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
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

function locked() { return new Date() > LOCK_AT }

function gameLocked(game) {
  if (locked()) return true
  if (!game.starts_at) return false
  return new Date() > new Date(game.starts_at)
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

function nextGames(games) {
  const now = new Date()
  return games.filter(g => g.starts_at && new Date(g.starts_at) > now).slice(0, 4)
}

function groupGamesByPhase(games) {
  return games.reduce((acc, game) => {
    const phase = game.phase || 'Outros'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(game)
    return acc
  }, {})
}


function ProgressRing({value}) {
  const v = Math.max(0, Math.min(100, value || 0))
  return <div className="progressRing" style={{'--p': `${v}%`}}><span>{Math.round(v)}%</span></div>
}

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [whats, setWhats] = useState('')
  const [showPass, setShowPass] = useState(false)
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
    if (!nome || !whats || !email || !senha) return setMsg('Preencha nome, telefone, e-mail e senha.')
    const authEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: senha })
    if (error) return setMsg(error.message)
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, nome, whatsapp: whats, email: authEmail, username: authEmail, is_admin: false })
      setMsg(`Cadastro criado! Seu e-mail de acesso é: ${authEmail}`)
    }
  }

  async function login() {
    setMsg('')
    const authEmail = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: senha })
    if (error) setMsg('E-mail ou senha incorretos.')
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

  function setGuess(game, field, value) {
    if (gameLocked(game)) return
    if (value !== '' && (Number(value) < 0 || Number(value) > 30)) return
    setGuesses(old => ({ ...old, [game.id]: { ...(old[game.id] || {}), [field]: value } }))
  }

  async function saveGuesses() {
    if (locked()) return setMsg('Palpites bloqueados. O prazo geral já encerrou.')
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

  const filled = useMemo(() => {
    const n = Object.values(guesses).filter(g => g.guess_home !== null && g.guess_home !== undefined && g.guess_home !== '' && g.guess_away !== null && g.guess_away !== undefined && g.guess_away !== '').length
    return games.length ? (n / games.length) * 100 : 0
  }, [games, guesses])

  const phases = useMemo(() => ['Todos', ...Array.from(new Set(games.map(g => g.phase)))], [games])
  const groupTables = useMemo(() => makeGroupTables(games), [games])
  const upcoming = useMemo(() => nextGames(games), [games])
  const filteredGames = games.filter(g => {
    const q = `${g.game_no} ${g.phase} ${g.home_team} ${g.away_team}`.toLowerCase()
    const okBusca = q.includes(busca.toLowerCase())
    const okFiltro = filtro === 'Todos' || g.phase === filtro
    return okBusca && okFiltro
  })

  const groupedTableGames = useMemo(() => groupGamesByPhase(filteredGames), [filteredGames])

  if (!session) {
    return <main className="page login">
      <section className="hero">
        <div className="shine"></div>
        <div className="crestCard">
          <img className="logoTrairasHero" src={LOGO_TRAIRAS} alt="Traíras F.C." />
          <span>Traíras F.C.</span>
        </div>
        <div className="badge"><Trophy/> Copa do Mundo 2026</div>
        <h1>Bolão Traíras F.C.</h1>
        <p>Palpites, ranking ao vivo, tabela completa e disputa bagual entre amigos.</p>
        <div className="heroCards">
          <span>⚽ 104 jogos</span>
          <span>🔒 Bloqueio geral em {LOCK_AT.toLocaleDateString('pt-BR')}</span>
          <span>🏆 Ranking automático</span>
          <span>📱 Feito para celular</span>
        </div>
      </section>
      <section className="card form">
        <h2>Entrar ou cadastrar</h2>
        <p className="loginHint">Use o e-mail cadastrado como usuário de acesso.</p>
        <input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
        <input placeholder="WhatsApp" value={whats} onChange={e => setWhats(e.target.value)} />
        <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
        <div className="passBox">
          <input placeholder="Senha" type={showPass ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} />
          <button type="button" className="iconBtn" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff/> : <Eye/>}</button>
        </div>
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
        <p>{locked() ? 'Palpites bloqueados: prazo geral encerrado.' : `Palpites liberados até ${LOCK_AT.toLocaleString('pt-BR')}.`}</p>
      </div>
      <div className="topActions">
        <button className="secondary small" onClick={loadAll}><RefreshCw/> Atualizar</button>
        <button className="secondary small" onClick={logout}><LogOut/> Sair</button>
      </div>
    </header>

    <div className="dashboard">
      <div className="mainScore">
        <div>
          <span>Meus pontos</span>
          <strong>{total}</strong>
          <small>{profile?.nome || 'Participante'}</small>
        </div>
        <ProgressRing value={filled}/>
      </div>
      <div className="stats">
        <div className="stat"><Users/><span>Participantes</span><b>{ranking.length}</b></div>
        <div className="stat"><Lock/><span>Status</span><b>{locked() ? 'Bloqueado' : 'Aberto'}</b></div>
        <div className="stat"><Medal/><span>Líder</span><b>{ranking[0]?.nome || '-'}</b></div>
        <div className="stat"><Flame/><span>Meus palpites</span><b>{Math.round(filled)}%</b></div>
      </div>
    </div>

    <section className="nextPanel">
      <div className="panelTitle"><Clock/> Próximos jogos</div>
      <div className="nextGrid">
        {upcoming.map(g => <div className="nextGame" key={g.id}>
          <small>Jogo {g.game_no} · {formatDate(g.starts_at)}</small>
          <b>{flag(g.home_team)} {g.home_team}</b>
          <span>x</span>
          <b>{flag(g.away_team)} {g.away_team}</b>
        </div>)}
      </div>
    </section>

    <nav className="tabs">
      <button onClick={() => setTab('palpites')} className={tab==='palpites'?'active':''}><Table2/> Palpites</button>
      <button onClick={() => setTab('ranking')} className={tab==='ranking'?'active':''}><Trophy/> Ranking</button>
      <button onClick={() => setTab('grupos')} className={tab==='grupos'?'active':''}><CalendarDays/> Grupos</button>
      <button onClick={() => setTab('mata')} className={tab==='mata'?'active':''}><Crown/> Mata-mata</button>
      <button onClick={() => setTab('regras')} className={tab==='regras'?'active':''}><Sparkles/> Regras</button>
      {profile?.is_admin && <button onClick={() => setTab('admin')} className={tab==='admin'?'active':''}><Shield/> Admin</button>}
    </nav>

    {msg && <p className="msg">{msg}</p>}

    {tab === 'palpites' && <section className="palpitesPoster">
      <div className="tablePosterHeader palpitesHeader">
        <div>
          <span>Bolão Traíras F.C.</span>
          <h2>Meus Palpites</h2>
          <p>Preencha os placares direto na tabela da Copa 2026</p>
        </div>
        <div className="posterLogo logoBox">
          <img src={LOGO_TRAIRAS} alt="Traíras F.C." />
        </div>
      </div>

      <div className="posterControls">
        <div className="filters">
          <Search size={18}/>
          <input placeholder="Buscar jogo, grupo ou seleção..." value={busca} onChange={e => setBusca(e.target.value)} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)}>
            {phases.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button disabled={locked()} onClick={saveGuesses}><Save/> Salvar palpites</button>
      </div>

      <img className="logoWatermarkTrairas" src={LOGO_TRAIRAS} alt="" />
      <div className="posterGrid palpitesPosterGrid">
        {Object.entries(groupedTableGames).map(([phaseName, phaseGames]) => (
          <div className={`posterGroup ${phaseName.startsWith('Grupo') ? 'isGroup' : 'isKnockout'}`} key={phaseName}>
            <div className="posterGroupTitle">
              <strong>{phaseName}</strong>
              <span>{phaseGames.length} jogos</span>
            </div>

            <div className="posterTeams">
              {phaseName.startsWith('Grupo') && Array.from(new Set(phaseGames.flatMap(g => [g.home_team, g.away_team]))).slice(0,4).map(team => (
                <div className="posterTeamFlag" key={team}>{flag(team)}<small>{team}</small></div>
              ))}
            </div>

            <div className="posterMatches">
              {phaseGames.map(game => {
                const g = guesses[game.id] || {}
                const pts = calcPoints(game.home_score, game.away_score, g.guess_home, g.guess_away)
                const isLocked = gameLocked(game)

                return <div className={`posterMatch palpitesMatch ${isLocked ? 'lockedGame' : ''}`} key={game.id}>
                  <span className="posterNo">{game.game_no}</span>
                  <span className="posterDate">{formatDate(game.starts_at)}</span>
                  <span className="posterSide right">{flag(game.home_team)} {game.home_team}</span>
                  <input className="posterScoreInput" disabled={isLocked} value={g.guess_home ?? ''} onChange={e => setGuess(game, 'guess_home', e.target.value)} />
                  <b>x</b>
                  <input className="posterScoreInput" disabled={isLocked} value={g.guess_away ?? ''} onChange={e => setGuess(game, 'guess_away', e.target.value)} />
                  <span className="posterSide">{flag(game.away_team)} {game.away_team}</span>
                  <span className="posterPts">{isLocked ? '🔒 ' : ''}{pts} pts</span>
                </div>
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="saveFloating">
        <button disabled={locked()} onClick={saveGuesses}><Save/> Salvar todos os palpites</button>
      </div>
    </section>}


    {tab === 'tabela' && <section className="copaTablePage">
      <div className="tablePosterHeader">
        <div>
          <span>Bolão Traíras F.C.</span>
          <h2>Tabela de Jogos</h2>
          <p>Copa do Mundo 2026 • estilo chaveiro impresso • cores Traíras</p>
        </div>
        <div className="posterLogo logoBox">
          <img src={LOGO_TRAIRAS} alt="Traíras F.C." />
        </div>
      </div>

      <div className="posterGrid">
        {Object.entries(groupedTableGames).map(([phaseName, phaseGames]) => (
          <div className={`posterGroup ${phaseName.startsWith('Grupo') ? 'isGroup' : 'isKnockout'}`} key={phaseName}>
            <div className="posterGroupTitle">
              <strong>{phaseName}</strong>
              <span>{phaseGames.length} jogos</span>
            </div>

            <div className="posterTeams">
              {phaseName.startsWith('Grupo') && Array.from(new Set(phaseGames.flatMap(g => [g.home_team, g.away_team]))).slice(0,4).map(team => (
                <div className="posterTeamFlag" key={team}>{flag(team)}<small>{team}</small></div>
              ))}
            </div>

            <div className="posterMatches">
              {phaseGames.map(game => (
                <div className="posterMatch" key={game.id}>
                  <span className="posterNo">{game.game_no}</span>
                  <span className="posterDate">{formatDate(game.starts_at)}</span>
                  <span className="posterSide right">{flag(game.home_team)} {game.home_team}</span>
                  <span className="posterScore">{game.home_score ?? ''}</span>
                  <b>x</b>
                  <span className="posterScore">{game.away_score ?? ''}</span>
                  <span className="posterSide">{flag(game.away_team)} {game.away_team}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>}


    {tab === 'ranking' && <section className="card">
      <div className="cardTitle">
        <h2>Ranking ao vivo</h2>
        <button className="whats" onClick={shareRanking}><Share2/> Compartilhar no WhatsApp</button>
      </div>
      <div className="podium">
        {ranking.slice(0,3).map((r,i) => <div className={`podiumCard p${i+1}`} key={r.nome}>
          <span>{i===0?'🥇':i===1?'🥈':'🥉'}</span>
          <b>{r.nome}</b>
          <strong>{r.pontos} pts</strong>
        </div>)}
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
      <p className="muted">A classificação muda conforme tu lança os resultados oficiais no painel admin.</p>
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
      <p className="muted">Chaveamento conforme tabela oficial. Os nomes dos classificados podem ser ajustados pelo admin quando a Copa avançar.</p>
      <div className="bracket">
        {games.filter(g => !(g.phase || '').startsWith('Grupo')).map(g => <div className="bracketGame" key={g.id}>
          <small>Jogo {g.game_no} · {g.phase}</small>
          <em>{formatDate(g.starts_at)}</em>
          <b>{flag(g.home_team)} {g.home_team}</b>
          <span>x</span>
          <b>{flag(g.away_team)} {g.away_team}</b>
        </div>)}
      </div>
    </section>}

    {tab === 'regras' && <section className="card">
      <h2>Regras oficiais do bolão</h2>
      <div className="rules">
        <div><b>5 pontos</b><span>Placar exato.</span></div>
        <div><b>3 pontos</b><span>Acertou vencedor ou empate.</span></div>
        <div><b>1 ponto</b><span>Acertou os gols de uma seleção.</span></div>
        <div><b>0 ponto</b><span>Errou resultado e placar.</span></div>
        <div><b>Desempate</b><span>Mais placares exatos, depois mais acertos.</span></div>
        <div><b>Bloqueio</b><span>Após o prazo geral ou horário do jogo, ninguém altera.</span></div>
      </div>
    </section>}

    {tab === 'admin' && <section className="card">
      <div className="cardTitle">
        <h2>Painel admin — resultados oficiais</h2>
        <div className="filters">
          <Search size={18}/>
          <input placeholder="Buscar jogo..." value={busca} onChange={e => setBusca(e.target.value)} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)}>
            {phases.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="games">
        {filteredGames.map(game => <div className="game adminGame" key={game.id}>
          <span className="fase">Jogo {game.game_no}<br />{game.phase}<br />{formatLongDate(game.starts_at)}</span>
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
.fishMark{
  background-image:url('/logo-trairas.png') !important;
  background-size:contain !important;
  background-position:center !important;
  background-repeat:no-repeat !important;
  color:transparent !important;
}
document.querySelectorAll('img').forEach(img => {
  if(img.alt === 'Traíras'){
    img.src = '/logo-trairas.png'
  }
})
