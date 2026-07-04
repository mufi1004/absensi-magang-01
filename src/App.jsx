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

function InternView() {
  const [name, setName] = useState(localStorage.getItem('internName') || '')
  const [internId, setInternId] = useState(localStorage.getItem('internId') || '')
  const [attendance, setAttendance] = useState(null)
  const [taskText, setTaskText] = useState('')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (internId) {
      loadAttendance()
      loadTasks()
    }
  }, [internId])

  async function handleLogin() {
    if (!name.trim()) return
    setLoading(true)
    const { data: existing } = await supabase
      .from('interns')
      .select('*')
      .eq('name', name.trim())
      .maybeSingle()

    let id = existing?.id
    if (!id) {
      const { data: created, error } = await supabase
        .from('interns')
        .insert({ name: name.trim() })
        .select()
        .single()
      if (error) {
        alert('Gagal masuk: ' + error.message)
        setLoading(false)
        return
      }
      id = created.id
    }
    localStorage.setItem('internName', name.trim())
    localStorage.setItem('internId', id)
    setInternId(id)
    setLoading(false)
  }

  async function loadAttendance() {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('intern_id', internId)
      .eq('date', todayDate())
      .maybeSingle()
    setAttendance(data || null)
  }

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('intern_id', internId)
      .gte('created_at', todayDate())
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function handleCheckIn() {
    setLoading(true)
    const { data, error } = await supabase
      .from('attendance')
      .insert({ intern_id: internId, check_in: new Date().toISOString() })
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
      .insert({ intern_id: internId, content: taskText.trim() })
    if (!error) {
      setTaskText('')
      loadTasks()
    }
    setLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem('internName')
    localStorage.removeItem('internId')
    setInternId('')
    setName('')
    setAttendance(null)
    setTasks([])
  }

  if (!internId) {
    return (
      <div className="card">
        <p className="label">Masukkan nama kamu</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama lengkap"
        />
        <button onClick={handleLogin} disabled={loading}>Masuk</button>
      </div>
    )
  }

  const status = attendance?.check_out ? 'Selesai' : attendance?.check_in ? 'Sedang bekerja' : 'Belum absen'

  return (
    <div>
      <div className="card">
        <div className="row-between">
          <div>
            <p className="name">{name}</p>
            <p className="muted">{status}</p>
          </div>
          <button className="ghost" onClick={handleLogout}>Keluar</button>
        </div>
        <div className="btn-row">
          <button onClick={handleCheckIn} disabled={loading || !!attendance}>Check-in</button>
          <button onClick={handleCheckOut} disabled={loading || !attendance || !!attendance?.check_out}>Check-out</button>
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
        <button onClick={handleSubmitTask} disabled={loading}>Kirim laporan</button>
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

function MentorView() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: interns } = await supabase.from('interns').select('*')
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
      attendance: (attendance || []).find((a) => a.intern_id === intern.id),
      tasks: (tasks || []).filter((t) => t.intern_id === intern.id),
    }))
    setRows(combined)
    setLoading(false)
  }

  return (
    <div>
      <div className="row-between">
        <p className="label">Rekap hari ini</p>
        <button className="ghost" onClick={loadData}>Muat ulang</button>
      </div>
      {loading && <p className="muted">Memuat...</p>}
      {!loading && rows.length === 0 && <p className="muted">Belum ada anak magang yang absen.</p>}
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
  const [view, setView] = useState('intern')

  return (
    <div className="app">
      <div className="switch-row">
        <button className={view === 'intern' ? 'active' : ''} onClick={() => setView('intern')}>Anak magang</button>
        <button className={view === 'mentor' ? 'active' : ''} onClick={() => setView('mentor')}>Mentor</button>
      </div>
      {view === 'intern' ? <InternView /> : <MentorView />}
    </div>
  )
}
