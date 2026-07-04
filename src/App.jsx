import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function LoginScreen({ onLogin }) {
  const [loginId, setLoginId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!loginId.trim() || !pin.trim()) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('users')
      .select('*')
      .eq('login_id', loginId.trim())
      .eq('pin', pin.trim())
      .maybeSingle()

    if (err || !data) {
      setError('ID atau PIN salah. Coba lagi.')
      setLoading(false)
      return
    }
    localStorage.setItem('userId', data.id)
    localStorage.setItem('userName', data.name)
    localStorage.setItem('userRole', data.role)
    onLogin(data)
    setLoading(false)
  }

  return (
    <div className="card login-card">
      <p className="label">Masuk</p>
      <input
        value={loginId}
        onChange={(e) => setLoginId(e.target.value)}
        placeholder="ID (contoh: magang01)"
      />
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="PIN"
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {error && <p className="error-text">{error}</p>}
      <button className="primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Memeriksa...' : 'Masuk'}
      </button>
    </div>
  )
}

function InternView({ user, onLogout }) {
  const [attendance, setAttendance] = useState(null)
  const [taskText, setTaskText] = useState('')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAttendance()
    loadTasks()
  }, [])

  async function loadAttendance() {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayDate())
      .maybeSingle()
    setAttendance(data || null)
  }

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', todayDate())
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function handleCheckIn() {
    setLoading(true)
    const { data, error } = await supabase
      .from('attendance')
      .insert({ user_id: user.id, check_in: new Date().toISOString() })
      .select()
      .single()
    if (!error) setAttendance(data)
    setLoading(false)
  }

  async function handleCheckOut() {
    if (!attendance) return
    setLoading(true)
    const { data, error } = await supabase
      .from('attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', attendance.id)
      .select()
      .single()
    if (!error) setAttendance(data)
    setLoading(false)
  }

  async function handleSubmitTask() {
    if (!taskText.trim()) return
    setLoading(true)
    const { error } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, content: taskText.trim() })
    if (!error) {
      setTaskText('')
      loadTasks()
    }
    setLoading(false)
  }

  const status = attendance?.check_out ? 'Selesai' : attendance?.check_in ? 'Sedang bekerja' : 'Belum absen'

  return (
    <div>
      <div className="card">
        <div className="row-between">
          <div>
            <p className="name">{user.name}</p>
            <p className="muted">{status}</p>
          </div>
          <button className="ghost" onClick={onLogout}>Keluar</button>
        </div>
        <div className="btn-row">
          <button className="primary" onClick={handleCheckIn} disabled={loading || !!attendance}>Check-in</button>
          <button className="primary" onClick={handleCheckOut} disabled={loading || !attendance || !!attendance?.check_out}>Check-out</button>
        </div>
        {attendance && (
          <p className="muted small">
            {attendance.check_in && `Check-in ${formatTime(attendance.check_in)}`}
            {attendance.check_out && `  ·  Check-out ${formatTime(attendance.check_out)}`}
          </p>
        )}
      </div>

      <div className="card">
        <p className="label">Laporan tugas hari ini</p>
        <textarea
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="Tulis tugas/project yang dikerjakan hari ini"
        />
        <button className="primary full" onClick={handleSubmitTask} disabled={loading}>Kirim laporan</button>
        <div className="task-list">
          {tasks.map((t) => (
            <div key={t.id} className="task-item">
              <span className="muted small">{formatTime(t.created_at)}</span> — {t.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MentorView({ user, onLogout }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: interns } = await supabase.from('users').select('*').eq('role', 'intern')
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', todayDate())
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('created_at', todayDate())

    const combined = (interns || []).map((intern) => ({
      ...intern,
      attendance: (attendance || []).find((a) => a.user_id === intern.id),
      tasks: (tasks || []).filter((t) => t.user_id === intern.id),
    }))
    setRows(combined)
    setLoading(false)
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: '12px' }}>
        <p className="name">{user.name}</p>
        <button className="ghost" onClick={onLogout}>Keluar</button>
      </div>
      <div className="row-between">
        <p className="label">Rekap hari ini</p>
        <button className="ghost" onClick={loadData}>Muat ulang</button>
      </div>
      {loading && <p className="muted">Memuat...</p>}
      {!loading && rows.length === 0 && <p className="muted">Belum ada anak magang terdaftar.</p>}
      {rows.map((r) => {
        const status = r.attendance?.check_out ? 'Selesai' : r.attendance?.check_in ? 'Sedang bekerja' : 'Belum absen'
        return (
          <div className="card" key={r.id}>
            <div className="row-between">
              <p className="name">{r.name}</p>
              <span className="muted small">{status}</span>
            </div>
            {r.attendance && (
              <p className="muted small">
                {r.attendance.check_in && `Check-in ${formatTime(r.attendance.check_in)}`}
                {r.attendance.check_out && `  ·  Check-out ${formatTime(r.attendance.check_out)}`}
              </p>
            )}
            {r.tasks.length > 0 ? (
              <div className="task-list">
                {r.tasks.map((t) => (
                  <div key={t.id} className="task-item">- {t.content}</div>
                ))}
              </div>
            ) : (
              <p className="muted small">Belum ada laporan tugas.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    const id = localStorage.getItem('userId')
    const name = localStorage.getItem('userName')
    const role = localStorage.getItem('userRole')
    return id ? { id, name, role } : null
  })

  function handleLogout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userRole')
    setUser(null)
  }

  return (
    <div className="app">
      {!user && <LoginScreen onLogin={setUser} />}
      {user?.role === 'intern' && <InternView user={user} onLogout={handleLogout} />}
      {user?.role === 'mentor' && <MentorView user={user} onLogout={handleLogout} />}
    </div>
  )
}
