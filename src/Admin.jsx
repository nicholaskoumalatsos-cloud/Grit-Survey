import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import './Admin.css'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'psyc515admin'

const MARITAL_LABELS = { 1: 'Married', 2: 'Widowed', 3: 'Divorced', 4: 'Separated', 5: 'Never married' }

function exportToSPSS(data) {
  if (!data.length) return

  const headers = [
    'id', 'submitted_at', 'marital_status',
    'iss_1','iss_2','iss_3','iss_4','iss_5','iss_6','iss_avg',
    'grit_1','grit_2','grit_3','grit_4','grit_5','grit_6',
    'grit_7','grit_8','grit_9','grit_10','grit_11','grit_12','grit_avg'
  ]

  const rows = data.map(r => headers.map(h => {
    const val = r[h]
    if (val === null || val === undefined) return ''
    if (h === 'submitted_at') return new Date(val).toISOString()
    return val
  }))

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `grit_survey_spss_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('Incorrect password.')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('responses')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (!error) {
      setData(rows || [])
      setLastRefresh(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    if (authed) {
      fetchData()
      // live subscription
      const channel = supabase
        .channel('responses-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, () => fetchData())
        .subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [authed])

  // Computed stats
  const n = data.length
  const issAvgs = data.map(r => r.iss_avg).filter(v => v != null)
  const gritAvgs = data.map(r => r.grit_avg).filter(v => v != null)
  const mean = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : '—'
  const maritalCounts = data.reduce((acc, r) => {
    const label = MARITAL_LABELS[r.marital_status] || 'Unknown'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})

  if (!authed) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-box">
          <p className="admin-kicker">Research Dashboard</p>
          <h1 className="admin-login-title">Admin Access</h1>
          <div className="admin-rule" />
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          {pwError && <p className="pw-error">{pwError}</p>}
          <button className="login-btn" onClick={handleLogin}>Enter Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div>
            <p className="admin-kicker">Admin Dashboard · PSYC 515</p>
            <h1 className="admin-title">Spirituality &amp; Grit — Live Results</h1>
          </div>
          <div className="admin-header-actions">
            <button className="refresh-btn" onClick={fetchData} disabled={loading}>
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
            <button className="export-btn" onClick={() => exportToSPSS(data)} disabled={!n}>
              ↓ Export SPSS CSV
            </button>
          </div>
        </div>
        {lastRefresh && (
          <p className="last-refresh">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        )}
      </header>

      <main className="admin-main">

        {/* Stats row */}
        <div className="stats-row">
          <StatCard
            label="Total Responses"
            value={n}
            sub={n >= 20 ? '✓ Minimum reached' : `${20 - n} more needed`}
          />
          <StatCard label="Mean ISS Score" value={mean(issAvgs)} sub="Scale: 0–10" />
          <StatCard label="Mean Grit Score" value={mean(gritAvgs)} sub="Scale: 1–5" />
        </div>

        {/* Marital breakdown */}
        {n > 0 && (
          <div className="breakdown-block">
            <h2 className="block-title">Marital Status Breakdown</h2>
            <div className="marital-breakdown">
              {Object.entries(maritalCounts).map(([label, count]) => (
                <div key={label} className="marital-bar-row">
                  <span className="marital-bar-label">{label}</span>
                  <div className="marital-bar-track">
                    <div className="marital-bar-fill" style={{ width: `${(count/n)*100}%` }} />
                  </div>
                  <span className="marital-bar-count">{count} ({Math.round((count/n)*100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data table */}
        <div className="table-block">
          <h2 className="block-title">Response Log</h2>
          {n === 0 ? (
            <p className="no-data">No responses yet. Share your survey link to begin collecting data.</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Submitted</th>
                    <th>Marital Status</th>
                    <th>ISS Avg</th>
                    <th>Grit Avg</th>
                    {[1,2,3,4,5,6].map(i => <th key={i}>ISS {i}</th>)}
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <th key={i}>Grit {i}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="mono">{n - idx}</td>
                      <td className="mono">{new Date(row.submitted_at).toLocaleDateString()}</td>
                      <td>{MARITAL_LABELS[row.marital_status] || row.marital_status}</td>
                      <td className="score-cell iss">{row.iss_avg}</td>
                      <td className="score-cell grit">{row.grit_avg}</td>
                      {[1,2,3,4,5,6].map(i => <td key={i} className="mono">{row[`iss_${i}`]}</td>)}
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <td key={i} className="mono">{row[`grit_${i}`]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SPSS export note */}
        <div className="spss-note">
          <h2 className="block-title">SPSS Import Notes</h2>
          <ul>
            <li><strong>marital_status</strong> — coded 1–5 (1=Married, 2=Widowed, 3=Divorced, 4=Separated, 5=Never married)</li>
            <li><strong>iss_1 through iss_6</strong> — raw ISS item scores (0–10); reversed items stored as displayed</li>
            <li><strong>iss_avg</strong> — mean of all 6 ISS items (0–10); use this as your ISS variable in SPSS</li>
            <li><strong>grit_1 through grit_12</strong> — raw Grit item scores (1–5); items 1–6 are Consistency of Interests</li>
            <li><strong>grit_avg</strong> — calculated after reverse-scoring items 1–6 then averaging all 12 (1–5); use this as your Grit variable in SPSS</li>
            <li>Run a <strong>Pearson correlation</strong> between <em>iss_avg</em> and <em>grit_avg</em> for your main analysis</li>
          </ul>
        </div>

      </main>
    </div>
  )
}
