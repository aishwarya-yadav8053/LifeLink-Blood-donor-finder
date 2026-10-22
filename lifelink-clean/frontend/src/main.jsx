import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Heart,
  LayoutDashboard,
  Search,
  MapPin,
  Building2,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Bell,
  LogOut,
  Menu,
  X,
  Activity,
  Users,
  SlidersHorizontal,
  LocateFixed,
  Check,
  Lock,
  Play,
  Settings,
  Copy,
  RefreshCw,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  Download,
} from "lucide-react";
import { api, setCSRF } from "./api";
import Map from "./Map";
import "./style.css";

const Context = createContext();
const useApp = () => useContext(Context);
const groups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const components = {
  red_cells: "Red blood cells",
  whole_blood: "Whole blood",
  platelets: "Platelets",
  plasma: "Plasma",
};
const active = ["pending", "matching", "matched", "accepted"];
const dateText = (x) =>
  new Date(x + (x.endsWith("Z") ? "" : "Z")).toLocaleString();
const Demo = ({ demo }) =>
  demo ? <span className="demo-tag">Demo data — not a real person</span> : null;
const Status = ({ value }) => (
  <span className={"status " + value}>{value.replaceAll("_", " ")}</span>
);
const Empty = ({ text = "Nothing here yet.", children }) => (
  <div className="empty">
    <Heart size={27} />
    <h3>{text}</h3>
    {children}
  </div>
);
const Field = ({ label, children, ...props }) => (
  <label className="field">
    <span>{label}</span>
    {children || <input {...props} />}
  </label>
);
const PageHead = ({ eyebrow, title, description, children }) => (
  <div className="page-head">
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {children}
  </div>
);

function App() {
  const [config, setConfig] = useState(null),
    [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState(""),
    [notes, setNotes] = useState([]),
    [mobile, setMobile] = useState(false),
    [error, setError] = useState("");
  const nav = useNavigate(),
    location = useLocation();
  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 6000);
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const x = await api("/auth/me");
      setUser(x.user);
      setCSRF(x.csrf);
    } catch {
      setUser(null);
      setCSRF("");
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    api("/config")
      .then(setConfig)
      .catch((e) => setError(e.message));
    refreshUser();
  }, []);
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    let stop = false;
    const run = () =>
      api("/notifications")
        .then((x) => {
          if (!stop) setNotes(x);
        })
        .catch(() => {});
    run();
    const t = setInterval(run, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [user?.id]);
  useEffect(() => {
    setMobile(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  async function login(email, password) {
    const x = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(x.user);
    setCSRF(x.csrf);
    nav("/dashboard");
    notify("Signed in as " + x.user.name);
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setCSRF("");
    nav("/");
  }
  if (error)
    return (
      <main className="startup-error">
        <Heart />
        <h1>Let’s get LifeLink connected.</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry connection
        </button>
        <p>See README.md → Starting the application.</p>
      </main>
    );
  if (!config || !ready)
    return (
      <div className="startup-error">
        <Heart className="pulse" />
        <h2>Connecting LifeLink…</h2>
      </div>
    );
  const ctx = {
    config,
    user,
    setUser,
    notify,
    login,
    logout,
    refreshUser,
    notes,
    setNotes,
  };
  return (
    <Context.Provider value={ctx}>
      <div className="app-shell">
        <aside className={"sidebar " + (mobile ? "open" : "")}>
          <Link className="brand" to="/">
            <span className="brand-icon">
              <Heart fill="currentColor" size={22} />
            </span>
            LifeLink<span className="brand-period">.</span>
          </Link>
          <div className="sidebar-caption">A LITTLE CLOSER TO HELP</div>
          <nav>
            <small>DISCOVER</small>
            <NavLink to="/" end>
              <LayoutDashboard size={18} />
              Overview
            </NavLink>
            <NavLink to="/find">
              <Search size={18} />
              Find donors
            </NavLink>
            <NavLink to="/banks">
              <Building2 size={18} />
              Blood banks
            </NavLink>
            <NavLink to="/requests">
              <Activity size={18} />
              Request board
            </NavLink>
            <small>YOUR SPACE</small>
            {user ? (
              <>
                <NavLink to="/dashboard">
                  <Heart size={18} />
                  My dashboard
                </NavLink>
                <NavLink to="/notifications">
                  <Bell size={18} />
                  Notifications{" "}
                  <span className="nav-count">
                    {notes.filter((n) => !n.read).length}
                  </span>
                </NavLink>
                <NavLink to="/profile">
                  <Settings size={18} />
                  My profile
                </NavLink>
                {user.role === "admin" && (
                  <NavLink to="/admin">
                    <ShieldCheck size={18} />
                    Administration
                  </NavLink>
                )}
              </>
            ) : (
              <NavLink to="/login">
                <Lock size={18} />
                Sign in
              </NavLink>
            )}
            {config.demo_mode && (
              <NavLink to="/demo">
                <Play size={18} />
                Showcase studio
              </NavLink>
            )}
          </nav>
          <div className="sidebar-bottom">
            <ShieldCheck size={24} />
            <strong>Your privacy comes first.</strong>
            <p>Personal contacts stay private until a donor accepts.</p>
            <Link to="/privacy">
              How we protect your data <ArrowUpRight size={14} />
            </Link>
          </div>
          {user && (
            <button className="account" onClick={logout}>
              <span className="avatar">{user.name[0]}</span>
              <span>
                <b>{user.name.split(" ")[0]}</b>
                <small>{user.role}</small>
              </span>
              <LogOut size={16} />
            </button>
          )}
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button
              className="icon mobile-toggle"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
            <span className="topbar-label">Community care, connected.</span>
            <div className="top-actions">
              <span className="region">
                <MapPin size={15} />
                Mumbai & surrounding areas
              </span>
              <Link className="btn small" to={user ? "/new-request" : "/login"}>
                <Plus size={16} />
                Request blood
              </Link>
            </div>
          </header>
          {config.demo_mode && (
            <div className="demo-banner">
              <span>
                <span className="amber-dot" />
                SHOWCASE ENVIRONMENT
              </span>
              <p>
                Fictional donors and facilities. No real emergency dispatch.
              </p>
              <Link to="/demo">
                Try the full workflow <ArrowRight size={14} />
              </Link>
            </div>
          )}
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/find" element={<Finder />} />
              <Route path="/banks" element={<Banks />} />
              <Route path="/requests" element={<RequestBoard />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth register />} />
              <Route
                path="/new-request"
                element={
                  <Protected>
                    <RequestForm />
                  </Protected>
                }
              />
              <Route
                path="/edit-request/:id"
                element={
                  <Protected>
                    <RequestForm edit />
                  </Protected>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <Protected>
                    <Dashboard />
                  </Protected>
                }
              />
              <Route
                path="/notifications"
                element={
                  <Protected>
                    <Notifications />
                  </Protected>
                }
              />
              <Route
                path="/profile"
                element={
                  <Protected>
                    <Profile />
                  </Protected>
                }
              />
              <Route
                path="/demo"
                element={config.demo_mode ? <Showcase /> : <NotFound />}
              />
              <Route
                path="/admin"
                element={
                  <Protected adminOnly>
                    <Admin />
                  </Protected>
                }
              />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer>
            <span>LifeLink · Every connection matters.</span>
            <span>
              Discovery, not medical advice. Contact your hospital for urgent
              care.
            </span>
            <Link to="/privacy">Privacy & terms</Link>
            {config.public_contact && <span>{config.public_contact}</span>}
          </footer>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button
            className="icon"
            onClick={() => setToast("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
function Protected({ children, adminOnly = false }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin")
    return <Empty text="Administrator access required" />;
  return children;
}
function useLoad(path, initial = []) {
  const [data, setData] = useState(initial),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    return api(path)
      .then((x) => {
        setData(x);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  return { data, error, loading, load, setData };
}
function ErrorMessage({ error }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}

function Home() {
  const { config } = useApp(),
    stats = useLoad("/stats", {}),
    reqs = useLoad("/requests"),
    banks = useLoad("/banks"),
    donors = useLoad("/donors?radius=100", { items: [] });
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="red-dot" />
            THE RIGHT CONNECTION. AT THE RIGHT TIME.
          </span>
          <h1>
            Find blood.
            <br />
            Find <em>hope.</em>
            <br />
            Closer to you.
          </h1>
          <p>
            Connect with willing donors and discover nearby blood banks. One
            request. A community ready to respond.
          </p>
          <div className="actions">
            <Link className="btn" to="/find">
              Find a donor <ArrowUpRight size={18} />
            </Link>
            <Link className="btn secondary" to="/register?role=donor">
              Become a donor
            </Link>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={18} />
            <span>Private by design. Contact shared by consent.</span>
          </div>
        </div>
        <div className="hero-map">
          <div className="map-title">
            <span className="green-dot" />
            <b>Your community, on the map</b>
            <span>MUMBAI REGION</span>
          </div>
          <Map
            donors={donors.data.items}
            banks={banks.data}
            requests={reqs.data}
            tileUrl={config.tile_url}
          />
          <div className="map-bottom">
            <div className="mini-avatars">
              <span>A</span>
              <span>S</span>
              <span>K</span>
            </div>
            <div>
              <strong>{stats.data.donors ?? "—"} donor profiles</strong>
              <small>
                {stats.data.demo_donors ?? 0} fictional showcase profiles
              </small>
            </div>
            <Link
              to="/find"
              className="circle-arrow"
              aria-label="Explore donor map"
            >
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
      <ErrorMessage error={stats.error} />
      <section className="stats-grid">
        {[
          [Users, stats.data.donors, "Donor profiles"],
          [Activity, stats.data.requests, "Open requests"],
          [Building2, stats.data.banks, "Listed blood banks"],
          [CheckCircle2, stats.data.fulfilled, "Requests marked fulfilled"],
        ].map(([Icon, value, label]) => (
          <div className="stat" key={label}>
            <Icon size={21} />
            <div>
              <strong>{value ?? "—"}</strong>
              <span>{label}</span>
            </div>
            <small>
              {config.demo_mode ? "Includes demo records" : "Database total"}
            </small>
          </div>
        ))}
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">SOMEONE NEARBY NEEDS YOU</span>
          <h2>Open blood requests</h2>
        </div>
        <Link to="/requests">
          View all requests <ArrowRight size={16} />
        </Link>
      </div>
      <div className="cards three">
        {reqs.data.slice(0, 3).map((r) => (
          <RequestCard key={r.id} r={r} />
        ))}
        {!reqs.data.length && <Empty text="No open requests" />}
      </div>
      <section className="how">
        <div>
          <span className="eyebrow">SIMPLE. HUMAN. SECURE.</span>
          <h2>
            A little effort.
            <br />A meaningful connection.
          </h2>
          <Link to="/demo">
            Explore the showcase <ArrowRight size={16} />
          </Link>
        </div>
        {[
          [
            "01",
            "Make a request",
            "Tell us the blood group, hospital and when it is needed.",
          ],
          [
            "02",
            "Connect privately",
            "Matching donors choose whether to accept. No public phone numbers.",
          ],
          [
            "03",
            "Coordinate with care",
            "After acceptance, connect privately and confirm everything with the hospital.",
          ],
        ].map(([n, t, p]) => (
          <article key={n}>
            <span>{n}</span>
            <h3>{t}</h3>
            <p>{p}</p>
          </article>
        ))}
      </section>
    </>
  );
}
function RequestCard({ r, children }) {
  return (
    <article className="card request-card">
      <div className="row spread">
        <span className="blood-pill">{r.blood_group}</span>
        <Status value={r.urgency} />
      </div>
      <h3>{r.hospital}</h3>
      <p className="muted">
        <MapPin size={14} />
        {r.city} · {r.units} units
      </p>
      <div className="request-meta">
        <span>{components[r.component]}</span>
        <span>
          <Clock size={13} />
          {dateText(r.needed_at)}
        </span>
      </div>
      <div className="row spread">
        <Status value={r.status} />
        <small>{r.reference}</small>
      </div>
      {r.demo && <span className="demo-tag">Fictional showcase request</span>}
      {children || (
        <Link className="text-link" to="/dashboard">
          View in my dashboard <ArrowRight size={15} />
        </Link>
      )}
    </article>
  );
}

function Finder() {
  const { config, notify } = useApp();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const [group, setGroup] = useState(params.get("group") || ""),
    [component, setComponent] = useState("red_cells"),
    [city, setCity] = useState("Mumbai"),
    [center, setCenter] = useState(config.cities.Mumbai),
    [radius, setRadius] = useState(100),
    [availableOnly, setAvailable] = useState(false),
    [verified, setVerified] = useState(false),
    [sort, setSort] = useState("distance"),
    [page, setPage] = useState(1),
    [mapOn, setMapOn] = useState(true),
    [selected, setSelected] = useState(null),
    [q, setQ] = useState("");
  const query = new URLSearchParams({
    component,
    radius,
    lat: center[0],
    lng: center[1],
    available_only: availableOnly,
    verified_only: verified,
    sort,
    page,
    q,
  });
  if (group) query.set("group", group);
  const result = useLoad("/donors?" + query, { items: [], total: 0 }),
    banks = useLoad("/banks");
  useEffect(
    () => setPage(1),
    [group, component, radius, availableOnly, verified, sort, q, city],
  );
  function locate() {
    if (!navigator.geolocation) {
      notify("Geolocation unavailable; choose a city instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCenter([p.coords.latitude, p.coords.longitude]);
        setCity("Current location");
      },
      () =>
        notify("Location unavailable or denied. You can still choose a city."),
    );
  }
  return (
    <>
      <PageHead
        eyebrow="DISCOVER YOUR COMMUNITY"
        title="Find a donor"
        description="Explore compatible candidates, without exposing private contact details."
      />
      <div className="finder-toolbar">
        <Field label="Required blood group">
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Component">
          <select
            value={component}
            onChange={(e) => setComponent(e.target.value)}
          >
            {Object.entries(components).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Search around">
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setCenter(config.cities[e.target.value]);
            }}
          >
            {Object.keys(config.cities).map((c) => (
              <option key={c}>{c}</option>
            ))}
            {city === "Current location" && <option>Current location</option>}
          </select>
        </Field>
        <button className="btn secondary" onClick={locate}>
          <LocateFixed size={18} />
          Use my location
        </button>
      </div>
      <div className="finder-layout">
        <aside className="filter-panel">
          <div className="row">
            <SlidersHorizontal size={17} />
            <h3>Refine results</h3>
          </div>
          <Field
            label="City or locality text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Thane"
          />
          <Field label={"Search radius · " + radius + " km"}>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={radius}
              onChange={(e) => setRadius(+e.target.value)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Available only
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            Verified profiles only
          </label>
          <Field label="Sort results">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="distance">Nearest first</option>
              <option value="compatibility">Exact group & verification</option>
              <option value="availability">Availability</option>
              <option value="response">Response rate</option>
            </select>
          </Field>
          <div className="privacy-note">
            <Lock size={20} />
            <h4>No public phone numbers.</h4>
            <p>
              Create a request. Donors choose whether to respond. Only
              acceptance enables private contact sharing.
            </p>
          </div>
          <button
            className="btn secondary full"
            onClick={() => {
              setGroup("");
              setQ("");
              setRadius(100);
              setAvailable(false);
              setVerified(false);
            }}
          >
            Clear filters
          </button>
        </aside>
        <section>
          <div className="row spread result-heading">
            <div>
              <strong>{result.data.total} candidates</strong>
              <small> · approximate distances</small>
            </div>
            <button
              className="btn secondary small"
              onClick={() => setMapOn(!mapOn)}
            >
              {mapOn ? "Hide map" : "Show map"}
            </button>
          </div>
          <ErrorMessage error={result.error} />
          {mapOn && (
            <Map
              donors={result.data.items}
              banks={banks.data}
              center={center}
              radius={radius}
              selected={selected}
              tileUrl={config.tile_url}
            />
          )}
          <div className="candidate-list">
            {result.loading ? (
              <div className="skeleton" />
            ) : (
              result.data.items.map((d) => (
                <article className="candidate card" key={d.id}>
                  <div className="blood-pill">{d.blood_group}</div>
                  <div className="candidate-info">
                    <div className="row">
                      <h3>{d.name}</h3>
                      {d.verified && (
                        <ShieldCheck size={16} className="green" />
                      )}
                    </div>
                    <p>
                      {d.city} · ~{d.distance} km away
                    </p>
                    <div className="row">
                      <Status
                        value={d.available ? "available" : "unavailable"}
                      />
                      {d.response_rate !== null && (
                        <small>{d.response_rate}% response rate</small>
                      )}
                    </div>
                    <Demo demo={d.demo} />
                  </div>
                  <div className="candidate-actions">
                    <button
                      className="text-link"
                      onClick={() => {
                        setMapOn(true);
                        setSelected("donor-" + d.id);
                      }}
                    >
                      View area <MapPin size={14} />
                    </button>
                    <Link className="btn secondary small" to="/new-request">
                      Create request <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
          {!result.loading && !result.data.items.length && (
            <Empty text="No candidates in this area">
              <p>Expand the radius or check nearby blood banks.</p>
              <Link className="btn secondary" to="/banks">
                Find blood banks
              </Link>
            </Empty>
          )}
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(result.data.total / 12))}
            </span>
            <button
              disabled={page * 12 >= result.data.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
          <p className="fineprint">
            Candidate discovery is not clinical approval. Whole blood and
            platelet searches use conservative exact-group matching. The blood
            bank must confirm eligibility and compatibility.
          </p>
        </section>
      </div>
    </>
  );
}

function Banks() {
  const { config, user, notify } = useApp();
  const [q, setQ] = useState(""),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(null);
  const result = useLoad("/banks?q=" + encodeURIComponent(q));
  async function save(e) {
    e.preventDefault();
    try {
      const b = Object.fromEntries(new FormData(e.target));
      b.lat = +b.lat;
      b.lng = +b.lng;
      await api("/banks/" + editing.id, { method: "PUT", body: b });
      setEditing(null);
      result.load();
      notify("Facility updated. Verification is pending review.");
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="FACILITY DIRECTORY"
        title="Blood banks, closer to you"
        description="Directory listings are not live blood inventory. Confirm details directly with the facility."
      />
      <div className="search-inline">
        <Search size={19} />
        <input
          aria-label="Search blood banks"
          placeholder="Search city or blood bank…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <ErrorMessage error={result.error} />
      <Map banks={result.data} selected={selected} tileUrl={config.tile_url} />
      <div className="cards three bank-cards">
        {result.data.map((b) => (
          <article className="card" key={b.id}>
            <div className="row spread">
              <div className="square-icon">
                <Building2 />
              </div>
              <Status value={b.verified ? "verified" : "unverified"} />
            </div>
            <h3>{b.name}</h3>
            <p>{b.address}</p>
            <p className="muted">
              <Clock size={14} />
              {b.hours}
            </p>
            <small>{b.components}</small>
            <p className="fineprint">
              Source: {b.source}
              <br />
              Updated: {dateText(b.updated_at)}
            </p>
            {b.demo ? (
              <span className="demo-tag">
                Fictional facility — do not travel here
              </span>
            ) : (
              <p>Public contact: {b.phone || "Not provided"}</p>
            )}
            <div className="actions">
              <button
                className="btn secondary small"
                onClick={() => setSelected("bank-" + b.id)}
              >
                View on map
              </button>
              {!b.demo && (
                <a
                  className="text-link"
                  href={`https://www.openstreetmap.org/directions?to=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions <ArrowUpRight size={14} />
                </a>
              )}
              {user && (user.role === "admin" || b.operator_id === user.id) && (
                <button className="text-link" onClick={() => setEditing(b)}>
                  Edit facility
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!result.data.length && (
        <Empty text="No listed facilities match your search" />
      )}
      {editing && (
        <Modal title="Edit facility" close={() => setEditing(null)}>
          <form onSubmit={save} className="form-grid">
            {[
              "name",
              "city",
              "address",
              "lat",
              "lng",
              "phone",
              "hours",
              "components",
              "source",
            ].map((k) => (
              <Field
                key={k}
                label={k}
                name={k}
                required
                defaultValue={editing[k]}
              />
            ))}
            <button className="btn">Save changes</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function RequestBoard() {
  const data = useLoad("/requests");
  return (
    <>
      <PageHead
        eyebrow="COMMUNITY REQUEST BOARD"
        title="A request. A chance to help."
        description="Public summaries contain no patient contact details or medical documents."
      >
        <Link className="btn" to="/new-request">
          <Plus size={18} />
          New request
        </Link>
      </PageHead>
      <ErrorMessage error={data.error} />
      <div className="cards three">
        {data.data.map((r) => (
          <RequestCard r={r} key={r.id} />
        ))}
      </div>
      {!data.data.length && <Empty text="No open requests right now" />}
    </>
  );
}

function Auth({ register = false }) {
  const { login, notify, config } = useApp(),
    nav = useNavigate();
  const [role, setRole] = useState(
      new URLSearchParams(useLocation().search).get("role") || "requester",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = Object.fromEntries(new FormData(e.target));
    try {
      if (register) {
        d.role = role;
        d.consent = d.consent === "on";
        d.lat = config.cities[d.city || "Mumbai"][0];
        d.lng = config.cities[d.city || "Mumbai"][1];
        await api("/auth/register", { method: "POST", body: d });
        notify("Account created. You can now sign in.");
        nav("/login");
      } else await login(d.email, d.password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <Heart size={42} />
        <span className="eyebrow">CARE STARTS WITH A CONNECTION</span>
        <h1>
          Be someone’s
          <br />
          reason for
          <br />
          <em>hope.</em>
        </h1>
        <p>
          Your details belong to you. No public phone numbers. No unsolicited
          contact. Just a choice to help.
        </p>
        <ShieldCheck size={30} />
      </div>
      <div className="auth-form">
        <h2>{register ? "Join the community" : "Welcome back."}</h2>
        <p>
          {register
            ? "Create your private LifeLink account."
            : "Sign in to manage requests and responses."}
        </p>
        <ErrorMessage error={error} />
        <form className="form-grid" onSubmit={submit}>
          {register && (
            <>
              <div className="segmented">
                <button
                  type="button"
                  className={role === "requester" ? "selected" : ""}
                  onClick={() => setRole("requester")}
                >
                  I need blood
                </button>
                <button
                  type="button"
                  className={role === "donor" ? "selected" : ""}
                  onClick={() => setRole("donor")}
                >
                  I’m a donor
                </button>
              </div>
              <Field
                label="Full name"
                name="name"
                required
                minLength={2}
                maxLength={80}
              />
              <Field
                label="Private contact number"
                name="phone"
                required
                minLength={3}
                maxLength={30}
              />
            </>
          )}
          <Field
            label="Email address"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            minLength={register ? 10 : 1}
            maxLength={72}
            autoComplete={register ? "new-password" : "current-password"}
          />
          {register && role === "donor" && (
            <>
              <Field
                label="Date of birth — adult donors only"
                name="dob"
                type="date"
                required
              />
              <Field label="Blood group">
                <select name="blood_group">
                  {groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="City / approximate area">
                <select name="city">
                  {Object.keys(config.cities).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Locality (not your full address)"
                name="locality"
                maxLength={100}
              />
              <p className="fineprint">
                Registration does not confirm donation eligibility. Final
                screening must be performed by the blood bank.
              </p>
            </>
          )}
          {register && (
            <label className="check">
              <input type="checkbox" name="consent" required />I agree to the
              privacy terms and in-app request notifications. Acceptance shares
              my chosen contact method.
            </label>
          )}
          <button className="btn full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p>
          {register ? "Already have an account?" : "New to LifeLink?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        {config.demo_mode && (
          <Link className="demo-login-link" to="/demo">
            <Play size={15} />
            Just presenting? Use a demo account
          </Link>
        )}
      </div>
    </div>
  );
}

function RequestForm({ edit = false }) {
  const { user, config, notify } = useApp(),
    nav = useNavigate(),
    location = useLocation();
  const id = location.pathname.split("/").pop();
  const [existing, setExisting] = useState(null),
    [city, setCity] = useState("Mumbai"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (edit)
      api("/dashboard")
        .then((x) => {
          const r = x.requests.find((r) => r.id === +id);
          if (r) {
            setExisting(r);
            setCity(r.city);
          } else setError("Request not found");
        })
        .catch((e) => setError(e.message));
  }, [id, edit]);
  if (!["requester", "bloodbank"].includes(user.role))
    return (
      <Empty text="Use a requester account to create a request">
        <p>In showcase mode, sign out and use requester@demo.local.</p>
        <Link to="/demo" className="btn secondary">
          Open showcase
        </Link>
      </Empty>
    );
  if (edit && !existing)
    return (
      <>
        <ErrorMessage error={error} />
        <p>Loading request…</p>
      </>
    );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.target),
      body = Object.fromEntries(form);
    const file = form.get("document");
    delete body.document;
    body.units = +body.units;
    body.radius = +body.radius;
    body.lat = +(body.lat || config.cities[city][0]);
    body.lng = +(body.lng || config.cities[city][1]);
    body.needed_at = new Date(body.needed_at).toISOString();
    try {
      const r = await api("/requests" + (edit ? "/" + id : ""), {
        method: edit ? "PUT" : "POST",
        body,
      });
      if (file?.size) {
        const f = new FormData();
        f.append("file", file);
        try {
          await api(`/requests/${r.id}/documents`, { method: "POST", body: f });
        } catch (e) {
          notify("Request saved, but document upload failed: " + e.message);
          nav("/dashboard");
          return;
        }
      }
      notify("Request saved. Matching donors can now respond.");
      nav("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const def = existing || {};
  return (
    <>
      <PageHead
        eyebrow="COORDINATE CARE"
        title={edit ? "Edit blood request" : "Create a blood request"}
        description="Hospital details help donors decide. Patient information stays off the public board."
      />
      <div className="form-layout">
        <form className="panel form-grid two-col" onSubmit={submit}>
          <ErrorMessage error={error} />
          <Field
            label="Patient initials / name (private)"
            name="patient"
            defaultValue={def.patient}
            required
            maxLength={80}
          />
          <Field label="Blood group">
            <select name="blood_group" defaultValue={def.blood_group || "O+"}>
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Component">
            <select
              name="component"
              defaultValue={def.component || "red_cells"}
            >
              {Object.entries(components).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Units needed"
            name="units"
            type="number"
            min="1"
            max="20"
            defaultValue={def.units || 2}
            required
          />
          <Field
            label="Hospital name (public)"
            name="hospital"
            defaultValue={def.hospital}
            required
            minLength={3}
            maxLength={120}
          />
          <Field label="City">
            <select
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {Object.keys(config.cities).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Locality (public)"
            name="locality"
            defaultValue={def.locality}
            maxLength={100}
          />
          <Field
            label="Needed by (your local time)"
            name="needed_at"
            type="datetime-local"
            defaultValue={
              def.needed_at
                ? new Date(
                    new Date(def.needed_at + "Z").getTime() -
                      new Date().getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            required
          />
          <Field label="Urgency">
            <select name="urgency" defaultValue={def.urgency || "urgent"}>
              <option value="urgent">Urgent</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </Field>
          <Field
            label="Search radius (km)"
            name="radius"
            type="number"
            min="1"
            max="500"
            defaultValue={def.radius || 100}
            required
          />
          <Field
            label="Hospital latitude (optional)"
            name="lat"
            type="number"
            step="any"
            min="-90"
            max="90"
            defaultValue={def.lat}
            placeholder={String(config.cities[city]?.[0])}
          />
          <Field
            label="Hospital longitude (optional)"
            name="lng"
            type="number"
            step="any"
            min="-180"
            max="180"
            defaultValue={def.lng}
            placeholder={String(config.cities[city]?.[1])}
          />
          <Field
            label="Doctor / hospital reference (private)"
            name="doctor_reference"
            defaultValue={def.doctor_reference}
            maxLength={120}
          />
          <Field label="Private supporting document (optional, up to 2 MB)">
            <input type="file" name="document" accept=".pdf,.png,.jpg,.jpeg" />
          </Field>
          <div className="span-two">
            <Field label="Notes to matched donors (no unnecessary sensitive information)">
              <textarea
                name="notes"
                defaultValue={def.notes}
                maxLength={1500}
                rows="3"
              />
            </Field>
          </div>
          <div className="span-two">
            <p className="fineprint">
              Requester contact comes from your private profile. Blank
              coordinates use the city centre; enter the hospital’s coordinates
              for better distance estimates.
            </p>
            <button className="btn" disabled={busy}>
              {busy
                ? "Saving request…"
                : edit
                  ? "Save changes"
                  : "Publish request & find matches"}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <aside className="info-panel">
          <ShieldCheck size={28} />
          <h3>
            Only the right details.
            <br />
            Only at the right time.
          </h3>
          <p>Public: blood group, hospital, area, urgency and units.</p>
          <p>
            Private: patient initials, contact details and supporting documents.
          </p>
          <p>
            Acceptance opens consent-based contact sharing. It does not
            guarantee a donation.
          </p>
          {user.demo && (
            <div className="demo-tag">
              This account creates fictional showcase requests only.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Modal({ title, children, close }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const listener = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled),input,textarea,select,a[href],[tabindex="0"]');
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", listener);
    return () => { document.removeEventListener("keydown", listener); previous?.focus?.(); };
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row spread">
          <h2>{title}</h2>
          <button
            className="icon"
            onClick={close}
            aria-label="Close dialog"
            autoFocus
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Dashboard() {
  const { user, notify, refreshUser } = useApp(),
    result = useLoad("/dashboard", { requests: [], history: [] });
  const [contact, setContact] = useState(null),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(null);
  useEffect(() => {
    const t = setInterval(result.load, 4000);
    return () => clearInterval(t);
  }, [result.load]);
  async function action(path, body, confirmation) {
    if (confirmation && !confirm(confirmation)) return;
    setBusy(true);
    try {
      await api(path, { method: "POST", body });
      await result.load();
      notify("Updated successfully");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reveal(id) {
    try {
      setContact(await api(`/matches/${id}/contact`));
    } catch (e) {
      notify(e.message);
    }
  }
  async function toggle() {
    try {
      const d = user.donor;
      await api("/profile", {
        method: "PUT",
        body: {
          ...d,
          name: user.name,
          phone: user.phone,
          available: !d.available,
        },
      });
      await refreshUser();
      notify("Availability updated");
    } catch (e) {
      notify(e.message);
    }
  }
  async function sendReport(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      await api("/reports", {
        method: "POST",
        body: { target_id: report, reason: d.reason, block: d.block === "on" },
      });
      setReport(null);
      notify("Report submitted");
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="YOUR PRIVATE WORKSPACE"
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="Your requests, responses and next steps — all in one place."
      >
        {user.role === "donor" ? (
          <button
            className={"btn " + (!user.donor.available ? "secondary" : "")}
            onClick={toggle}
          >
            {user.donor.available
              ? "Available · Pause requests"
              : "Unavailable · Become available"}
          </button>
        ) : (
          <Link className="btn" to="/new-request">
            <Plus size={17} />
            Create request
          </Link>
        )}
      </PageHead>
      <Demo demo={user.demo} />
      <ErrorMessage error={result.error} />
      <div className="section-heading">
        <h2>
          {user.role === "donor"
            ? "Requests matched to you"
            : "Your blood requests"}
        </h2>
        <small>Refreshes every 4 seconds</small>
      </div>
      <div className="dashboard-requests">
        {result.data.requests.map((r) => (
          <article className="panel dashboard-request" key={r.id}>
            <div className="row spread">
              <div className="row">
                <span className="blood-pill">{r.blood_group}</span>
                <div>
                  <h3>{r.hospital}</h3>
                  <p>
                    {r.reference} · {r.city} · {r.units} units ·{" "}
                    {components[r.component]}
                  </p>
                </div>
              </div>
              <Status value={r.status} />
            </div>
            <p className="fineprint">
              Needed: {dateText(r.needed_at)} · Patient: {r.patient} · {r.notes}
            </p>
            <div className="timeline">
              {[
                "Request created",
                "Candidates notified",
                "Donor accepts",
                "Contact unlocked",
                "Fulfilled",
              ].map((s, i) => (
                <span
                  key={s}
                  className={
                    i === 0 ||
                    (i === 1 && r.matches.length) ||
                    (i < 4 && ["accepted", "fulfilled"].includes(r.status)) ||
                    r.status === "fulfilled"
                      ? "done"
                      : ""
                  }
                >
                  <Check size={12} />
                  {s}
                </span>
              ))}
            </div>
            {!r.matches.length ? (
              <div className="notice">
                No candidate matches yet.{" "}
                <Link to="/banks">Check blood banks</Link>, expand the radius by
                editing, or rerun matching.
              </div>
            ) : (
              r.matches.map((m) => (
                <div className="match-row" key={m.id}>
                  <div>
                    <strong>
                      {user.role === "donor" ? "Your response" : m.name}
                    </strong>
                    <p>{m.explanation}</p>
                    {m.simulated && (
                      <span className="demo-tag">SIMULATED RESPONSE</span>
                    )}
                  </div>
                  <Status value={m.status} />
                  <div className="actions">
                    {user.role === "donor" &&
                      m.status === "pending" &&
                      active.includes(r.status) && (
                        <>
                          <button
                            className="btn small"
                            disabled={busy}
                            onClick={() =>
                              action(
                                `/matches/${m.id}/respond`,
                                { action: "accepted" },
                                "Accept this request and share your selected contact method with this requester?",
                              )
                            }
                          >
                            Accept
                          </button>
                          <button
                            className="btn secondary small"
                            disabled={busy}
                            onClick={() =>
                              action(`/matches/${m.id}/respond`, {
                                action: "rejected",
                              })
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}
                    {m.status === "accepted" &&
                      !["expired", "cancelled"].includes(r.status) && (
                        <button
                          className="btn secondary small"
                          onClick={() => reveal(m.id)}
                        >
                          <Lock size={14} />
                          Private contact
                        </button>
                      )}
                    {(
                      <button
                        className="text-link"
                        onClick={() => setReport(user.role === "donor" ? r.requester_id : m.donor_id)}
                      >
                        Report / block
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            {user.role !== "donor" && active.includes(r.status) && (
              <div className="actions request-actions">
                {["pending", "matched"].includes(r.status) && (
                  <>
                    <Link
                      className="btn secondary small"
                      to={"/edit-request/" + r.id}
                    >
                      Edit / expand radius
                    </Link>
                    <button
                      className="btn secondary small"
                      disabled={busy}
                      onClick={() => action(`/requests/${r.id}/rematch`)}
                    >
                      Rerun matching
                    </button>
                  </>
                )}
                <button
                  className="btn secondary small"
                  disabled={busy}
                  onClick={() =>
                    action(
                      `/requests/${r.id}/status`,
                      { status: "cancelled" },
                      "Cancel this request?",
                    )
                  }
                >
                  Cancel request
                </button>
                {r.matches.some((m) => m.status === "accepted") && (
                  <button
                    className="btn small"
                    disabled={busy}
                    onClick={() =>
                      action(
                        `/requests/${r.id}/status`,
                        { status: "fulfilled" },
                        "Confirm this request is fulfilled? This records requester-reported completion, not a verified donation.",
                      )
                    }
                  >
                    Mark fulfilled
                  </button>
                )}
              </div>
            )}
            {r.documents.map((d) => (
              <a
                className="text-link"
                href={"/api/documents/" + d.id}
                key={d.id}
              >
                <Download size={14} />
                {d.name} (private)
              </a>
            ))}
          </article>
        ))}
      </div>
      {!result.data.requests.length && (
        <Empty text="Your next connection starts here">
          <p>
            {user.role === "donor"
              ? "Matching requests will appear here when available."
              : "Create your first blood request to get started."}
          </p>
        </Empty>
      )}
      <div className="section-heading">
        <h2>Completion history</h2>
      </div>
      {result.data.history.length ? (
        result.data.history.map((h) => (
          <div className="panel" key={h.id}>
            <CheckCircle2 size={18} /> Request #{h.request_id} · {h.note} ·{" "}
            {dateText(h.created_at)}
          </div>
        ))
      ) : (
        <p className="muted">No completed requests yet.</p>
      )}
      {contact && (
        <Modal title="Private contact" close={() => setContact(null)}>
          <div className="notice">
            <Lock size={18} />
            Shared only after acceptance. Do not redistribute.
          </div>
          <h3>{contact.name}</h3>
          <p>
            {contact.method}: <strong>{contact.value}</strong>
          </p>
          <Demo demo={contact.demo} />
        </Modal>
      )}
      {report && (
        <Modal title="Report a concern" close={() => setReport(null)}>
          <form className="form-grid" onSubmit={sendReport}>
            <Field label="Reason">
              <textarea name="reason" required minLength={5} maxLength={500} />
            </Field>
            <label className="check">
              <input name="block" type="checkbox" />
              Also block contact with this user
            </label>
            <button className="btn">Submit report</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Notifications() {
  const { notes, setNotes, notify } = useApp();
  async function read(id) {
    try {
      await api("/notifications/read" + (id ? "?id=" + id : ""), {
        method: "POST",
      });
      setNotes(await api("/notifications"));
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="STAY IN THE LOOP"
        title="Notifications"
        description="Private updates from your LifeLink activity."
      >
        <button className="btn secondary" onClick={() => read()}>
          Mark all read
        </button>
      </PageHead>
      {notes.map((n) => (
        <article
          className={"notification " + (!n.read ? "unread" : "")}
          key={n.id}
        >
          <Bell size={20} />
          <div>
            <strong>{n.message}</strong>
            <small>{dateText(n.created_at)}</small>
          </div>
          <Link to="/dashboard" onClick={() => read(n.id)}>
            Open <ArrowUpRight size={15} />
          </Link>
        </article>
      ))}
      {!notes.length && <Empty text="You’re all caught up" />}
    </>
  );
}

function Profile() {
  const { user, notify, refreshUser, logout } = useApp();
  const [busy, setBusy] = useState(false);
  const d = user.donor || {};
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    let body = Object.fromEntries(new FormData(e.target));
    for (const k of ["available", "share_history"]) body[k] = body[k] === "on";
    for (const k of ["lat", "lng"]) body[k] = +(body[k] || 0);
    for (const k of ["last_donation", "unavailable_until"])
      body[k] = body[k] || null;
    try {
      await api("/profile", { method: "PUT", body });
      await refreshUser();
      notify("Profile saved");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function change(e) {
    e.preventDefault();
    try {
      await api("/profile/password", {
        method: "POST",
        body: Object.fromEntries(new FormData(e.target)),
      });
      await logout();
      notify("Password changed; sign in again.");
    } catch (e) {
      notify(e.message);
    }
  }
  async function deactivate() {
    if (
      !confirm(
        "Deactivate your account? You will be signed out; historical records are retained for review.",
      )
    )
      return;
    try {
      await api("/profile", { method: "DELETE" });
      await logout();
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="YOUR DETAILS, YOUR CHOICE"
        title="My profile"
        description="Contact details below are private. Choose what to share after accepting a request."
      />
      <form className="panel form-grid two-col" onSubmit={save}>
        <Field label="Name" name="name" defaultValue={user.name} required />
        <Field
          label="Private phone"
          name="phone"
          defaultValue={user.phone}
          required
        />
        {user.donor && (
          <>
            <Field label="City" name="city" defaultValue={d.city} required />
            <Field
              label="Locality (no home address)"
              name="locality"
              defaultValue={d.locality}
            />
            <Field
              label="Approximate latitude"
              name="lat"
              type="number"
              step="any"
              defaultValue={d.lat}
              required
            />
            <Field
              label="Approximate longitude"
              name="lng"
              type="number"
              step="any"
              defaultValue={d.lng}
              required
            />
            <Field
              label="Last donation date"
              name="last_donation"
              type="date"
              defaultValue={d.last_donation || ""}
            />
            <Field
              label="Unavailable through"
              name="unavailable_until"
              type="date"
              defaultValue={d.unavailable_until || ""}
            />
            <Field label="Contact shared after acceptance">
              <select
                name="preferred_contact"
                defaultValue={d.preferred_contact}
              >
                <option value="email">Email only</option>
                <option value="phone">Phone only</option>
              </select>
            </Field>
            <label className="check">
              <input
                type="checkbox"
                name="available"
                defaultChecked={d.available}
              />
              Available for requests
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="share_history"
                defaultChecked={d.share_history}
              />
              Show last donation month publicly
            </label>
            <p className="fineprint">
              A recent-donation hold may exclude your profile from matching.
              This is a conservative software filter, not a medical eligibility
              assessment.
            </p>
          </>
        )}
        <div className="span-two">
          <button className="btn" disabled={busy}>
            Save profile
          </button>
        </div>
      </form>
      <section className="panel">
        <h3>Change password</h3>
        {user.demo ? (
          <p>
            Demo passwords are fixed. Use a newly registered account to test
            password changes.
          </p>
        ) : (
          <form className="form-grid two-col" onSubmit={change}>
            <Field
              label="Current password"
              name="current"
              type="password"
              required
            />
            <Field
              label="New password"
              name="new"
              type="password"
              minLength={10}
              maxLength={72}
              required
            />
            <button className="btn secondary">
              Change password & sign out
            </button>
          </form>
        )}
      </section>
      <section className="panel">
        <h3>Deactivate account</h3>
        <p>
          Stops login and removes you from donor discovery. This is not
          immediate erasure of audit or request history.
        </p>
        <button className="btn secondary" onClick={deactivate}>
          Deactivate my account
        </button>
      </section>
    </>
  );
}

function Showcase() {
  const { user, login, notify } = useApp(),
    data = useLoad("/demo", { accounts: [] });
  const [busy, setBusy] = useState(false);
  async function sign(a) {
    setBusy(true);
    try {
      await login(a.email, a.password);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(a) {
    try {
      await navigator.clipboard.writeText(a.email + "\n" + a.password);
      notify("Credentials copied");
    } catch {
      notify("Clipboard unavailable. Select and copy the visible credentials.");
    }
  }
  return (
    <>
      <PageHead
        eyebrow="THE PRESENTATION STUDIO"
        title="Real workflow. Fictional people."
        description="Show both sides of a request — with separate browser sessions and real database updates."
      />
      <div className="showcase-intro">
        <div className="square-icon">
          <Play />
        </div>
        <div>
          <h3>There is no automatic donor acceptance.</h3>
          <p>
            You play the requester in one browser and the donor in another.
            Every accept, decline and contact reveal is saved in SQLite.
          </p>
        </div>
      </div>
      <div className="showcase-steps">
        {[
          "Sign in as requester",
          "Create an O+ request in Mumbai",
          "Open an incognito window",
          "Sign in as the O+ donor",
          "Accept, then show contact unlock",
        ].map((s, i) => (
          <div key={s}>
            <span>{i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <ErrorMessage error={data.error} />
      <div className="cards three">
        {data.data.accounts.map((a) => (
          <article className="card demo-account" key={a.email}>
            <Status value={a.role} />
            <h3>{a.name}</h3>
            <p className="fineprint">
              {a.role === "donor"
                ? a.email.includes("opositive")
                  ? "Compatible with the O+ red-cell scenario."
                  : "Incompatible with the O+ red-cell scenario."
                : a.role === "admin"
                  ? "Moderate, import, inspect audit logs and load scenarios."
                  : a.role === "bloodbank"
                    ? "Maintain the assigned fictional facility and create requests."
                    : "Create requests and see donor responses."}
            </p>
            <code>{a.email}</code>
            <code>{a.password}</code>
            <Demo demo />
            <div className="actions">
              <button
                className="btn small"
                disabled={busy}
                onClick={() => sign(a)}
              >
                Use this account <ArrowRight size={15} />
              </button>
              <button
                className="icon"
                aria-label={"Copy " + a.role + " credentials"}
                onClick={() => copy(a)}
              >
                <Copy size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="notice">
        Signing in replaces the current session in this browser. Use incognito
        or a different browser for the other role.
      </div>
      {user?.role === "admin" && <DemoControls />}
    </>
  );
}
function DemoControls() {
  const { notify, logout } = useApp();
  async function scenario(name) {
    try {
      const r = await api("/demo/scenario", {
        method: "POST",
        body: { scenario: name },
      });
      notify(
        "Scenario created: " +
          r.reference +
          " — switch to requester/donor to continue.",
      );
    } catch (e) {
      notify(e.message);
    }
  }
  async function reset() {
    if (
      !confirm(
        "Reset all fictional showcase records? Demo histories will be cleared. Real accounts are preserved.",
      )
    )
      return;
    try {
      await api("/demo/reset", { method: "POST" });
      await logout();
      notify("Demo reset. Sign in again.");
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <section className="panel">
      <h3>Showcase controller · administrator only</h3>
      <p>
        Load a scenario, then respond manually from the donor account. No
        response is represented by leaving a match pending.
      </p>
      <div className="actions">
        <button className="btn secondary" onClick={() => scenario("success")}>
          Successful match
        </button>
        <button className="btn secondary" onClick={() => scenario("no_nearby")}>
          No nearby donor
        </button>
        <button className="btn secondary" onClick={() => scenario("multiple")}>
          Multiple responses
        </button>
        <button className="btn" onClick={reset}>
          <RefreshCw size={16} />
          Reset demo data
        </button>
      </div>
      <p className="fineprint">
        For reproducible presentations, reset first. Reset removes demo
        notifications and histories; it preserves real records.
      </p>
    </section>
  );
}

function Admin() {
  const { config, notify } = useApp(),
    data = useLoad("/admin", {
      users: [],
      reports: [],
      audit: [],
      requests: [],
    }),
    banks = useLoad("/banks");
  const [tab, setTab] = useState("users"),
    [file, setFile] = useState(null),
    [preview, setPreview] = useState(null),
    [simulation, setSimulation] = useState("");
  async function change(path, body, method = "PATCH") {
    try {
      await api(path, { method, body });
      data.load();
      banks.load();
      notify("Saved");
    } catch (e) {
      notify(e.message);
    }
  }
  async function importFile(dry) {
    if (!file) return notify("Choose a CSV or JSON file first.");
    const form = new FormData();
    form.append("file", file);
    try {
      const x = await api("/admin/import?preview=" + dry, {
        method: "POST",
        body: form,
      });
      setPreview(x);
      if (!dry) {
        banks.load();
        notify(x.count + " facilities imported");
      }
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="PLATFORM OPERATIONS"
        title="Administration"
        description="Review accounts, moderate requests and maintain trustworthy directory records."
      />
      <div className="admin-summary">
        {[
          ["Accounts", data.data.users.length],
          ["Open reports", data.data.reports.filter((r) => !r.resolved).length],
          ["Requests", data.data.requests.length],
          ["Facilities", banks.data.length],
        ].map(([l, n]) => (
          <div className="stat" key={l}>
            <strong>{n}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="tabs">
        {[
          "users",
          "requests",
          "banks",
          "reports",
          "audit",
          "import",
          "showcase",
        ]
          .filter((t) => t !== "showcase" || config.demo_mode)
          .map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
      </div>
      <ErrorMessage error={data.error} />
      {tab === "users" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Dataset</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td>{u.demo ? "Fictional" : "Registered"}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn secondary small"
                        onClick={() =>
                          change("/admin/users/" + u.id, { active: !u.active })
                        }
                      >
                        {u.active ? "Suspend" : "Reactivate"}
                      </button>
                      {u.role === "donor" && (
                        <button
                          className="btn secondary small"
                          onClick={() =>
                            change("/admin/users/" + u.id, {
                              verified: !u.verified,
                            })
                          }
                        >
                          {u.verified ? "Unverify" : "Verify"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "requests" && (
        <div className="cards three">
          {data.data.requests.map((r) => (
            <RequestCard key={r.id} r={r}>
              <div className="actions">
                {active.includes(r.status) && (
                  <button
                    className="btn secondary small"
                    onClick={() => {
                      if (confirm("Cancel this request as an administrator?"))
                        change(
                          `/requests/${r.id}/status`,
                          { status: "cancelled" },
                          "POST",
                        );
                    }}
                  >
                    Cancel request
                  </button>
                )}
              </div>
            </RequestCard>
          ))}
        </div>
      )}
      {tab === "banks" &&
        banks.data.map((b) => (
          <div className="panel row spread" key={b.id}>
            <span>
              {b.name} · {b.verified ? "Verified" : "Unverified"}
            </span>
            <div className="actions">
              <button
                className="btn secondary small"
                onClick={() =>
                  change("/admin/banks/" + b.id, { verified: !b.verified })
                }
              >
                {b.verified ? "Unverify" : "Verify"}
              </button>
              <button
                className="btn secondary small"
                onClick={() => {
                  if (confirm("Hide this facility from the directory?"))
                    change("/admin/banks/" + b.id, { active: false });
                }}
              >
                Hide
              </button>
            </div>
          </div>
        ))}
      {tab === "reports" &&
        (data.data.reports.length ? (
          data.data.reports.map((r) => (
            <div className="panel" key={r.id}>
              <h3>
                Report #{r.id} · User #{r.target_id}
              </h3>
              <p>{r.reason}</p>
              {r.resolved ? (
                <Status value="resolved" />
              ) : (
                <button
                  className="btn secondary"
                  onClick={() =>
                    change(`/admin/reports/${r.id}/resolve`, {}, "POST")
                  }
                >
                  Resolve report
                </button>
              )}
            </div>
          ))
        ) : (
          <Empty text="No reports to review" />
        ))}
      {tab === "audit" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>UTC time</th>
              </tr>
            </thead>
            <tbody>
              {data.data.audit.map((a) => (
                <tr key={a.id}>
                  <td>{a.action}</td>
                  <td>{a.user_id || "Anonymous"}</td>
                  <td>{a.target}</td>
                  <td>{a.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "import" && (
        <div className="panel">
          <h3>Import authorised blood-bank records</h3>
          <p>
            Upload CSV or JSON, up to 1 MB / 500 rows. Preview is required in
            this interface. Invalid rows prevent the entire import.
          </p>
          <input
            aria-label="Blood bank dataset"
            type="file"
            accept=".csv,.json"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setPreview(null);
            }}
          />
          <div className="actions">
            <button className="btn secondary" onClick={() => importFile(true)}>
              Validate & preview
            </button>
            <button
              className="btn"
              disabled={
                !preview || preview.errors.length > 0 || !preview.preview
              }
              onClick={() => importFile(false)}
            >
              Import valid records
            </button>
          </div>
          {preview && (
            <>
              <p>
                {preview.count} valid records · {preview.errors.length} errors
              </p>
              <pre>
                {JSON.stringify(
                  preview.errors.length ? preview.errors : preview.valid,
                  null,
                  2,
                )}
              </pre>
            </>
          )}
        </div>
      )}
      {tab === "showcase" && (
        <>
          <DemoControls />
          <section className="panel">
            <h3>Optional response simulator</h3>
            <p>
              Only fictional matches can be simulated. The audit log labels
              simulated activity. Find a match ID from the donor dashboard’s API
              response in /docs; manual two-browser presentation is recommended.
            </p>
            <Field
              label="Demo match ID"
              value={simulation}
              type="number"
              onChange={(e) => setSimulation(e.target.value)}
            />
            <div className="actions">
              <button
                className="btn secondary"
                disabled={!simulation}
                onClick={() =>
                  change(
                    `/demo/matches/${simulation}/simulate`,
                    { action: "accepted" },
                    "POST",
                  )
                }
              >
                Simulate acceptance
              </button>
              <button
                className="btn secondary"
                disabled={!simulation}
                onClick={() =>
                  change(
                    `/demo/matches/${simulation}/simulate`,
                    { action: "rejected" },
                    "POST",
                  )
                }
              >
                Simulate rejection
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Privacy() {
  return (
    <>
      <PageHead
        eyebrow="BUILT AROUND CONSENT"
        title="Privacy & responsible use"
        description="LifeLink is a college showcase and coordination prototype, not an emergency service."
      />
      <div className="prose panel">
        <h2>What is public?</h2>
        <p>
          Donor display first name, blood group, approximate area, availability
          and verification label. Public requests show hospital, area, blood
          group, component, units and urgency — not patient details.
        </p>
        <h2>What stays private?</h2>
        <p>
          Email, phone, birth date, notes and documents. Supporting documents
          are accessible only to their owner and an administrator. Donor
          coordinates are rounded before storage; exact home locations are not
          requested.
        </p>
        <h2>Contact sharing</h2>
        <p>
          Accepting a request authorises sharing the donor’s preferred contact
          method between the two parties. Both parties’ matching contact method
          is used. A database audit record is created. Cancellation, expiry,
          suspension or blocking prevents further access, but cannot erase a
          number already viewed.
        </p>
        <h2>Demonstration data</h2>
        <p>
          Demo people, facilities and requests are fictional. Do not call or
          travel to demo facilities. Real users only match real requests; demo
          users only match demo requests.
        </p>
        <h2>Medical responsibility</h2>
        <p>
          Matches are candidates, not clinical approval. Blood grouping,
          crossmatching, component selection and donor eligibility must be
          confirmed by qualified medical professionals. Contact your hospital
          directly in emergencies.
        </p>
        <h2>Retention and account controls</h2>
        <p>
          Deactivation stops login and discovery. Audit and request history
          remain until the operator reviews an erasure request. This prototype
          stores personal information in SQLite, not an encrypted database:
          protect the server, backups and filesystem. Do not deploy with real
          patient data without a privacy and security review.
        </p>
        <h2>Third-party maps</h2>
        <p>
          Map tiles are requested from OpenStreetMap. The tile provider sees
          network metadata and the viewed map region; no donor names, contacts
          or medical documents are sent. Location permission is optional.
        </p>
        <h2>Terms</h2>
        <p>
          No availability, donation or response is guaranteed. Do not harass
          users, submit fabricated real requests or republish private
          information. Facility verification is an administrator’s review label,
          not a certification or blood-stock guarantee.
        </p>
      </div>
    </>
  );
}
function NotFound() {
  return (
    <Empty text="This page isn’t here">
      <p>Check the address or return to the overview.</p>
      <Link className="btn" to="/">
        Back to overview
      </Link>
    </Empty>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
