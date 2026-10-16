
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5001";

function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [readings, setReadings] = useState(null);
  const [error, setError] = useState("");

  async function submitAuth(event) {
    event.preventDefault();
    setMessage("");

    try {
      const endpoint =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";

      const body =
        mode === "register"
          ? { userId, name, password }
          : { userId, password };

      const response = await fetch(API + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Authentication failed");
        return;
      }

      setUser(result.user);
      setToken(result.token);
      setPassword("");
      setMessage("");
    } catch {
      setMessage("Cannot connect to the backend. Check port 5001.");
    }
  }

  useEffect(() => {
    if (!token) return;

    let active = true;

    async function fetchSensors() {
      try {
        const response = await fetch(`${API}/api/sensors`);

        if (!response.ok) throw new Error("Sensor request failed");

        const result = await response.json();

        if (active) {
          setReadings(result.data);
          setError("");
        }
      } catch {
        if (active) setError("Could not load sensor readings.");
      }
    }

    fetchSensors();
    const timer = setInterval(fetchSensors, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token]);

  if (!user) {
    return (
      <main className="app auth-page">
        <section className="panel auth-panel">
          <div className="brand">✳ Clean Air <b>Pharma</b></div>
          <p className="eyebrow">CLEANROOM ENVIRONMENT SYSTEM</p>
          <h1>{mode === "register" ? "Create account" : "Welcome back"}</h1>
          <p className="muted">
            {mode === "register"
              ? "Register to access the monitoring dashboard."
              : "Log in to view environmental readings."}
          </p>

          <form onSubmit={submitAuth}>
            <label htmlFor="userId">User ID</label>
            <input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              autoComplete="username"
            />

            {mode === "register" && (
              <>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </>
            )}

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
            />

            <button type="submit">
              {mode === "register" ? "Register" : "Login"}
            </button>
          </form>

          {message && <p role="alert">{message}</p>}

          <p>
            {mode === "register"
              ? "Already have an account? "
              : "New user? "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setMessage("");
              }}
            >
              {mode === "register" ? "Login" : "Create account"}
            </button>
          </p>
        </section>
      </main>
    );
  }

  const sensors = readings
    ? [
        { name: "Temperature", value: readings.temperature, unit: "°C", icon: "🌡️" },
        { name: "Humidity", value: readings.humidity, unit: "%", icon: "💧" },
        { name: "Room Pressure", value: readings.pressure, unit: "Pa", icon: "🌬️" },
        { name: "Air Quality", value: readings.airQuality, unit: "/100", icon: "🍃" },
      ]
    : [];

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">✳ Clean Air <b>Pharma</b></div>
        <button
          type="button"
          onClick={() => {
            setUser(null);
            setToken("");
            setReadings(null);
          }}
        >
          Logout
        </button>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">CLEANROOM ENVIRONMENT SYSTEM</p>
          <h1>Environmental Dashboard</h1>
          <p className="muted">
            Welcome, {user.name} · Monitoring {readings?.room || "Cleanroom A"}
          </p>
        </div>
        <div className="room">🏭 {readings?.room || "Cleanroom A"}</div>
      </section>

      <section className="summary">
        <div>
          <span>System status</span>
          <strong className="green">
            {readings ? "● Connected" : "Loading"}
          </strong>
        </div>
        <div>
          <span>Sensor parameters</span>
          <strong>04 Monitored</strong>
        </div>
        <div>
          <span>Last updated</span>
          <strong>
            {readings?.timestamp
              ? new Date(readings.timestamp).toLocaleTimeString()
              : "Waiting..."}
          </strong>
        </div>
      </section>

      <h2>Environmental Parameters</h2>

      {error && <p role="alert">{error}</p>}
      {!readings && !error && <p>Loading sensor readings...</p>}

      <section className="sensor-grid">
        {sensors.map((sensor) => (
          <article className="sensor-card" key={sensor.name}>
            <div className="sensor-top">
              <span className="sensor-icon">{sensor.icon}</span>
              <span className="pill">PostgreSQL-backed API</span>
            </div>
            <p>{sensor.name}</p>
            <div className="reading">
              {sensor.value}<small>{sensor.unit}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>Account Details</h2>
        <p>User ID: {user.user_id}</p>
        <p>Name: {user.name}</p>
        <p>Sensor readings are simulated and saved in PostgreSQL.</p>
      </section>

      <footer>
        Clean Air Pharma · Cleanroom Monitoring System · {new Date().getFullYear()}
      </footer>
    </main>
  );
}

export default App;
