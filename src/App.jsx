import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://feymcukzfppdquritiai.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleW1jdWt6ZnBwZHF1cml0aWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTczNzcsImV4cCI6MjA5Mzk5MzM3N30.5oubBSASkHzTuo4dXBvNJtvKwlB-hojKcIpKQw5CcEs";

const api = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers || {}),
    },
    ...opts,
  }).then(r => r.json());

const authApi = (path, body, token) =>
  fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).then(r => r.json());

const authGet = (path, token) =>
  fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  }).then(r => r.json());

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CARGOS_DIRECAO = ["Diretor", "Diretor Associado", "Capelão", "Secretário", "Tesoureiro", "Staff"];
const CARGOS_UNIDADE = ["Conselheiro", "Capitão", "Capelão", "Secretário", "Tesoureiro", "Desbravador"];
const AUCTION_MANAGERS = ["Tesoureiro", "Conselheiro", "Diretor", "Diretor Associado"];

const isDirecao = (u) => u?.role === "direcao";
const canManageAuction = (u) => u && (u.role === "direcao" || AUCTION_MANAGERS.includes(u.cargo));

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("login");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sb_session");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession(s);
        loadProfile(s.access_token, s.user.id);
      } catch { setLoading(false); }
    } else { setLoading(false); }
  }, []);

  const loadProfile = async (token, userId) => {
    try {
      const data = await api(`profiles?id=eq.${userId}&select=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data && data[0]) {
        setProfile(data[0]);
        setScreen("app");
      } else {
        setScreen("pending");
      }
    } catch { showToast("Erro ao carregar perfil", "error"); }
    setLoading(false);
  };

  const login = async (email, password) => {
    setLoading(true);
    const res = await authApi("token?grant_type=password", { email, password });
    if (res.access_token) {
      localStorage.setItem("sb_session", JSON.stringify(res));
      setSession(res);
      await loadProfile(res.access_token, res.user.id);
    } else {
      showToast(res.error_description || "E-mail ou senha incorretos", "error");
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    const res = await authApi("signup", {
      email: data.email,
      password: data.password,
      data: {
        name: data.name, phone: data.phone, age: data.age,
        role: data.role, cargo: data.cargo,
        unit_id: data.unitId || null,
        avatar: data.role === "direcao" ? "👨‍💼" : "⚜️",
      },
    });
    if (res.user) {
      showToast("Cadastro enviado! Aguarde aprovação da diretoria 🙏");
      setScreen("login");
    } else {
      showToast(res.error_description || res.msg || "Erro no cadastro", "error");
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("sb_session");
    setSession(null); setProfile(null); setScreen("login");
  };

  if (loading) return <Splash />;
  if (screen === "login") return <LoginScreen onLogin={login} onGoRegister={() => setScreen("register")} toast={toast} />;
  if (screen === "register") return <RegisterScreen session={session} onRegister={register} onBack={() => setScreen("login")} toast={toast} />;
  if (screen === "pending") return <PendingScreen onLogout={logout} />;

  if (!profile?.approved) return <PendingScreen onLogout={logout} />;

  return <MainApp session={session} profile={profile} setProfile={setProfile} onLogout={logout} showToast={showToast} toast={toast} />;
}

// ─── SPLASH ───────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ ...S.page, flexDirection: "column", gap: 16 }}>
      <span style={{ fontSize: 64 }}>⚜️</span>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Carregando...</div>
    </div>
  );
}

// ─── PENDING ──────────────────────────────────────────────────────────────────
function PendingScreen({ onLogout }) {
  return (
    <div style={{ ...S.page, flexDirection: "column", gap: 16, textAlign: "center", padding: 30 }}>
      <span style={{ fontSize: 64 }}>⏳</span>
      <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>Cadastro Pendente</div>
      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, maxWidth: 300 }}>
        Seu cadastro foi enviado! Aguarde a aprovação de um membro da diretoria para acessar o app.
      </div>
      <button onClick={onLogout} style={{ ...S.primaryBtn, marginTop: 20, maxWidth: 240 }}>Voltar ao Login</button>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onGoRegister, toast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  return (
    <div style={S.page}>
      <div style={S.authCard}>
        <div style={S.authLogo}>
          <span style={{ fontSize: 52 }}>⚜️</span>
          <h1 style={S.authTitle}>Desbravadores</h1>
          <p style={S.authSub}>Sistema de Gestão do Clube</p>
        </div>
        <label style={S.label}>E-mail</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={S.input} type="email" />
        <label style={S.label}>Senha</label>
        <div style={{ position: "relative" }}>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" style={S.input} type={show ? "text" : "password"} />
          <button onClick={() => setShow(!show)} style={S.eyeBtn}>{show ? "🙈" : "👁️"}</button>
        </div>
        <button onClick={() => onLogin(email, password)} style={S.primaryBtn}>Entrar</button>
        <button onClick={onGoRegister} style={S.linkBtn}>Não tem conta? Cadastre-se</button>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
function RegisterScreen({ onRegister, onBack, toast }) {
  const [step, setStep] = useState(1);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "", phone: "", role: "", cargo: "", unitId: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api("units?select=id,name,icon&order=name").then(d => Array.isArray(d) && setUnits(d));
  }, []);

  const submit = () => {
    if (!form.name || !form.email || !form.password || !form.role || !form.cargo) return;
    onRegister({ ...form, age: parseInt(form.age) || 0 });
  };

  return (
    <div style={S.page}>
      <div style={S.authCard}>
        <button onClick={onBack} style={S.backBtn}>← Voltar</button>
        <div style={S.authLogo}>
          <span style={{ fontSize: 42 }}>⚜️</span>
          <h1 style={{ ...S.authTitle, fontSize: 22 }}>Criar Conta</h1>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[1, 2].map(n => <div key={n} style={{ width: 30, height: 4, borderRadius: 4, background: step >= n ? "#1a237e" : "#ddd" }} />)}
          </div>
        </div>
        {step === 1 && (
          <>
            <label style={S.label}>Nome completo</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Seu nome" style={S.input} />
            <label style={S.label}>E-mail</label>
            <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" style={S.input} type="email" />
            <label style={S.label}>Senha (mínimo 6 caracteres)</label>
            <input value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••" style={S.input} type="password" />
            <label style={S.label}>Telefone</label>
            <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(11) 99999-0000" style={S.input} />
            <label style={S.label}>Idade</label>
            <input value={form.age} onChange={e => set("age", e.target.value)} placeholder="Ex: 14" style={S.input} type="number" />
            <button onClick={() => setStep(2)} style={S.primaryBtn} disabled={!form.name || !form.email || !form.password}>Próximo →</button>
          </>
        )}
        {step === 2 && (
          <>
            <label style={S.label}>Você é:</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {[{ v: "desbravador", label: "⚜️", name: "Desbravador", sub: "Membro do clube" }, { v: "direcao", label: "👨‍💼", name: "Diretoria", sub: "16 anos ou mais" }].map(opt => (
                <button key={opt.v} onClick={() => set("role", opt.v)}
                  style={{ ...S.roleCard, border: `2px solid ${form.role === opt.v ? "#1a237e" : "#e0e0e0"}`, background: form.role === opt.v ? "#e8eeff" : "#fff" }}>
                  <span style={{ fontSize: 28 }}>{opt.label}</span>
                  <strong style={{ fontSize: 13 }}>{opt.name}</strong>
                  <span style={{ fontSize: 11, color: "#888" }}>{opt.sub}</span>
                </button>
              ))}
            </div>
            {form.role && (
              <>
                <label style={S.label}>Cargo</label>
                <select value={form.cargo} onChange={e => set("cargo", e.target.value)} style={S.input}>
                  <option value="">Selecione...</option>
                  {(form.role === "direcao" ? CARGOS_DIRECAO : CARGOS_UNIDADE).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </>
            )}
            {form.role === "desbravador" && (
              <>
                <label style={S.label}>Unidade</label>
                <select value={form.unitId} onChange={e => set("unitId", e.target.value)} style={S.input}>
                  <option value="">Selecione sua unidade...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
                </select>
              </>
            )}
            <button onClick={submit} style={S.primaryBtn} disabled={!form.role || !form.cargo}>✅ Enviar Cadastro</button>
            <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginTop: 8 }}>Acesso liberado após aprovação da diretoria</p>
          </>
        )}
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function MainApp({ session, profile, setProfile, onLogout, showToast, toast }) {
  const [tab, setTab] = useState("ranking");
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = session?.access_token;
  const isDir = isDirecao(profile);
  const canAuction = canManageAuction(profile);
  const myUnit = units.find(u => u.id === profile?.unit_id);

  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    api("units?select=*&order=score.desc", { headers }).then(d => Array.isArray(d) && setUnits(d));
    api("categories?select=*&order=name", { headers }).then(d => Array.isArray(d) && setCategories(d));
    api("auctions?select=*&order=created_at.desc", { headers }).then(d => Array.isArray(d) && setAuctions(d));
    api("score_history?select=*&order=created_at.desc&limit=50", { headers }).then(d => Array.isArray(d) && setHistory(d));
    if (isDir) {
      api("profiles?select=*&approved=eq.true", { headers }).then(d => Array.isArray(d) && setAllProfiles(d));
      api("profiles?select=*&approved=eq.false", { headers }).then(d => Array.isArray(d) && setPendingProfiles(d));
    }
  }, [refreshKey, token, isDir]);

  const navItems = [
    { key: "ranking", icon: "🏆", label: "Ranking" },
    ...(isDir ? [{ key: "pontuar", icon: "➕", label: "Pontuar" }] : []),
    { key: "leilao", icon: "🔨", label: "Leilão" },
    ...(isDir ? [{ key: "categorias", icon: "🏷️", label: "Categorias" }] : []),
    ...(isDir ? [{ key: "unidades", icon: "🛡️", label: "Unidades" }] : []),
    ...(isDir ? [{ key: "membros", icon: "👥", label: "Membros" }] : []),
    { key: "perfil", icon: "👤", label: "Perfil" },
  ];

  const ctx = { token, units, setUnits, categories, setCategories, history, setHistory, auctions, setAuctions, allProfiles, setAllProfiles, pendingProfiles, setPendingProfiles, showToast, refresh, profile, myUnit, isDir, canAuction };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logoArea}>
            <span style={{ fontSize: 26 }}>⚜️</span>
            <div>
              <div style={S.logoTitle}>Desbravadores</div>
              <div style={S.logoSub}>{profile?.cargo} • {profile?.name?.split(" ")[0]}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isDir && pendingProfiles.length > 0 && (
              <button onClick={() => setTab("membros")} style={S.badge}>{pendingProfiles.length} pendente{pendingProfiles.length > 1 ? "s" : ""}</button>
            )}
            <button onClick={onLogout} style={S.logoutBtn}>Sair</button>
          </div>
        </div>
      </div>

      <div style={S.content}>
        {tab === "ranking" && <RankingTab ctx={ctx} />}
        {tab === "pontuar" && isDir && <PontarTab ctx={ctx} />}
        {tab === "leilao" && <LeilaoTab ctx={ctx} />}
        {tab === "categorias" && isDir && <CategoriasTab ctx={ctx} />}
        {tab === "unidades" && isDir && <UnidadesTab ctx={ctx} />}
        {tab === "membros" && isDir && <MembrosTab ctx={ctx} />}
        {tab === "perfil" && <PerfilTab ctx={ctx} setProfile={setProfile} onLogout={onLogout} />}
      </div>

      <div style={S.bottomNav}>
        {navItems.map(item => (
          <button key={item.key} onClick={() => setTab(item.key)}
            style={{ ...S.navBtn, color: tab === item.key ? "#1a237e" : "#999", borderTop: `3px solid ${tab === item.key ? "#1a237e" : "transparent"}` }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: tab === item.key ? 700 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

// ─── RANKING ──────────────────────────────────────────────────────────────────
function RankingTab({ ctx }) {
  const { units, isDir, myUnit } = ctx;
  const sorted = [...units].sort((a, b) => b.score - a.score);

  if (!isDir) {
    return (
      <div>
        <h2 style={S.sectionTitle}>⚜️ Minha Unidade</h2>
        {myUnit ? (
          <>
            <div style={{ ...S.heroCard, borderTop: `5px solid ${myUnit.color}` }}>
              <div style={{ fontSize: 52 }}>{myUnit.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 28, color: myUnit.color }}>{myUnit.name}</div>
              <div style={{ fontSize: 14, color: "#888" }}>Saldo da unidade</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: myUnit.color }}>{myUnit.score}</div>
              <div style={{ fontSize: 16, color: "#f39c12", fontWeight: 700 }}>💰 Desbravitos</div>
            </div>
            <div style={S.infoBox}><span>ℹ️</span><span style={{ fontSize: 13, color: "#555" }}>O ranking geral é visível apenas para a diretoria. Foco em conquistar mais Desbravitos!</span></div>
          </>
        ) : (
          <div style={S.emptyState}><div style={{ fontSize: 48 }}>🛡️</div><div>Você não está em nenhuma unidade.</div></div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={S.sectionTitle}>🏆 Ranking das Unidades</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((unit, i) => (
          <div key={unit.id} style={{ ...S.rankCard, borderLeft: `5px solid ${unit.color}` }}>
            <div style={{ width: 36, textAlign: "center", fontSize: 24 }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ fontWeight: 900, color: unit.color, fontSize: 16 }}>{i + 1}º</span>}
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: unit.color + "22", color: unit.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{unit.icon}</div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{unit.name}</div></div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, fontSize: 22, color: unit.color }}>{unit.score}</div>
              <div style={{ fontSize: 11, color: "#f39c12" }}>💰</div>
            </div>
          </div>
        ))}
      </div>
      <h3 style={{ ...S.sectionTitle, marginTop: 20, fontSize: 15 }}>📊 Comparativo</h3>
      <div style={S.barChart}>
        {(() => { const max = Math.max(...units.map(u => u.score), 1);
          return sorted.map(u => (
            <div key={u.id} style={S.barRow}>
              <div style={S.barLabel}>{u.icon} {u.name}</div>
              <div style={S.barTrack}><div style={{ ...S.barFill, width: `${(u.score / max) * 100}%`, background: u.color }} /></div>
              <div style={{ width: 40, textAlign: "right", fontWeight: 700, color: u.color, fontSize: 13 }}>{u.score}</div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

// ─── PONTUAR ──────────────────────────────────────────────────────────────────
function PontarTab({ ctx }) {
  const { token, units, categories, history, showToast, refresh } = ctx;
  const [selUnit, setSelUnit] = useState(null);
  const [selCat, setSelCat] = useState(null);
  const [pts, setPts] = useState("");
  const [note, setNote] = useState("");
  const [neg, setNeg] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!selUnit || !selCat) { showToast("Selecione unidade e categoria!", "error"); return; }
    const p = pts !== "" ? parseInt(pts) : selCat.default_points;
    const final = neg ? -Math.abs(p) : Math.abs(p);
    const newScore = Math.max(0, selUnit.score + final);
    setSaving(true);
    const headers = { Authorization: `Bearer ${token}` };
    await api(`units?id=eq.${selUnit.id}`, { method: "PATCH", body: JSON.stringify({ score: newScore }), headers });
    await api("score_history", { method: "POST", body: JSON.stringify({ unit_id: selUnit.id, unit_name: selUnit.name, unit_icon: selUnit.icon, category_name: selCat.name, category_icon: selCat.icon, points: final, note }), headers });
    showToast(`${final > 0 ? "+" : ""}${final} 💰 para ${selUnit.name}!`);
    setPts(""); setNote(""); setNeg(false); setSelUnit(null); setSelCat(null);
    setSaving(false);
    refresh();
  };

  return (
    <div>
      <h2 style={S.sectionTitle}>➕ Adicionar Pontuação</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setNeg(false)} style={{ ...S.toggleBtn, background: !neg ? "#27ae60" : "#eee", color: !neg ? "#fff" : "#666" }}>✅ Positivo</button>
        <button onClick={() => setNeg(true)} style={{ ...S.toggleBtn, background: neg ? "#e74c3c" : "#eee", color: neg ? "#fff" : "#666" }}>⚠️ Penalidade</button>
      </div>
      <label style={S.label}>1. Unidade</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {units.map(u => (
          <button key={u.id} onClick={() => setSelUnit(u)} style={{ ...S.selectCard, border: `2px solid ${selUnit?.id === u.id ? u.color : "#e0e0e0"}`, background: selUnit?.id === u.id ? u.color + "18" : "#fff" }}>
            <span style={{ fontSize: 22 }}>{u.icon}</span>
            <div style={{ fontWeight: 700, color: u.color, fontSize: 12 }}>{u.name}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{u.score} 💰</div>
          </button>
        ))}
      </div>
      <label style={S.label}>2. Categoria</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => { setSelCat(cat); setPts(""); }} style={{ ...S.selectCard, border: `2px solid ${selCat?.id === cat.id ? cat.color : "#e0e0e0"}`, background: selCat?.id === cat.id ? cat.color + "18" : "#fff" }}>
            <span style={{ fontSize: 20 }}>{cat.icon}</span>
            <div style={{ fontWeight: 700, color: cat.color, fontSize: 12 }}>{cat.name}</div>
            <div style={{ fontSize: 11, color: "#888" }}>Padrão: {cat.default_points}</div>
          </button>
        ))}
      </div>
      <label style={S.label}>3. Pontos (opcional)</label>
      <input type="number" value={pts} onChange={e => setPts(e.target.value)} placeholder={selCat ? `Padrão: ${selCat.default_points}` : "Selecione categoria"} style={S.input} min="0" />
      <label style={S.label}>4. Observação (opcional)</label>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Destaque na atividade..." style={S.input} />
      {selUnit && selCat && (
        <div style={S.previewBox}>
          <span>{selUnit.icon}</span><strong>{selUnit.name}</strong>
          <span style={{ color: "#888" }}>recebe</span>
          <strong style={{ color: neg ? "#e74c3c" : "#27ae60", fontSize: 18 }}>{neg ? "-" : "+"}{pts || selCat.default_points} 💰</strong>
        </div>
      )}
      <button onClick={add} disabled={saving} style={S.primaryBtn}>{saving ? "Salvando..." : neg ? "⚠️ Aplicar Penalidade" : "✅ Confirmar"}</button>
      {history.length > 0 && (
        <>
          <h3 style={{ ...S.sectionTitle, marginTop: 18, fontSize: 15 }}>📋 Histórico</h3>
          {history.slice(0, 8).map(h => (
            <div key={h.id} style={{ ...S.histItem, borderLeft: `4px solid ${h.points > 0 ? "#27ae60" : "#e74c3c"}` }}>
              <span style={{ fontSize: 20 }}>{h.unit_icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{h.unit_name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{h.category_icon} {h.category_name}{h.note ? ` — ${h.note}` : ""}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 17, color: h.points > 0 ? "#27ae60" : "#e74c3c" }}>{h.points > 0 ? "+" : ""}{h.points}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── LEILÃO ───────────────────────────────────────────────────────────────────
function LeilaoTab({ ctx }) {
  const { token, units, auctions, setAuctions, showToast, refresh, profile, myUnit, isDir, canAuction } = ctx;
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", icon: "🎁", description: "", start_bid: 50, ends_at: "" });
  const [bidAmounts, setBidAmounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [auctionBids, setAuctionBids] = useState({});

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (auctions.length === 0) return;
    auctions.forEach(a => {
      api(`auction_bids?auction_id=eq.${a.id}&select=*&order=created_at.desc`, { headers })
        .then(d => Array.isArray(d) && setAuctionBids(p => ({ ...p, [a.id]: d })));
    });
  }, [auctions]);

  const createAuction = async () => {
    if (!form.title) return;
    setSaving(true);
    await api("auctions", { method: "POST", body: JSON.stringify({ ...form, start_bid: parseInt(form.start_bid), current_bid: parseInt(form.start_bid), status: "open" }), headers });
    showToast("Leilão criado! 🔨");
    setShowNew(false);
    setForm({ title: "", icon: "🎁", description: "", start_bid: 50, ends_at: "" });
    setSaving(false);
    refresh();
  };

  const placeBid = async (auction) => {
    if (!myUnit) { showToast("Você não está em uma unidade", "error"); return; }
    const amt = parseInt(bidAmounts[auction.id] || 0);
    if (amt <= auction.current_bid) { showToast(`Lance mínimo: ${auction.current_bid + 1} 💰`, "error"); return; }
    if (myUnit.score < amt) { showToast(`Saldo insuficiente! Vocês têm ${myUnit.score} 💰`, "error"); return; }
    setSaving(true);
    await api(`auctions?id=eq.${auction.id}`, { method: "PATCH", body: JSON.stringify({ current_bid: amt, current_bidder_unit_id: myUnit.id }), headers });
    await api("auction_bids", { method: "POST", body: JSON.stringify({ auction_id: auction.id, unit_id: myUnit.id, unit_name: myUnit.name, amount: amt }), headers });
    showToast(`Lance de ${amt} 💰 registrado! 🔨`);
    setBidAmounts(p => ({ ...p, [auction.id]: "" }));
    setSaving(false);
    refresh();
  };

  const closeAuction = async (auction) => {
    setSaving(true);
    await api(`auctions?id=eq.${auction.id}`, { method: "PATCH", body: JSON.stringify({ status: "closed" }), headers });
    if (auction.current_bidder_unit_id) {
      const unit = units.find(u => u.id === auction.current_bidder_unit_id);
      if (unit) await api(`units?id=eq.${unit.id}`, { method: "PATCH", body: JSON.stringify({ score: Math.max(0, unit.score - auction.current_bid) }), headers });
    }
    const winner = units.find(u => u.id === auction.current_bidder_unit_id);
    showToast(winner ? `🎉 ${winner.name} venceu!` : "Leilão encerrado sem vencedor");
    setSaving(false);
    refresh();
  };

  const open = auctions.filter(a => a.status === "open");
  const closed = auctions.filter(a => a.status === "closed");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ ...S.sectionTitle, margin: 0 }}>🔨 Leilão de Desbravitos</h2>
        {canAuction && <button onClick={() => setShowNew(!showNew)} style={S.smallPrimaryBtn}>+ Novo</button>}
      </div>

      {myUnit && !isDir && (
        <div style={{ background: "#fffbe6", border: `2px solid ${myUnit.color}`, borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>{myUnit.icon}</span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: myUnit.color }}>{myUnit.name}</div><div style={{ fontSize: 12, color: "#888" }}>Saldo disponível</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontWeight: 900, fontSize: 22, color: "#f39c12" }}>{myUnit.score}</div><div style={{ fontSize: 11, color: "#f39c12" }}>💰 Desbravitos</div></div>
        </div>
      )}

      {canAuction && showNew && (
        <div style={S.formCard}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>➕ Novo Leilão</h3>
          <label style={S.label}>Título</label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Lenço oficial" style={S.input} />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><label style={S.label}>Ícone</label><input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} style={{ ...S.input, textAlign: "center", fontSize: 22 }} maxLength={2} /></div>
            <div style={{ flex: 1 }}><label style={S.label}>Lance inicial</label><input type="number" value={form.start_bid} onChange={e => setForm(p => ({ ...p, start_bid: e.target.value }))} style={S.input} /></div>
          </div>
          <label style={S.label}>Descrição</label>
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes..." style={S.input} />
          <label style={S.label}>Encerra em</label>
          <input type="date" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} style={S.input} />
          <button onClick={createAuction} disabled={saving} style={S.primaryBtn}>🔨 Criar Leilão</button>
        </div>
      )}

      {open.length === 0 && closed.length === 0 && <div style={S.emptyState}><div style={{ fontSize: 48 }}>🔨</div><div>Nenhum leilão disponível</div></div>}

      {open.map(auction => {
        const leader = units.find(u => u.id === auction.current_bidder_unit_id);
        const isLeader = myUnit && auction.current_bidder_unit_id === myUnit.id;
        const bids = auctionBids[auction.id] || [];
        return (
          <div key={auction.id} style={S.auctionCard}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 34 }}>{auction.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{auction.title}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{auction.description}</div>
                {auction.ends_at && <div style={{ fontSize: 11, color: "#e74c3c" }}>📅 Encerra: {auction.ends_at}</div>}
              </div>
              <div style={S.openBadge}>ABERTO</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", background: "#f9f9f9", borderRadius: 10, padding: "10px 0", marginTop: 12 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>Lance atual</div><div style={{ fontWeight: 900, fontSize: 24, color: "#f39c12" }}>{auction.current_bid} 💰</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>Líder</div><div style={{ fontWeight: 700, fontSize: 13 }}>{leader ? `${leader.icon} ${leader.name}` : "—"}</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>Lances</div><div style={{ fontWeight: 700, fontSize: 20 }}>{bids.length}</div></div>
            </div>
            {isLeader && <div style={{ background: "#fffbe6", border: "1px solid #f39c12", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#e67e22", marginTop: 8, textAlign: "center" }}>🏆 Sua unidade está vencendo!</div>}
            {!isDir && myUnit && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input type="number" value={bidAmounts[auction.id] || ""} onChange={e => setBidAmounts(p => ({ ...p, [auction.id]: e.target.value }))} placeholder={`Mín: ${auction.current_bid + 1} 💰`} style={{ ...S.input, margin: 0, flex: 1 }} />
                <button onClick={() => placeBid(auction)} disabled={saving} style={{ ...S.smallPrimaryBtn, padding: "10px 16px" }}>🔨 Dar Lance</button>
              </div>
            )}
            {isDir && (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => closeAuction(auction)} disabled={saving} style={{ ...S.dangerBtn, width: "100%" }}>✅ Encerrar Leilão</button>
              </div>
            )}
            {bids.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 6 }}>Histórico de Lances</div>
                {bids.slice(0, 4).map((bid, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: 13 }}>{units.find(u => u.id === bid.unit_id)?.icon || "🛡️"}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{bid.unit_name}</span>
                    <span style={{ fontWeight: 700, color: "#f39c12" }}>{bid.amount} 💰</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {closed.length > 0 && (
        <>
          <h3 style={{ ...S.sectionTitle, marginTop: 18, fontSize: 15, color: "#888" }}>🏁 Encerrados</h3>
          {closed.map(auction => {
            const winner = units.find(u => u.id === auction.current_bidder_unit_id);
            return (
              <div key={auction.id} style={{ ...S.auctionCard, opacity: 0.7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{auction.icon}</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{auction.title}</div></div>
                  <div style={S.closedBadge}>ENCERRADO</div>
                </div>
                <div style={{ marginTop: 8, padding: "8px 12px", background: winner ? "#fffbe6" : "#f5f5f5", borderRadius: 8, fontSize: 13, fontWeight: 700, color: winner ? "#f39c12" : "#888" }}>
                  {winner ? `🏆 Vencedor: ${winner.icon} ${winner.name} por ${auction.current_bid} 💰` : "Sem vencedor"}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── CATEGORIAS ───────────────────────────────────────────────────────────────
function CategoriasTab({ ctx }) {
  const { token, categories, showToast, refresh } = ctx;
  const [form, setForm] = useState({ name: "", icon: "⭐", default_points: 10, color: "#3498db" });
  const [editing, setEditing] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      await api(`categories?id=eq.${editing.id}`, { method: "PATCH", body: JSON.stringify({ ...form, default_points: parseInt(form.default_points) }), headers });
      showToast("Categoria atualizada!");
    } else {
      await api("categories", { method: "POST", body: JSON.stringify({ ...form, default_points: parseInt(form.default_points) }), headers });
      showToast("Categoria criada!");
    }
    setForm({ name: "", icon: "⭐", default_points: 10, color: "#3498db" }); setEditing(null);
    refresh();
  };

  const del = async (id) => {
    await api(`categories?id=eq.${id}`, { method: "DELETE", headers });
    showToast("Removida!"); refresh();
  };

  return (
    <div>
      <h2 style={S.sectionTitle}>🏷️ Categorias</h2>
      <div style={S.formCard}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>{editing ? "✏️ Editar" : "➕ Nova Categoria"}</h3>
        <label style={S.label}>Nome</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Presença" style={S.input} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><label style={S.label}>Ícone</label><input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} style={{ ...S.input, textAlign: "center", fontSize: 22 }} maxLength={2} /></div>
          <div style={{ flex: 1 }}><label style={S.label}>Pontos</label><input type="number" value={form.default_points} onChange={e => setForm(p => ({ ...p, default_points: e.target.value }))} style={S.input} /></div>
          <div style={{ flex: 1 }}><label style={S.label}>Cor</label><input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ ...S.input, height: 44, padding: 4 }} /></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} style={{ ...S.primaryBtn, flex: 1, marginTop: 8 }}>{editing ? "💾 Salvar" : "➕ Criar"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ name: "", icon: "⭐", default_points: 10, color: "#3498db" }); }} style={{ ...S.secondaryBtn, marginTop: 8 }}>Cancelar</button>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ ...S.listItem, borderLeft: `4px solid ${cat.color}` }}>
            <span style={{ fontSize: 22 }}>{cat.icon}</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: cat.color }}>{cat.name}</div><div style={{ fontSize: 12, color: "#888" }}>Padrão: {cat.default_points} pts</div></div>
            <button onClick={() => { setEditing(cat); setForm({ name: cat.name, icon: cat.icon, default_points: cat.default_points, color: cat.color }); }} style={S.iconBtn}>✏️</button>
            <button onClick={() => del(cat.id)} style={S.iconBtnDanger}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── UNIDADES ─────────────────────────────────────────────────────────────────
function UnidadesTab({ ctx }) {
  const { token, units, allProfiles, showToast, refresh } = ctx;
  const [form, setForm] = useState({ name: "", icon: "⭐", color: "#e74c3c" });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  const create = async () => {
    if (!form.name.trim()) return;
    await api("units", { method: "POST", body: JSON.stringify({ ...form, score: 0 }), headers });
    showToast("Unidade criada! 🛡️"); setForm({ name: "", icon: "⭐", color: "#e74c3c" }); refresh();
  };

  const saveEdit = async (id) => {
    await api(`units?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(editForm), headers });
    showToast("Unidade atualizada! ✅"); setEditing(null); refresh();
  };

  const del = async (id) => {
    await api(`units?id=eq.${id}`, { method: "DELETE", headers });
    showToast("Unidade removida!"); setConfirmDelete(null); refresh();
  };

  return (
    <div>
      <h2 style={S.sectionTitle}>🛡️ Unidades</h2>
      <div style={S.formCard}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>➕ Nova Unidade</h3>
        <label style={S.label}>Nome</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Panteras" style={S.input} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><label style={S.label}>Ícone</label><input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} style={{ ...S.input, textAlign: "center", fontSize: 22 }} maxLength={2} /></div>
          <div style={{ flex: 1 }}><label style={S.label}>Cor</label><input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ ...S.input, height: 44, padding: 4 }} /></div>
        </div>
        <button onClick={create} style={S.primaryBtn}>➕ Criar</button>
      </div>
      {units.map(unit => (
        <div key={unit.id} style={{ ...S.unitCard, borderTop: `4px solid ${unit.color}` }}>
          {confirmDelete === unit.id && (
            <div style={{ background: "#fff3f3", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #fdd" }}>
              <span style={{ flex: 1, fontSize: 13, color: "#c0392b", fontWeight: 600 }}>⚠️ Excluir "{unit.name}"?</span>
              <button onClick={() => del(unit.id)} style={{ ...S.dangerBtn, padding: "6px 12px", fontSize: 12 }}>Excluir</button>
              <button onClick={() => setConfirmDelete(null)} style={{ background: "#eee", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
            </div>
          )}
          {editing === unit.id ? (
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#555", marginBottom: 8 }}>✏️ Editando</div>
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={S.input} />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1 }}><input value={editForm.icon} onChange={e => setEditForm(p => ({ ...p, icon: e.target.value }))} style={{ ...S.input, textAlign: "center", fontSize: 22 }} maxLength={2} /></div>
                <div style={{ flex: 1 }}><input type="color" value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} style={{ ...S.input, height: 44, padding: 4 }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => saveEdit(unit.id)} style={{ ...S.primaryBtn, flex: 1, marginTop: 0, padding: "10px 0" }}>💾 Salvar</button>
                <button onClick={() => setEditing(null)} style={{ ...S.secondaryBtn, marginTop: 0, flex: 1, padding: "10px 0" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: unit.color + "22", color: unit.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{unit.icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 800, color: unit.color }}>{unit.name}</div><div style={{ fontSize: 12, color: "#888" }}>{unit.score} 💰 • {allProfiles.filter(p => p.unit_id === unit.id).length} membros</div></div>
              <button onClick={() => { setEditing(unit.id); setEditForm({ name: unit.name, icon: unit.icon, color: unit.color }); }} style={S.iconBtn}>✏️</button>
              <button onClick={() => setConfirmDelete(unit.id)} style={S.iconBtnDanger}>🗑️</button>
            </div>
          )}
          {editing !== unit.id && (
            <div style={{ padding: "0 14px 12px", borderTop: "1px solid #f5f5f5" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 6 }}>👥 Membros</div>
              {allProfiles.filter(p => p.unit_id === unit.id).length === 0
                ? <div style={{ fontSize: 13, color: "#ccc", fontStyle: "italic" }}>Nenhum membro</div>
                : allProfiles.filter(p => p.unit_id === unit.id).map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid #f9f9f9" }}>
                    <span>{p.avatar}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: "#888", background: "#f0f0f0", padding: "2px 6px", borderRadius: 6 }}>{p.cargo}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MEMBROS ──────────────────────────────────────────────────────────────────
function MembrosTab({ ctx }) {
  const { token, units, allProfiles, setAllProfiles, pendingProfiles, setPendingProfiles, showToast, refresh } = ctx;
  const [filterUnit, setFilterUnit] = useState("all");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  const approveUser = async (profileId) => {
    await api(`profiles?id=eq.${profileId}`, { method: "PATCH", body: JSON.stringify({ approved: true }), headers });
    const approved = pendingProfiles.find(p => p.id === profileId);
    showToast(`${approved?.name} aprovado(a)! ✅`);
    refresh();
  };

  const rejectUser = async (profileId) => {
    await api(`profiles?id=eq.${profileId}`, { method: "DELETE", headers });
    showToast("Cadastro recusado"); refresh();
  };

  const updateCargo = async (profileId, cargo) => {
    await api(`profiles?id=eq.${profileId}`, { method: "PATCH", body: JSON.stringify({ cargo }), headers });
    showToast("Cargo atualizado!"); refresh();
  };

  const removeUser = async (profileId) => {
    await api(`profiles?id=eq.${profileId}`, { method: "DELETE", headers });
    showToast("Membro removido!"); setConfirmRemove(null); refresh();
  };

  const pending = pendingProfiles;
  const approved = allProfiles.filter(u => filterUnit === "all" || (filterUnit === "direcao" ? u.role === "direcao" : u.unit_id === parseInt(filterUnit)));

  return (
    <div>
      <h2 style={S.sectionTitle}>👥 Membros</h2>
      {pending.length > 0 && (
        <>
          <div style={{ ...S.sectionChip, background: "#fff3e0" }}>⏳ Aguardando aprovação ({pending.length})</div>
          {pending.map(u => (
            <div key={u.id} style={{ ...S.memberCard, borderLeft: "4px solid #f39c12" }}>
              <span style={{ fontSize: 26 }}>{u.avatar}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{u.age} anos • {u.cargo}</div>
                {u.unit_id && <div style={{ fontSize: 12, color: "#3498db" }}>{units.find(un => un.id === u.unit_id)?.name || "—"}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => approveUser(u.id)} style={{ ...S.smallPrimaryBtn, background: "#27ae60" }}>✅</button>
                <button onClick={() => rejectUser(u.id)} style={{ ...S.dangerBtn, padding: "6px 10px", fontSize: 12 }}>❌</button>
              </div>
            </div>
          ))}
        </>
      )}
      <div style={S.sectionChip}>✅ Ativos ({allProfiles.length})</div>
      <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} style={{ ...S.input, marginBottom: 10 }}>
        <option value="all">Todos</option>
        <option value="direcao">Diretoria</option>
        {units.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
      </select>
      {approved.map(u => (
        <div key={u.id} style={{ ...S.memberCard, flexDirection: "column", alignItems: "stretch", padding: 0, overflow: "hidden" }}>
          {confirmRemove === u.id && (
            <div style={{ background: "#fff3f3", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #fdd" }}>
              <span style={{ flex: 1, fontSize: 12, color: "#c0392b", fontWeight: 600 }}>⚠️ Remover "{u.name}"?</span>
              <button onClick={() => removeUser(u.id)} style={{ ...S.dangerBtn, padding: "5px 10px", fontSize: 12 }}>Remover</button>
              <button onClick={() => setConfirmRemove(null)} style={{ background: "#eee", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 24 }}>{u.avatar}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "#3498db" }}>{u.role === "direcao" ? "Diretoria" : units.find(un => un.id === u.unit_id)?.name || "—"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <select value={u.cargo} onChange={e => updateCargo(u.id, e.target.value)} style={{ ...S.input, margin: 0, fontSize: 12, padding: "4px 8px", width: "auto" }}>
                {(u.role === "direcao" ? CARGOS_DIRECAO : CARGOS_UNIDADE).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setConfirmRemove(u.id)} style={{ ...S.iconBtnDanger, fontSize: 12, padding: "3px 8px" }}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function PerfilTab({ ctx, setProfile, onLogout }) {
  const { token, profile, myUnit, isDir, showToast } = ctx;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: profile?.name || "", phone: profile?.phone || "" });
  const headers = { Authorization: `Bearer ${token}` };

  const save = async () => {
    await api(`profiles?id=eq.${profile.id}`, { method: "PATCH", body: JSON.stringify(form), headers });
    setProfile(p => ({ ...p, ...form }));
    showToast("Perfil atualizado! ✅"); setEditing(false);
  };

  return (
    <div>
      <h2 style={S.sectionTitle}>👤 Meu Perfil</h2>
      <div style={S.profileCard}>
        <div style={S.profileAvatar}>{profile?.avatar}</div>
        <div style={{ fontWeight: 800, fontSize: 20 }}>{profile?.name}</div>
        <div style={{ ...S.rolePill, background: isDir ? "#1a237e" : "#27ae60" }}>{isDir ? "👨‍💼 Diretoria" : "⚜️ Desbravador"}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{profile?.cargo}</div>
        {myUnit && <div style={{ fontSize: 14, color: myUnit.color, fontWeight: 600, background: "#fff", borderRadius: 20, padding: "2px 14px" }}>{myUnit.icon} {myUnit.name}</div>}
      </div>
      <div style={S.formCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>📋 Informações</h3>
          <button onClick={() => setEditing(!editing)} style={S.smallPrimaryBtn}>{editing ? "Cancelar" : "✏️ Editar"}</button>
        </div>
        {editing ? (
          <>
            <label style={S.label}>Nome</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={S.input} />
            <label style={S.label}>Telefone</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={S.input} />
            <button onClick={save} style={S.primaryBtn}>💾 Salvar</button>
          </>
        ) : (
          <>
            <div style={S.infoRow}><span style={S.infoLabel}>Nome</span><span style={S.infoValue}>{profile?.name}</span></div>
            <div style={S.infoRow}><span style={S.infoLabel}>Telefone</span><span style={S.infoValue}>{profile?.phone || "—"}</span></div>
            <div style={S.infoRow}><span style={S.infoLabel}>Idade</span><span style={S.infoValue}>{profile?.age} anos</span></div>
            <div style={S.infoRow}><span style={S.infoLabel}>Cargo</span><span style={S.infoValue}>{profile?.cargo}</span></div>
          </>
        )}
      </div>
      {myUnit && (
        <div style={{ ...S.formCard, borderTop: `3px solid ${myUnit.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 36 }}>{myUnit.icon}</span>
            <div><div style={{ fontWeight: 800, color: myUnit.color }}>{myUnit.name}</div><div style={{ fontSize: 14, color: "#f39c12", fontWeight: 700 }}>{myUnit.score} 💰 Desbravitos</div></div>
          </div>
        </div>
      )}
      <button onClick={onLogout} style={{ ...S.primaryBtn, background: "#e74c3c", marginTop: 8 }}>🚪 Sair do App</button>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  return (
    <div style={{ position: "fixed", top: 76, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#e74c3c" : "#27ae60", color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: 100, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px #0003", whiteSpace: "nowrap", maxWidth: "90vw" }}>
      {toast.msg}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #0d1b5e 0%, #1a237e 50%, #283593 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Segoe UI', sans-serif" },
  authCard: { background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px #0004" },
  authLogo: { textAlign: "center", marginBottom: 20 },
  authTitle: { fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 28, color: "#1a237e", margin: "8px 0 4px" },
  authSub: { color: "#888", fontSize: 14, margin: 0 },
  app: { fontFamily: "'Segoe UI', sans-serif", maxWidth: 480, margin: "0 auto", background: "#f5f7fb", minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { background: "linear-gradient(135deg, #0d1b5e 0%, #1a237e 100%)", color: "#fff", padding: "14px 18px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px #0003" },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoArea: { display: "flex", alignItems: "center", gap: 10 },
  logoTitle: { fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 16 },
  logoSub: { fontSize: 11, opacity: 0.75 },
  logoutBtn: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer" },
  badge: { background: "#f39c12", color: "#fff", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  content: { flex: 1, padding: "16px 16px 90px", overflowY: "auto" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", display: "flex", boxShadow: "0 -2px 12px #0001", zIndex: 100 },
  navBtn: { flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", cursor: "pointer" },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#1a237e", margin: "0 0 14px", fontFamily: "Georgia, serif" },
  label: { display: "block", fontWeight: 600, fontSize: 13, color: "#555", marginBottom: 6, marginTop: 10 },
  input: { width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fafafa" },
  primaryBtn: { background: "linear-gradient(135deg, #0d1b5e, #1a237e)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 12 },
  smallPrimaryBtn: { background: "#1a237e", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { background: "#eee", color: "#555", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 1 },
  dangerBtn: { background: "#e74c3c", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  iconBtn: { background: "#f0f4ff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 },
  iconBtnDanger: { background: "#fff0f0", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 },
  linkBtn: { background: "none", border: "none", color: "#1a237e", fontSize: 14, cursor: "pointer", width: "100%", marginTop: 12, textDecoration: "underline" },
  eyeBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18 },
  backBtn: { background: "none", border: "none", color: "#1a237e", fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 12, fontWeight: 600 },
  rankCard: { background: "#fff", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px #0001" },
  heroCard: { background: "#fff", borderRadius: 16, padding: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 20px #0001", marginBottom: 14 },
  infoBox: { background: "#e8f4ff", borderRadius: 12, padding: 14, display: "flex", gap: 10, alignItems: "flex-start" },
  barChart: { background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 2px 8px #0001" },
  barRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  barLabel: { width: 88, fontSize: 12, color: "#555" },
  barTrack: { flex: 1, background: "#f0f0f0", borderRadius: 100, height: 9, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 100, transition: "width 0.5s ease" },
  toggleBtn: { flex: 1, border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  selectCard: { borderRadius: 12, padding: "12px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 12, background: "#fff" },
  previewBox: { background: "#f0f4ff", border: "2px dashed #1a237e", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, fontSize: 13 },
  formCard: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px #0001" },
  listItem: { background: "#fff", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px #0001" },
  unitCard: { background: "#fff", borderRadius: 14, marginBottom: 14, boxShadow: "0 2px 8px #0001", overflow: "hidden" },
  auctionCard: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 2px 10px #0001" },
  openBadge: { background: "#27ae60", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  closedBadge: { background: "#888", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  histItem: { background: "#fff", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px #0001", marginBottom: 8 },
  memberCard: { background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px #0001", marginBottom: 8 },
  sectionChip: { background: "#e8f4ff", color: "#1a237e", fontWeight: 700, fontSize: 13, padding: "6px 14px", borderRadius: 20, display: "inline-block", marginBottom: 10 },
  profileCard: { background: "linear-gradient(135deg, #0d1b5e, #1a237e)", borderRadius: 16, padding: 24, textAlign: "center", color: "#fff", marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  profileAvatar: { fontSize: 52, background: "rgba(255,255,255,0.15)", borderRadius: "50%", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" },
  rolePill: { color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700 },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5" },
  infoLabel: { fontSize: 13, color: "#888" },
  infoValue: { fontSize: 13, fontWeight: 600 },
  roleCard: { flex: 1, borderRadius: 12, padding: "14px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  emptyState: { textAlign: "center", color: "#bbb", padding: 40, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", fontSize: 15 },
};
