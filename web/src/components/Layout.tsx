import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useSocket } from "../lib/socket-context";

const NAV_ITEMS = [
  { to: "/", label: "🎰 ガチャ" },
  { to: "/battle", label: "⚔️ バトル" },
  { to: "/raid", label: "🐉 レイド" },
  { to: "/profile", label: "🪪 プロフィール" },
  { to: "/history", label: "📜 履歴" },
  { to: "/ranking", label: "🏆 ランキング" },
  { to: "/shop", label: "🛒 ショップ" },
  { to: "/inventory", label: "🎒 持ち物" },
  { to: "/train", label: "💪 育成" },
];

function IncomingChallengeBanner() {
  const { incomingChallenge, clearIncomingChallenge, socket } = useSocket();
  const [busy, setBusy] = useState(false);

  if (!incomingChallenge) return null;

  function respond(accept: boolean) {
    if (!socket) return;
    setBusy(true);
    socket.emit("battle:respondChallenge", { challengeId: incomingChallenge!.challengeId, accept }, () => {
      setBusy(false);
      if (!accept) clearIncomingChallenge();
    });
  }

  return (
    <div className="challenge-toast">
      <p>
        ⚔️ <strong>{incomingChallenge.from.displayName}</strong> から対戦の挑戦が届きました!
      </p>
      <div className="btn-row">
        <button className="btn btn-primary" disabled={busy} onClick={() => respond(true)}>
          受けて立つ
        </button>
        <button className="btn" disabled={busy} onClick={() => respond(false)}>
          今は無理
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navItems = user?.role === "admin" ? [...NAV_ITEMS, { to: "/admin", label: "⚙️ 運営" }] : NAV_ITEMS;

  return (
    <div className="app-shell">
      <header className="topnav">
        <span className="brand">NEO ORACLE ARCADE</span>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <span className="money-badge">💰 {user?.money ?? 0} コイン</span>
        <button className="btn" onClick={() => logout()}>
          ログアウト
        </button>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <IncomingChallengeBanner />
    </div>
  );
}
