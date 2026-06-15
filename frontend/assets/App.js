import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';

const html = htm.bind(React.createElement);

// --- API Helper ---
async function api(url, options = {}) {
  const headers = options.body && !(options.body instanceof FormData) 
    ? { 'Content-Type': 'application/json', ...options.headers }
    : options.headers;
    
  const fetchOptions = {
    credentials: 'include',
    ...options,
    headers
  };
  
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// --- Shared Components ---
function Badge({ risk }) {
  const cls = risk === 'Severe' ? 'severe' : risk === 'Moderate' ? 'moderate' : '';
  return html`
    <span className=${`badge ${cls}`}>
      ${risk}
    </span>
  `;
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = type === 'error';
  return html`
    <div className="card-hover" style=${{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: isError ? '#ef4444' : 'var(--primary)',
      color: 'white',
      padding: '16px 24px',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1000,
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'fadeInUp 0.3s ease-out',
      border: `1px solid ${isError ? '#fca5a5' : '#bbf7d0'}`
    }}>
      <span>${message}</span>
      <button onClick=${onClose} style=${{
        background: 'transparent',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        fontSize: '20px',
        fontWeight: 'bold',
        marginLeft: '8px',
        lineHeight: 1
      }}>×</button>
    </div>
  `;
}

function FeedbackModal({ detectionId, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [outcome, setOutcome] = useState('Improved');
  const [comment, setComment] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit({ detection_id: detectionId, rating, outcome, comment });
  };

  return html`
    <div style=${{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(6px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 999,
      animation: 'fadeInUp 0.2s ease-out'
    }}>
      <form onSubmit=${handleFormSubmit} className="panel form" style=${{
        width: '90%',
        maxWidth: '480px',
        background: 'white',
        padding: '32px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--line)'
      }}>
        <h2 style=${{ fontSize: '24px', marginBottom: '16px', color: 'var(--secondary)' }}>Add Treatment Feedback</h2>
        
        <label>Rating (1-5)
          <select value=${rating} onChange=${e => setRating(parseInt(e.target.value))}>
            <option value="5">5 ★★★★★ (Excellent)</option>
            <option value="4">4 ★★★★☆ (Good)</option>
            <option value="3">3 ★★★☆☆ (Moderate)</option>
            <option value="2">2 ★★☆☆☆ (Poor)</option>
            <option value="1">1 ★☆☆☆☆ (Ineffective)</option>
          </select>
        </label>
        
        <label style=${{ marginTop: '12px' }}>Treatment Outcome
          <input value=${outcome} onChange=${e => setOutcome(e.target.value)} placeholder="e.g. Improved, Resolved" required />
        </label>
        
        <label style=${{ marginTop: '12px' }}>Comments
          <textarea value=${comment} onChange=${e => setComment(e.target.value)} placeholder="Notes about pesticide effect, recovery rate, etc." />
        </label>
        
        <div style=${{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost small" onClick=${onClose}>Cancel</button>
          <button type="submit" className="btn small">Save Feedback</button>
        </div>
      </form>
    </div>
  `;
}

// --- Advisory Component ---
function AdvisoryResult({ data, imageUrl }) {
  const p = data.prediction || {};
  const a = data.advisory || {};
  const fuzzy = a.fuzzy_inputs || {};

  return html`
    <div>
      ${imageUrl && html`<img className="preview-img" src=${imageUrl} alt="Uploaded crop image" />`}
      <h2>${p.pest || 'Manual Advisory'}</h2>
      <p style=${{ marginBottom: '12px' }}>
        <b>Confidence: </b> 
        ${p.confidence !== undefined ? Math.round(p.confidence * 100) + '%' : 'Manual Scouted'} 
        ${'\u00A0\u00A0\u00A0•\u00A0\u00A0\u00A0'} 
        <b>Severity: </b> ${p.severity !== undefined ? p.severity : fuzzy.severity}/100
      </p>
      
      <p style=${{ marginBottom: '16px' }}>
        <b>Risk: </b> <${Badge} risk=${a.risk} /> 
        ${'\u00A0\u00A0\u00A0•\u00A0\u00A0\u00A0'} 
        <b>Score: </b> <strong>${a.risk_score}</strong>
      </p>
      
      <div className="alert" style=${{ background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success)' }}>
        <b>Action Alert:</b> ${a.action}
      </div>
      
      <h3>Recommendations</h3>
      <ul className="advice-list" style=${{ marginBottom: '24px' }}>
        ${a.recommendations && a.recommendations.map((rec, i) => html`
          <li key=${i}>${rec}</li>
        `)}
      </ul>
      
      <details>
        <summary>Fuzzy rule inputs details</summary>
        <pre style=${{ fontSize: '11px', marginTop: '10px' }}>
          ${JSON.stringify(fuzzy, null, 2)}
        </pre>
      </details>
    </div>
  `;
}

// --- View: Landing Page ---
function LandingPage({ onNavigate }) {
  return html`
    <div style=${{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <div className="brand">
          <span className="logo" style=${{ overflow: 'hidden', padding: 0 }}><img src="/assets/logo.jpg" alt="Logo" style=${{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
          <div>
            <strong>CropGuard AI</strong>
            <small>Fuzzy Logic + AI Pest Advisory</small>
          </div>
        </div>
        <nav>
          <a href="#features">Features</a>
          <button className="nav" style=${{ background: 'transparent', border: 0, padding: 0 }} onClick=${() => onNavigate('login')}>Login</button>
          <button className="btn small" onClick=${() => onNavigate('register')}>Start Now</button>
        </nav>
      </header>
      
      <main className="hero">
        <section className="hero-copy">
          <p className="eyebrow">Smart Agriculture Platform</p>
          <h1>Detect pests, calculate risk, and guide farmers with precise advisory.</h1>
          <p className="lead">
            A deployment-ready working model for image-based pest detection, fuzzy decision support, farmer history, admin monitoring, feedback, and sensor data logging.
          </p>
          <div className="actions">
            <button className="btn" onClick=${() => onNavigate('register')}>Create Farmer Account</button>
            <button className="btn ghost" onClick=${() => onNavigate('login')}>Admin Login</button>
          </div>
          <div className="credentials">
            <strong>Demo Admin:</strong> admin@cropguard.local / Admin@123
          </div>
        </section>
        
        <section className="hero-card">
          <div className="scan-card card-hover">
            <span className="status-dot"></span>
            <p>Real-time field workflow</p>
            <h3>Upload crop image → AI prediction → fuzzy risk → advisory</h3>
            <div className="metric-grid">
              <span><b>6</b>Pest Classes</span>
              <span><b>FIS</b>Risk Engine</span>
              <span><b>SQLite</b>Ready DB</span>
            </div>
          </div>
        </section>
      </main>
      
      <section id="features" className="section">
        <h2>Complete modules</h2>
        <div className="cards">
          <article className="card-hover">
            <h3>Farmer Portal</h3>
            <p>Register, upload pest images, add field data, view advisory and detection history.</p>
          </article>
          <article className="card-hover">
            <h3>AI Detection</h3>
            <p>Working model adapter with heuristic demo mode and clean TensorFlow integration point.</p>
          </article>
          <article className="card-hover">
            <h3>Fuzzy Advisory</h3>
            <p>Mamdani-inspired risk scoring using severity, humidity, temperature and crop context.</p>
          </article>
          <article className="card-hover">
            <h3>Admin Control</h3>
            <p>Monitor farmers, severe cases, pest trends, detections and case statuses.</p>
          </article>
        </div>
      </section>
    </div>
  `;
}

// --- View: Login ---
function Login({ onNavigate, onAuthSuccess, showToast }) {
  const [email, setEmail] = useState('admin@cropguard.local');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: { email, password }
      });
      showToast('Logged in successfully!');
      onAuthSuccess(data.user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div className="auth-body">
      <div className="auth-shell">
        <aside style=${{ background: 'var(--secondary-gradient)' }}>
          <div className="brand" onClick=${() => onNavigate('landing')} style=${{ cursor: 'pointer' }}>
            <span className="logo" style=${{ overflow: 'hidden', padding: 0 }}><img src="/assets/logo.jpg" alt="Logo" style=${{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
            <div>
              <strong style=${{ color: 'white' }}>CropGuard AI</strong>
              <small>Secure Access</small>
            </div>
          </div>
          <h1 style=${{ fontSize: '32px', color: 'white', marginTop: '24px' }}>Welcome back</h1>
          <p>Login as farmer or admin to continue pest management workflow.</p>
          <ul style=${{ color: '#cbd5e1' }}>
            <li style=${{ margin: '12px 0' }}>AI pest detection</li>
            <li style=${{ margin: '12px 0' }}>Fuzzy risk recommendations</li>
            <li style=${{ margin: '12px 0' }}>Detection history and reports</li>
          </ul>
        </aside>
        
        <form className="auth-card" onSubmit=${handleSubmit}>
          <h2>Sign in</h2>
          <label>Email
            <input type="email" value=${email} onChange=${e => setEmail(e.target.value)} required />
          </label>
          <label>Password
            <input type="password" value=${password} onChange=${e => setPassword(e.target.value)} required />
          </label>
          <button className="btn" type="submit" disabled=${loading}>
            ${loading ? 'Checking...' : 'Login'}
          </button>
          <p className="muted">New farmer? <a href="#" onClick=${(e) => { e.preventDefault(); onNavigate('register'); }}>Create account</a></p>
        </form>
      </div>
    </div>
  `;
}

// --- View: Register ---
function Register({ onNavigate, onAuthSuccess, showToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('/api/register', {
        method: 'POST',
        body: { name, email, password, farm_name: farmName, location, role: 'farmer' }
      });
      showToast('Account created successfully!');
      onAuthSuccess(data.user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div className="auth-body">
      <div className="auth-shell">
        <aside style=${{ background: 'var(--secondary-gradient)' }}>
          <div className="brand" onClick=${() => onNavigate('landing')} style=${{ cursor: 'pointer' }}>
            <span className="logo" style=${{ overflow: 'hidden', padding: 0 }}><img src="/assets/logo.jpg" alt="Logo" style=${{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
            <div>
              <strong style=${{ color: 'white' }}>CropGuard AI</strong>
              <small>Farmer Onboarding</small>
            </div>
          </div>
          <h1 style=${{ fontSize: '32px', color: 'white', marginTop: '24px' }}>Create account</h1>
          <p>Start using image detection, manual pest entry, sensor logs and advisory system.</p>
        </aside>
        
        <form className="auth-card" onSubmit=${handleSubmit}>
          <h2>Register</h2>
          <label>Name
            <input value=${name} onChange=${e => setName(e.target.value)} placeholder="Your full name" required />
          </label>
          <label>Email
            <input type="email" value=${email} onChange=${e => setEmail(e.target.value)} placeholder="name@example.com" required />
          </label>
          <label>Password
            <input type="password" value=${password} onChange=${e => setPassword(e.target.value)} minLength="6" placeholder="Min 6 characters" required />
          </label>
          <label>Farm Name
            <input value=${farmName} onChange=${e => setFarmName(e.target.value)} placeholder="e.g. Green Valley Farms" />
          </label>
          <label>Location
            <input value=${location} onChange=${e => setLocation(e.target.value)} placeholder="Village / District" />
          </label>
          <button className="btn" type="submit" disabled=${loading}>
            ${loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="muted">Already registered? <a href="#" onClick=${(e) => { e.preventDefault(); onNavigate('login'); }}>Login</a></p>
        </form>
      </div>
    </div>
  `;
}

// --- Main Dashboard Controller ---
function Dashboard({ currentUser, onLogout, showToast }) {
  const [view, setView] = useState('overview');
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal feedback state
  const [feedbackId, setFeedbackId] = useState(null);

  // Fetch detections list
  const fetchDetections = async () => {
    try {
      const data = await api('/api/detections');
      setDetections(data.detections || []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchDetections();
  }, [view]);

  // Statistics calculations
  const stats = useMemo(() => {
    const severe = detections.filter(d => d.risk === 'Severe').length;
    const open = detections.filter(d => d.status === 'Open').length;
    const avgScore = detections.length 
      ? Math.round(detections.reduce((sum, d) => sum + d.risk_score, 0) / detections.length)
      : 0;
    return {
      total: detections.length,
      severe,
      open,
      avgScore
    };
  }, [detections]);

  const handleLogout = async () => {
    try {
      await api('/api/logout', { method: 'POST' });
      showToast('Logged out.');
      onLogout();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      await api('/api/feedback', {
        method: 'POST',
        body: feedbackData
      });
      showToast('Feedback saved!');
      setFeedbackId(null);
      fetchDetections();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api(`/api/admin/detection/${id}/status`, {
        method: 'POST',
        body: { status }
      });
      showToast('Status updated.');
      fetchDetections();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- Dashboard Subviews ---

  // Subview: Overview
  function OverviewSub() {
    const [fieldName, setFieldName] = useState('');
    const [temp, setTemp] = useState(31.0);
    const [humidity, setHumidity] = useState(72.0);
    const [moisture, setMoisture] = useState(45.0);
    const [pestCount, setPestCount] = useState(5);
    const [saving, setSaving] = useState(false);

    const handleSensorSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
        await api('/api/sensor-log', {
          method: 'POST',
          body: {
            field_name: fieldName,
            temperature: parseFloat(temp),
            humidity: parseFloat(humidity),
            soil_moisture: parseFloat(moisture),
            pest_count: parseInt(pestCount)
          }
        });
        showToast('Sensor log saved!');
        setFieldName('');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setSaving(false);
      }
    };

    return html`
      <div className="view active">
        <div className="head">
          <h1>Overview</h1>
          <button className="btn small" onClick=${() => setView('detect')}>New Detection</button>
        </div>
        
        <div className="stats">
          <div className="stat"><b>${stats.total}</b><span>Total Detections</span></div>
          <div className="stat"><b>${stats.severe}</b><span>Severe Alerts</span></div>
          <div className="stat"><b>${stats.open}</b><span>Open Cases</span></div>
          <div className="stat"><b>${stats.avgScore}</b><span>Avg Risk Score</span></div>
        </div>
        
        <div className="grid2">
          <div className="panel">
            <h3>Recent pest detections</h3>
            <div className="list">
              ${detections.slice(0, 5).map(d => html`
                <div key=${d.id} className="item card-hover">
                  <b>${d.pest}</b> <${Badge} risk=${d.risk} />
                  <p>${d.crop_type} • ${d.field_name} • ${new Date(d.created_at).toLocaleString()}</p>
                </div>
              `)}
              ${detections.length === 0 && html`<p className="muted">No detections yet.</p>`}
            </div>
          </div>
          
          <div className="panel">
            <h3>Early warning</h3>
            <div className="alert">
              <b>Rule:</b> High humidity + medium/severe pest severity increases outbreak risk. Add sensor logs regularly for better advisory.
            </div>
            
            <form onSubmit=${handleSensorSubmit} className="mini-form">
              <input value=${fieldName} onChange=${e => setFieldName(e.target.value)} placeholder="Field name" required />
              <label style=${{ display: 'inline-flex', width: '100%', gap: '8px' }}>Temp °C
                <input type="number" step="0.1" value=${temp} onChange=${e => setTemp(e.target.value)} required />
              </label>
              <label style=${{ display: 'inline-flex', width: '100%', gap: '8px' }}>Humidity %
                <input type="number" step="0.1" value=${humidity} onChange=${e => setHumidity(e.target.value)} required />
              </label>
              <label style=${{ display: 'inline-flex', width: '100%', gap: '8px' }}>Soil %
                <input type="number" step="0.1" value=${moisture} onChange=${e => setMoisture(e.target.value)} required />
              </label>
              <label style=${{ display: 'inline-flex', width: '100%', gap: '8px' }}>Pest Count
                <input type="number" value=${pestCount} onChange=${e => setPestCount(e.target.value)} required />
              </label>
              <button className="btn small" type="submit" disabled=${saving}>
                ${saving ? 'Saving...' : 'Save Sensor Log'}
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // Subview: AI Detection Form & Results
  function AIDetectSub() {
    const [cropType, setCropType] = useState('Tomato');
    const [fieldName, setFieldName] = useState('Field A');
    const [temp, setTemp] = useState(31.0);
    const [humidity, setHumidity] = useState(72.0);
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState(null);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
      }
    };

    const handleDetectSubmit = async (e) => {
      e.preventDefault();
      if (!file) {
        showToast('Please select a crop image file.', 'error');
        return;
      }
      setRunning(true);
      setResult(null);
      
      const formData = new FormData();
      formData.append('crop_type', cropType);
      formData.append('field_name', fieldName);
      formData.append('temperature', temp);
      formData.append('humidity', humidity);
      formData.append('notes', notes);
      formData.append('image', file);

      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'AI detection failed');
        setResult(data);
        showToast('AI analysis completed.');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setRunning(false);
      }
    };

    return html`
      <div className="view active">
        <div className="head">
          <h1>AI Pest Detection</h1>
          <p>Upload affected crop image and environmental field conditions.</p>
        </div>
        
        <div className="grid2">
          <form className="panel form" onSubmit=${handleDetectSubmit}>
            <label>Crop Type
              <input value=${cropType} onChange=${e => setCropType(e.target.value)} required />
            </label>
            <label>Field Name
              <input value=${fieldName} onChange=${e => setFieldName(e.target.value)} required />
            </label>
            <label>Temperature °C
              <input type="number" step="0.1" value=${temp} onChange=${e => setTemp(e.target.value)} required />
            </label>
            <label>Humidity %
              <input type="number" step="0.1" value=${humidity} onChange=${e => setHumidity(e.target.value)} required />
            </label>
            <label>Notes
              <textarea value=${notes} onChange=${e => setNotes(e.target.value)} placeholder="Visible symptoms, leaf spots, crop age..." />
            </label>
            <label>Crop/Pest Image
              <input type="file" accept="image/*" onChange=${handleFileChange} required />
            </label>
            <button className="btn" type="submit" disabled=${running}>
              ${running ? 'Running AI Detection...' : 'Run AI Detection'}
            </button>
          </form>
          
          <div className="panel result">
            <h3>Detection result</h3>
            ${running && html`
              <div>
                <h3>Processing...</h3>
                <p className="muted">Running image analysis and fuzzy risk advisory.</p>
              </div>
            `}
            ${!running && !result && html`<p className="muted">Result will appear here after upload.</p>`}
            ${!running && result && html`
              <${AdvisoryResult} data=${result} imageUrl=${result.image_url} />
            `}
          </div>
        </div>
      </div>
    `;
  }

  // Subview: Manual Entry Form & Results
  function ManualSub() {
    const [pest, setPest] = useState('Aphids');
    const [severity, setSeverity] = useState(55);
    const [cropType, setCropType] = useState('Cotton');
    const [fieldName, setFieldName] = useState('Field B');
    const [temp, setTemp] = useState(30.0);
    const [humidity, setHumidity] = useState(68.0);
    const [notes, setNotes] = useState('');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);

    const handleManualSubmit = async (e) => {
      e.preventDefault();
      setRunning(true);
      setResult(null);
      try {
        const data = await api('/api/manual-entry', {
          method: 'POST',
          body: {
            pest,
            severity: parseFloat(severity),
            crop_type: cropType,
            field_name: fieldName,
            temperature: parseFloat(temp),
            humidity: parseFloat(humidity),
            notes
          }
        });
        setResult(data);
        showToast('Manual advisory generated.');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setRunning(false);
      }
    };

    return html`
      <div className="view active">
        <div className="head">
          <h1>Manual Pest Entry</h1>
          <p>Use when image upload is not possible but field scout has identified the pest.</p>
        </div>
        
        <div className="grid2">
          <form className="panel form" onSubmit=${handleManualSubmit}>
            <label>Pest
              <select value=${pest} onChange=${e => setPest(e.target.value)}>
                <option value="Aphids">Aphids</option>
                <option value="Whitefly">Whitefly</option>
                <option value="Leaf Miner">Leaf Miner</option>
                <option value="Stem Borer">Stem Borer</option>
                <option value="Armyworm">Armyworm</option>
                <option value="Red Spider Mite">Red Spider Mite</option>
              </select>
            </label>
            <label>Severity 0-100 (${severity})
              <input type="range" min="0" max="100" value=${severity} onChange=${e => setSeverity(parseInt(e.target.value))} />
            </label>
            <label>Crop Type
              <input value=${cropType} onChange=${e => setCropType(e.target.value)} required />
            </label>
            <label>Field Name
              <input value=${fieldName} onChange=${e => setFieldName(e.target.value)} required />
            </label>
            <label>Temperature °C
              <input type="number" step="0.1" value=${temp} onChange=${e => setTemp(e.target.value)} required />
            </label>
            <label>Humidity %
              <input type="number" step="0.1" value=${humidity} onChange=${e => setHumidity(e.target.value)} required />
            </label>
            <label>Notes
              <textarea value=${notes} onChange=${e => setNotes(e.target.value)} placeholder="Symptoms, field history notes..." />
            </label>
            <button className="btn" type="submit" disabled=${running}>
              ${running ? 'Generating Advisory...' : 'Generate Advisory'}
            </button>
          </form>
          
          <div className="panel result">
            <h3>Manual advisory result</h3>
            ${running && html`<h3>Generating...</h3>`}
            ${!running && !result && html`<p className="muted">Submit entry to see fuzzy advisory.</p>`}
            ${!running && result && html`
              <${AdvisoryResult} data=${result} />
            `}
          </div>
        </div>
      </div>
    `;
  }

  // Subview: History List with Search & Feedback Trigger
  function HistorySub() {
    const filteredRows = useMemo(() => {
      const q = search.toLowerCase();
      if (!q) return detections;
      return detections.filter(d => 
        String(d.pest || '').toLowerCase().includes(q) ||
        String(d.crop_type || '').toLowerCase().includes(q) ||
        String(d.field_name || '').toLowerCase().includes(q) ||
        String(d.risk || '').toLowerCase().includes(q) ||
        String(d.farmer_name || '').toLowerCase().includes(q)
      );
    }, [detections, search]);

    return html`
      <div className="view active">
        <div className="head">
          <h1>Detection History</h1>
          <input 
            value=${search} 
            onChange=${e => setSearch(e.target.value)} 
            className="search" 
            placeholder="Search pest, crop, field, risk..." 
          />
        </div>
        
        <div className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Farmer</th>
                  <th>Crop</th>
                  <th>Field</th>
                  <th>Pest</th>
                  <th>Severity</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRows.map(d => html`
                  <tr key=${d.id}>
                    <td>${new Date(d.created_at).toLocaleString()}</td>
                    <td>${d.farmer_name}</td>
                    <td>${d.crop_type}</td>
                    <td>${d.field_name}</td>
                    <td>${d.pest}</td>
                    <td>${d.severity}</td>
                    <td>
                      <${Badge} risk=${d.risk} /><br/>
                      <small style=${{ color: 'var(--text-muted)' }}>Score: ${d.risk_score}</small>
                    </td>
                    <td>
                      ${currentUser.role === 'admin' ? html`
                        <select value=${d.status} onChange=${e => handleStatusChange(d.id, e.target.value)}>
                          <option value="Open">Open</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Escalated">Escalated</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      ` : d.status}
                    </td>
                    <td>
                      <button className="btn ghost small" onClick=${() => setFeedbackId(d.id)}>
                        Add
                      </button>
                    </td>
                  </tr>
                `)}
                ${filteredRows.length === 0 && html`
                  <tr>
                    <td colspan="9" style=${{ textAlign: 'center', padding: '32px' }} className="muted">
                      No records found.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Subview: Admin Panel
  function AdminSub() {
    const [adminStats, setAdminStats] = useState(null);
    const [adminUsers, setAdminUsers] = useState([]);
    const [loadingAdmin, setLoadingAdmin] = useState(true);

    const fetchAdminData = async () => {
      try {
        const statsData = await api('/api/admin/stats');
        const usersData = await api('/api/admin/users');
        setAdminStats(statsData);
        setAdminUsers(usersData.users || []);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoadingAdmin(false);
      }
    };

    useEffect(() => {
      if (currentUser.role === 'admin') {
        fetchAdminData();
      }
    }, []);

    if (currentUser.role !== 'admin') {
      return html`<div>Admin access required.</div>`;
    }

    if (loadingAdmin) {
      return html`<div style=${{ padding: '40px', textAlign: 'center' }}>Loading Admin panel details...</div>`;
    }

    return html`
      <div className="view active">
        <div className="head">
          <h1>Admin Control Center</h1>
          <p>Farmers, detections, and high-risk case oversight.</p>
        </div>
        
        <div className="stats">
          <div className="stat"><b>${adminStats.total_farmers}</b><span>Total Farmers</span></div>
          <div className="stat"><b>${adminStats.detections}</b><span>Detections</span></div>
          <div className="stat"><b>${adminStats.severe}</b><span>Severe Cases</span></div>
          <div className="stat"><b>${adminStats.open_cases}</b><span>Open Cases</span></div>
        </div>
        
        <div className="grid2">
          <div className="panel">
            <h3>Registered Farmers</h3>
            <div className="list">
              ${adminUsers.map(u => html`
                <div key=${u.id} className="item card-hover">
                  <b>${u.name}</b>
                  <p>${u.email} • Role: ${u.role} • Farm: ${u.farm_name || '-'} • Location: ${u.location || '-'}</p>
                </div>
              `)}
            </div>
          </div>
          
          <div className="panel">
            <h3>Case Actions</h3>
            <p className="muted" style=${{ marginBottom: '16px' }}>Manage resolution statuses from the Detection History table.</p>
            <div className="list">
              ${detections.slice(0, 8).map(d => html`
                <div key=${d.id} className="item card-hover">
                  <b>Case #${d.id}: ${d.pest}</b> <${Badge} risk=${d.risk} />
                  <p>Farmer: ${d.farmer_name} • Status: <strong>${d.status}</strong></p>
                </div>
              `)}
              ${detections.length === 0 && html`<p className="muted">No cases logged.</p>`}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Subview: Profile
  function ProfileSub() {
    return html`
      <div className="view active">
        <div className="head">
          <h1>My Profile</h1>
        </div>
        <div className="panel" id="profileBox">
          <h2>${currentUser.name}</h2>
          <p style=${{ padding: '12px 0', borderBottom: '1px solid var(--soft)' }}>
            <b style=${{ display: 'inline-block', width: '120px', color: 'var(--text-muted)' }}>Email:</b> 
            ${currentUser.email}
          </p>
          <p style=${{ padding: '12px 0', borderBottom: '1px solid var(--soft)' }}>
            <b style=${{ display: 'inline-block', width: '120px', color: 'var(--text-muted)' }}>Role:</b> 
            ${currentUser.role}
          </p>
          <p style=${{ padding: '12px 0', borderBottom: '1px solid var(--soft)' }}>
            <b style=${{ display: 'inline-block', width: '120px', color: 'var(--text-muted)' }}>Farm:</b> 
            ${currentUser.farm_name || '-'}
          </p>
          <p style=${{ padding: '12px 0', borderBottom: '1px solid var(--soft)' }}>
            <b style=${{ display: 'inline-block', width: '120px', color: 'var(--text-muted)' }}>Location:</b> 
            ${currentUser.location || '-'}
          </p>
        </div>
      </div>
    `;
  }

  return html`
    <div className="app-body">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" style=${{ overflow: 'hidden', padding: 0 }}><img src="/assets/logo.jpg" alt="Logo" style=${{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
          <div>
            <strong>CropGuard AI</strong>
            <small id="roleLabel">${currentUser.role === 'admin' ? 'Admin Dashboard' : 'Farmer Dashboard'}</small>
          </div>
        </div>
        
        <button className=${`nav ${view === 'overview' ? 'active' : ''}`} onClick=${() => setView('overview')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          Overview
        </button>
        <button className=${`nav ${view === 'detect' ? 'active' : ''}`} onClick=${() => setView('detect')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          AI Detection
        </button>
        <button className=${`nav ${view === 'manual' ? 'active' : ''}`} onClick=${() => setView('manual')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
          Manual Entry
        </button>
        <button className=${`nav ${view === 'history' ? 'active' : ''}`} onClick=${() => setView('history')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          History
        </button>
        
        ${currentUser.role === 'admin' && html`
          <button className=${`nav ${view === 'admin' ? 'active' : ''}`} onClick=${() => setView('admin')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Admin
          </button>
        `}
        
        <button className=${`nav ${view === 'profile' ? 'active' : ''}`} onClick=${() => setView('profile')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Profile
        </button>
        
        <button className="nav danger" onClick=${handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </button>
      </aside>
      
      <main className="content">
        ${view === 'overview' && html`<${OverviewSub} />`}
        ${view === 'detect' && html`<${AIDetectSub} />`}
        ${view === 'manual' && html`<${ManualSub} />`}
        ${view === 'history' && html`<${HistorySub} />`}
        ${view === 'admin' && html`<${AdminSub} />`}
        ${view === 'profile' && html`<${ProfileSub} />`}
      </main>

      ${feedbackId && html`
        <${FeedbackModal} 
          detectionId=${feedbackId} 
          onClose=${() => setFeedbackId(null)} 
          onSubmit=${handleFeedbackSubmit} 
        />
      `}
    </div>
  `;
}

// --- Main Application Router ---
function App() {
  const [route, setRoute] = useState('landing'); // 'landing', 'login', 'register', 'dashboard'
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const checkUserSession = async () => {
    try {
      const data = await api('/api/me');
      if (data.user) {
        setCurrentUser(data.user);
        setRoute('dashboard');
      } else {
        setRoute('landing');
      }
    } catch (e) {
      setRoute('landing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setRoute('dashboard');
  };

  const handleLogoutSuccess = () => {
    setCurrentUser(null);
    setRoute('landing');
  };

  if (loading) {
    return html`
      <div style=${{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f9f8f6',
        fontFamily: 'sans-serif'
      }}>
        <div style=${{ textAlign: 'center' }}>
          <h2 style=${{ color: 'var(--primary)', marginBottom: '8px' }}>CropGuard AI</h2>
          <p className="muted">Initializing smart advisory...</p>
        </div>
      </div>
    `;
  }

  return html`
    <div style=${{ minHeight: '100vh', width: '100%' }}>
      ${route === 'landing' && html`<${LandingPage} onNavigate=${setRoute} />`}
      ${route === 'login' && html`
        <${Login} 
          onNavigate=${setRoute} 
          onAuthSuccess=${handleAuthSuccess} 
          showToast=${showToast} 
        />
      `}
      ${route === 'register' && html`
        <${Register} 
          onNavigate=${setRoute} 
          onAuthSuccess=${handleAuthSuccess} 
          showToast=${showToast} 
        />
      `}
      ${route === 'dashboard' && html`
        <${Dashboard} 
          currentUser=${currentUser} 
          onLogout=${handleLogoutSuccess} 
          showToast=${showToast} 
        />
      `}

      ${toast && html`
        <${Toast} 
          message=${toast.message} 
          type=${toast.type} 
          onClose=${() => setToast(null)} 
        />
      `}
    </div>
  `;
}

// Render Mount
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(html`<${App} />`);
