"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bell, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Compass, Gift, History, LayoutDashboard, LogIn, LogOut, Menu, Package, Settings, Shield, Sparkles, Swords, Users, X } from "lucide-react";
import type { GameAction, GameResponse, Page, Pull, Team } from "@/lib/game-types";
import { useGame } from "@/hooks/use-game";
import { getCharacter } from "@/lib/catalog";
import { Avatar, Button, IconButton, Logo, Modal, ResourceIcon } from "./ui";
import { AdventureView, CharactersView, HistoryView, InventoryView, Overview, QuestsView, SettingsView, SummonView, TeamsView, type ViewProps } from "./game-views";
import { AuthModal, CharacterModal, HelpModal, ItemModal, PullModal, TeamModal } from "./game-modals";

const NAV = [
  { id: "overview" as Page, label: "Overview", icon: LayoutDashboard },
  { id: "summon" as Page, label: "Wishing room", icon: Sparkles },
  { id: "characters" as Page, label: "Characters", icon: Users },
  { id: "teams" as Page, label: "My teams", icon: Swords },
  { id: "adventure" as Page, label: "Adventure", icon: Compass },
  { id: "quests" as Page, label: "Daily quests", icon: BookOpen },
];
const COLLECTION_NAV = [
  { id: "inventory" as Page, label: "Inventory", icon: Package },
  { id: "history" as Page, label: "Wish history", icon: History },
];
type Overlay = { type: "character"; id: string } | { type: "team"; team?: Team } | { type: "auth" } | { type: "help" } | { type: "item"; id: string } | { type: "pull"; count: number; results?: Pull[]; loading: boolean } | { type: "notifications" } | { type: "confirm"; action: GameAction; title: string; description: string } | null;
const PAGE_TITLES: Record<Page, string> = { overview: "Overview", summon: "Wishing room", characters: "Characters", teams: "My teams", adventure: "Adventure", quests: "Daily quests", inventory: "Inventory", history: "Wish history", settings: "Your profile" };

export default function AstralApp() {
  const game = useGame(); const { state, ready, busy, run, notify } = game;
  const [page, setPage] = useState<Page>("overview"); const [sidebarOpen, setSidebarOpen] = useState(false); const [profileOpen, setProfileOpen] = useState(false);
  const [modal, setModal] = useState<Overlay>(null); const [notificationsRead, setNotificationsRead] = useState(false); const [confirmText, setConfirmText] = useState(""); const [authBusy, setAuthBusy] = useState(false);
  const closeModal = useCallback(() => setModal(null), []);
  const navigate = useCallback((destination: Page) => { setPage(destination); setSidebarOpen(false); setProfileOpen(false); window.location.hash = destination; window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  useEffect(() => { const update = () => { const hash = window.location.hash.slice(1) as Page; if (hash in PAGE_TITLES) setPage(hash); }; update(); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  useEffect(() => { document.title = `${PAGE_TITLES[page]} · Astral — A little wish, a big adventure`; }, [page]);
  useEffect(() => { if (modal?.type === "confirm") setConfirmText(""); }, [modal]);
  const openConfirm = (action: GameAction, title: string, description: string) => setModal({ type: "confirm", action, title, description });
  const onPull = async (count: number) => {
    if (busy) return;
    setModal({ type: "pull", count, loading: true });
    const [result] = await Promise.all([run({ type: "summon", count }), new Promise((resolve) => setTimeout(resolve, 1400))]);
    setModal((current) => { if (current?.type !== "pull") return current; return result ? { type: "pull", count, results: result.results, loading: false } : null; });
  };
  const confirm = async () => {
    if (modal?.type !== "confirm") return;
    if (modal.action.type === "delete-account") {
      setAuthBusy(true);
      try { const response = await fetch("/api/auth", { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); closeModal(); navigate("overview"); await game.load(); notify("Your adventure has been deleted. A fresh start awaits."); } catch (error) { notify(error instanceof Error ? error.message : "Please try again.", "error"); } finally { setAuthBusy(false); }
    } else { const response = await run(modal.action); if (response) closeModal(); }
  };
  const logout = async () => {
    setProfileOpen(false); setAuthBusy(true);
    try { const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "logout" }) }); if (!response.ok) throw new Error("Could not sign out. Please try again."); await game.load(); navigate("overview"); notify("Signed out. Your adventure is safely saved."); } catch (err) { notify(err instanceof Error ? err.message : "Please try again.", "error"); } finally { setAuthBusy(false); }
  };
  const props: ViewProps = { state, ready, busy, navigate, run, onCharacter: (id) => setModal({ type: "character", id }), onTeam: (team) => setModal({ type: "team", team }), onPull, onItem: (id) => setModal({ type: "item", id }), onConfirm: openConfirm, onAuth: () => setModal({ type: "auth" }), onHelp: () => setModal({ type: "help" }) };
  const character = modal?.type === "character" ? state.characters.find((char) => char.id === modal.id) : null;
  const pendingQuests = state.quests.filter((quest) => !quest.claimed).length;
  const navItem = (item: typeof NAV[number]) => { const Icon = item.icon; return <button key={item.id} onClick={() => navigate(item.id)} className={`nav-item ${page === item.id ? "nav-active" : ""}`} aria-current={page === item.id ? "page" : undefined}><Icon size={19} strokeWidth={1.75} /><span>{item.label}</span>{item.id === "characters" && <span className="nav-count">{state.characters.length}</span>}{item.id === "quests" && pendingQuests > 0 && <span className="nav-notification" />}{item.id === "summon" && <span className="nav-new">NEW</span>}</button>; };
  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <button className="brand-button" onClick={() => navigate("overview")} aria-label="Astral home"><Logo /></button><span className="brand-tagline">A LITTLE WISH. A BIG ADVENTURE.</span><button className="mobile-sidebar-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
      <nav className="main-navigation"><span className="nav-section-label">YOUR WORLD</span>{NAV.map(navItem)}<span className="nav-section-label collection-label">YOUR COLLECTION</span>{COLLECTION_NAV.map(navItem)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-magic-card"><span className="sidebar-sparkles"><Sparkles size={25} strokeWidth={1.4} /><i>✦</i><b>✧</b></span><h3>Good things take<br />a little adventure.</h3><p>Your next chapter is waiting.</p><button onClick={() => navigate("adventure")}>Let’s explore<ArrowRight size={14} /></button></div><button className="sidebar-help" onClick={() => setModal({ type: "help" })}><CircleHelp size={17} />A little guidance<ChevronRight size={13} /></button><div className="sidebar-profile-wrapper">{profileOpen && <div className="profile-menu"><span>YOUR LITTLE CORNER</span><button onClick={() => navigate("settings")}><Settings size={15} />Your profile</button>{state.user.isDemo ? <button onClick={() => { setProfileOpen(false); setModal({ type: "auth" }); }}><Shield size={15} />Save your adventure</button> : <button onClick={logout} disabled={authBusy}><LogOut size={15} />Sign out</button>}<button onClick={() => { setProfileOpen(false); setModal({ type: "help" }); }}><CircleHelp size={15} />A little help</button></div>}<button className="sidebar-profile" onClick={() => setProfileOpen(!profileOpen)} aria-label="Open account menu" aria-expanded={profileOpen}><Avatar name={state.user.name} /><span><strong>{state.user.name}<span className="profile-demo-dot" /></strong><small>Lv. {state.profile.level} · {state.user.isDemo ? "Demo adventurer" : "Astral adventurer"}</small></span><ChevronDown size={15} /></button></div><div className="sidebar-status"><span className="live-dot" />A little magic, always online.<span>v1.0</span></div></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="topbar-location"><IconButton className="mobile-menu-toggle" label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21} /></IconButton><span className="breadcrumb-home">Your world</span><ChevronRight size={13} /><span>{PAGE_TITLES[page]}</span></div><div className="topbar-resources"><button className="resource-balance" onClick={() => navigate("adventure")} title="Gold — earn more in adventures"><ResourceIcon type="gold" /><span>{state.profile.gold.toLocaleString()}</span></button><button className="resource-balance gem-balance" onClick={() => navigate("quests")} title="Astral Gems — earn more through quests"><ResourceIcon type="gems" /><span>{state.profile.gems.toLocaleString()}</span><span className="resource-plus">+</span></button><button className="resource-balance energy-balance" onClick={() => navigate("adventure")} title="Adventure energy — restores by 1 every 5 minutes"><ResourceIcon type="energy" /><span>{state.profile.energy}<small>/ 120</small></span></button><span className="topbar-divider" /><IconButton label="Your notifications" className="notification-button" onClick={() => { setNotificationsRead(true); setModal({ type: "notifications" }); }}><Bell size={20} strokeWidth={1.7} />{!notificationsRead && <span className="notification-dot" />}</IconButton><button className="topbar-avatar" onClick={() => navigate("settings")} aria-label="Your profile"><Avatar name={state.user.name} size="small" /></button></div></header>
      {game.error && <div className="connection-banner" role="alert"><span>{game.error} Your adventure is not lost.</span><Button onClick={game.load} variant="secondary">Try again<ArrowRight size={14} /></Button></div>}
      <main className="main-content" id="main-content">
        {page === "overview" && <Overview {...props} />} {page === "summon" && <SummonView {...props} />}{page === "characters" && <CharactersView {...props} />}{page === "teams" && <TeamsView {...props} />}{page === "adventure" && <AdventureView {...props} />}{page === "quests" && <QuestsView {...props} />}{page === "inventory" && <InventoryView {...props} />}{page === "history" && <HistoryView {...props} />}{page === "settings" && <SettingsView key={state.user.id} {...props} />}
        <footer className="app-footer"><span><Sparkles size={13} />A universe of stories. Your next one starts here.</span><div><span className="footer-status"><span className={`live-dot ${!ready ? "syncing" : ""}`} />{ready ? "All systems a little magical" : "Connecting your adventure…"}</span><button onClick={() => setModal({ type: "help" })}>A little help<ChevronRight size={12} /></button></div></footer>
      </main>
    </div>
    {character && <CharacterModal character={character} busy={busy} ready={ready} run={run} onClose={closeModal} onConfirm={openConfirm} />}
    {modal?.type === "team" && <TeamModal team={modal.team} state={state} busy={busy} run={run} onClose={closeModal} />}
    {modal?.type === "auth" && <AuthModal onClose={closeModal} onComplete={(newState) => game.setState(newState)} notify={notify} />}
    {modal?.type === "help" && <HelpModal onClose={closeModal} notify={notify} />}
    {modal?.type === "item" && <ItemModal itemId={modal.id} state={state} busy={busy} run={run} onClose={closeModal} />}
    {modal?.type === "pull" && <PullModal count={modal.count} results={modal.results} loading={modal.loading} busy={!!busy} onClose={closeModal} onAgain={() => onPull(modal.count)} onCollection={() => { closeModal(); navigate("characters"); }} />}
    {modal?.type === "notifications" && <Modal title="A little news from your universe." onClose={closeModal} className="notifications-modal"><div className="notification-intro"><span className="eyebrow">YOUR ADVENTURE, AT A GLANCE</span><h3>Good things are happening.</h3></div><button className="notification-item" onClick={() => { closeModal(); navigate("summon"); }}><span className="notification-icon stat-lavender"><Sparkles size={21} /></span><span><strong>The stars are calling.</strong><p>Celestial Reverie is live. Meet Seraphina and make a little wish.</p><small>A new chapter begins</small></span><ChevronRight size={16} /></button><button className="notification-item" onClick={() => { closeModal(); navigate("overview"); }}><span className="notification-icon stat-peach"><Gift size={21} /></span><span><strong>{state.profile.lastCheckin ? "A little reward, well earned." : "A little gift has your name on it."}</strong><p>{state.profile.lastCheckin ? "Your daily gift is safely in your bag. Come back tomorrow for more." : "Your daily 300 Astral Gems are ready to collect. A little progress starts here."}</p><small>Your daily check-in</small></span><ChevronRight size={16} /></button><button className="notification-item" onClick={() => { closeModal(); navigate("quests"); }}><span className="notification-icon stat-green"><BookOpen size={21} /></span><span><strong>Little steps. Stellar rewards.</strong><p>{state.quests.filter((quest) => quest.progress >= quest.target && !quest.claimed).length} quests are ready to claim. Your next little victory is waiting.</p><small>Your daily quests</small></span><ChevronRight size={16} /></button><p className="notification-all-read"><CheckCheck size={14} />You’re all caught up. Back to a little magic.</p></Modal>}
    {modal?.type === "confirm" && <Modal title={modal.title} onClose={closeModal} className="confirm-modal"><div className="confirm-icon"><Shield size={29} /></div><p className="confirm-description">{modal.description}</p><label className="field-label">Type <strong>DELETE</strong> to confirm<input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="DELETE" autoComplete="off" /></label><div className="modal-actions"><Button variant="ghost" onClick={closeModal}>Keep my adventure</Button><Button variant="danger" onClick={confirm} loading={!!busy || authBusy} disabled={confirmText !== "DELETE"}>{modal.action.type === "delete-account" ? "Delete adventure" : modal.action.type === "release" ? "Release companion" : "Disband team"}</Button></div></Modal>}
    {game.toast && <div className={`toast toast-${game.toast.type}`} role={game.toast.type === "error" ? "alert" : "status"}><span className="toast-icon">{game.toast.type === "error" ? <InfoIcon /> : <Check size={19} />}</span><p>{game.toast.message}</p><IconButton label="Dismiss notification" onClick={() => game.setToast(null)}><X size={16} /></IconButton></div>}
  </div>;
}
function InfoIcon() { return <CircleHelp size={19} />; }
