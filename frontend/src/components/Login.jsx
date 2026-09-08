import { useState } from "react";
import axios from "axios";

const API = "http://localhost:5001";

function Login({ setUser }) {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(
        `${API}/api/login`,
        {
          email,
          password,
        }
      );

      localStorage.setItem(
        "token",
        response.data.token
      );

      setUser(response.data.user);

    } catch (error) {
      setMessage(
        error.response?.data?.error ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!name || !email || !password) {
      setMessage("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(
        `${API}/api/register`,
        {
          name,
          email,
          password,
        }
      );

      setMessage(
        response.data.message ||
        "Registration successful!"
      );

      setName("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        setIsRegister(false);
        setMessage(
          "Registration successful! Please login."
        );
      }, 1000);

    } catch (error) {
      setMessage(
        error.response?.data?.error ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* LEFT BRANDING PANEL */}

      <div className="brand-panel">

        <div className="brand-logo">
          <div className="cloud-logo">
            🏫
          </div>

          <h1>
            Campus<span>Reserve</span>
          </h1>
        </div>

        <h2>
          Reserve Today.
          <br />
          Scale Tomorrow.
        </h2>

        <p className="brand-description">
          A smart and simple way to reserve
          and manage your college resources
          efficiently.
        </p>

        <div className="features">

          <div className="feature">
            <div className="feature-icon">🏫</div>

            <div>
              <strong>
                Easy Reservations
              </strong>

              <p>
                Reserve college resources
                in just a few clicks.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">🛡️</div>

            <div>
              <strong>
                Secure & Reliable
              </strong>

              <p>
                Your data and reservations
                are protected.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">⚡</div>

            <div>
              <strong>
                Real-time Availability
              </strong>

              <p>
                Check college resource
                availability instantly.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">📊</div>

            <div>
              <strong>
                Easy Management
              </strong>

              <p>
                Manage your reservations
                from one place.
              </p>
            </div>
          </div>

        </div>

        <div className="cloud-illustration">
          <div className="server server-1"></div>
          <div className="server server-2"></div>
          <div className="server server-3"></div>

          <div className="big-cloud">
            🏫
          </div>
        </div>

      </div>

      {/* RIGHT AUTH PANEL */}

      <div className="auth-panel">

        <div className="auth-card">

          <div className="mobile-logo">
            🏫
            <span>CampusReserve</span>
          </div>

          <h2>
            Welcome to{" "}
            <span>CampusReserve</span>
          </h2>

          <p className="auth-subtitle">
            {isRegister
              ? "Create your account to get started"
              : "Login to your account to continue"}
          </p>

          {/* TABS */}

          <div className="auth-tabs">

            <button
              className={!isRegister ? "active" : ""}
              onClick={() => {
                setIsRegister(false);
                setMessage("");
              }}
            >
              👤 Login
            </button>

            <button
              className={isRegister ? "active" : ""}
              onClick={() => {
                setIsRegister(true);
                setMessage("");
              }}
            >
              👤 Register
            </button>

          </div>

          {/* REGISTER NAME */}

          {isRegister && (
            <>
              <label>Name</label>

              <div className="input-wrapper">
                <span>👤</span>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                />
              </div>
            </>
          )}

          {/* EMAIL */}

          <label>Email</label>

          <div className="input-wrapper">
            <span>✉️</span>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          {/* PASSWORD */}

          <label>Password</label>

          <div className="input-wrapper">
            <span>🔒</span>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          {/* LOGIN */}

          <button
            className="auth-submit"
            onClick={
              isRegister ? register : login
            }
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
              ? "Create Account"
              : "Login"}
          </button>

          {/* MESSAGE */}

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          {/* SECURITY */}

          <div className="security-box">
            <span>🛡️</span>

            <div>
              <strong>
                Secure & Protected
              </strong>

              <p>
                Your account information
                is securely protected.
              </p>
            </div>
          </div>

          <p className="auth-footer">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setMessage("");
              }}
            >
              {isRegister
                ? " Login"
                : " Register"}
            </button>
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;