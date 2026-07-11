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

function PesertaView({ user, onLogout }) {
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

function CreateUserForm({ onCreated }) {
  const [loginId, setLoginId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('peserta')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!loginId.trim() || !name.trim() || !pin.trim()) {
      setError('Semua kolom wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    const { error: err } = await supabase
      .from('users')
      .insert({ login_id: loginId.trim(), name: name.trim(), role, pin: pin.trim() })
    if (err) {
      setError(err.code === '23505' ? 'ID ini sudah dipakai, coba ID lain.' : 'Gagal membuat akun.')
      setLoading(false)
      return
    }
    setSuccess(`Akun ${name.trim()} berhasil dibuat.`)
    setLoginId('')
    setName('')
    setPin('')
    setLoading(false)
    onCreated()
  }

  return (
    <div className="card">
      <p className="label">Buat akun baru</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
      <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="ID login (contoh: magang03)" />
      <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
      <div className="btn-row" style={{ marginBottom: '10px' }}>
        <button className={role === 'peserta' ? 'primary' : ''} onClick={() => setRole('peserta')}>Peserta</button>
        <button className={role === 'pembimbing' ? 'primary' : ''} onClick={() => setRole('pembimbing')}>Pembimbing</button>
        <button className={role === 'admin' ? 'primary' : ''} onClick={() => setRole('admin')}>Admin</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="muted small">{success}</p>}
      <button className="primary full" onClick={handleCreate} disabled={loading}>
        {loading ? 'Membuat...' : 'Buat akun'}
      </button>
    </div>
  )
}

function CreateBatchForm({ onCreated }) {
  const [namaBatch, setNamaBatch] = useState('')
  const [mulai, setMulai] = useState('')
  const [selesai, setSelesai] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!namaBatch.trim()) {
      setError('Nama batch wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('batches').insert({
      nama_batch: namaBatch.trim(),
      tanggal_mulai: mulai || null,
      tanggal_selesai: selesai || null,
    })
    if (err) {
      setError('Gagal membuat batch.')
      setLoading(false)
      return
    }
    setNamaBatch('')
    setMulai('')
    setSelesai('')
    setLoading(false)
    onCreated()
  }

  return (
    <div className="card">
      <p className="label">Buat batch baru</p>
      <input value={namaBatch} onChange={(e) => setNamaBatch(e.target.value)} placeholder="Nama batch (contoh: Batch Juli 2026)" />
      <div className="btn-row" style={{ marginBottom: '10px' }}>
        <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} />
        <input type="date" value={selesai} onChange={(e) => setSelesai(e.target.value)} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button className="primary full" onClick={handleCreate} disabled={loading}>
        {loading ? 'Membuat...' : 'Buat batch'}
      </button>
    </div>
  )
}

function AssignForm({ batches, pesertaList, pembimbingList, onAssigned }) {
  const [batchId, setBatchId] = useState('')
  const [pesertaId, setPesertaId] = useState('')
  const [pembimbingId, setPembimbingId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    if (!batchId || !pesertaId || !pembimbingId) {
      setError('Pilih batch, peserta, dan pembimbing.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    const { error: err } = await supabase.from('peserta_pembimbing').insert({
      batch_id: batchId,
      peserta_id: pesertaId,
      pembimbing_id: pembimbingId,
    })
    if (err) {
      setError(err.code === '23505' ? 'Peserta ini sudah di-assign di batch tersebut.' : 'Gagal assign.')
      setLoading(false)
      return
    }
    setSuccess('Berhasil di-assign.')
    setLoading(false)
    onAssigned()
  }

  return (
    <div className="card">
      <p className="label">Assign peserta ke pembimbing</p>
      <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
        <option value="">Pilih batch</option>
        {batches.map((b) => <option key={b.id} value={b.id}>{b.nama_batch}</option>)}
      </select>
      <select value={pesertaId} onChange={(e) => setPesertaId(e.target.value)}>
        <option value="">Pilih peserta</option>
        {pesertaList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={pembimbingId} onChange={(e) => setPembimbingId(e.target.value)}>
        <option value="">Pilih pembimbing</option>
        {pembimbingList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="muted small">{success}</p>}
      <button className="primary full" onClick={handleAssign} disabled={loading}>
        {loading ? 'Menyimpan...' : 'Assign'}
      </button>
    </div>
  )
}

function AdminView({ user, onLogout }) {
  const [batches, setBatches] = useState([])
  const [pesertaList, setPesertaList] = useState([])
  const [pembimbingList, setPembimbingList] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: batchData } = await supabase.from('batches').select('*').order('created_at', { ascending: false })
    const { data: peserta } = await supabase.from('users').select('*').eq('role', 'peserta')
    const { data: pembimbing } = await supabase.from('users').select('*').eq('role', 'pembimbing')
    const { data: assignData } = await supabase.from('peserta_pembimbing').select('*')
    setBatches(batchData || [])
    setPesertaList(peserta || [])
    setPembimbingList(pembimbing || [])
    setAssignments(assignData || [])
    setLoading(false)
  }

  function nameOf(list, id) {
    return list.find((x) => x.id === id)?.name || '-'
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: '12px' }}>
        <p className="name">{user.name}</p>
        <button className="ghost" onClick={onLogout}>Keluar</button>
      </div>

      <CreateUserForm onCreated={loadData} />
      <CreateBatchForm onCreated={loadData} />
      <AssignForm
        batches={batches}
        pesertaList={pesertaList}
        pembimbingList={pembimbingList}
        onAssigned={loadData}
      />

      <div className="row-between">
        <p className="label">Daftar assignment</p>
        <button className="ghost" onClick={loadData}>Muat ulang</button>
      </div>
      {loading && <p className="muted">Memuat...</p>}
      {!loading && assignments.length === 0 && <p className="muted">Belum ada assignment.</p>}
      {assignments.map((a) => (
        <div className="card" key={a.id}>
          <p className="name">{nameOf(pesertaList, a.peserta_id)}</p>
          <p className="muted small">
            Dibimbing oleh {nameOf(pembimbingList, a.pembimbing_id)} · {batches.find((b) => b.id === a.batch_id)?.nama_batch || '-'}
          </p>
        </div>
      ))}
    </div>
  )
}

function PembimbingView({ user, onLogout }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    // ambil peserta yang di-assign ke pembimbing ini
    const { data: assignments } = await supabase
      .from('peserta_pembimbing')
      .select('*')
      .eq('pembimbing_id', user.id)
    const pesertaIds = (assignments || []).map((a) => a.peserta_id)

    let pesertaList = []
    if (pesertaIds.length > 0) {
      const { data } = await supabase.from('users').select('*').in('id', pesertaIds)
      pesertaList = data || []
    }

    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', todayDate())
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('created_at', todayDate())

    const combined = pesertaList.map((p) => ({
      ...p,
      attendance: (attendance || []).find((a) => a.user_id === p.id),
      tasks: (tasks || []).filter((t) => t.user_id === p.id),
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
      {!loading && rows.length === 0 && <p className="muted">Belum ada peserta yang di-assign ke kamu. Hubungi admin.</p>}
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
      {user?.role === 'peserta' && <PesertaView user={user} onLogout={handleLogout} />}
      {user?.role === 'pembimbing' && <PembimbingView user={user} onLogout={handleLogout} />}
      {user?.role === 'admin' && <AdminView user={user} onLogout={handleLogout} />}
    </div>
  )
}
