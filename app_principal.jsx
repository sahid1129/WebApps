import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Plus, Settings, ExternalLink, FileText, Trash2, LogOut, Filter, UserCheck, ShieldCheck, Lock, Unlock, Layout, History } from 'lucide-react';

// --- CONFIGURACIÓN DE NUBE (Vercel enviará estas llaves) ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const DB_PATH = 'kanban-proyect-bi-prod';

const STAGES = [
  { id: 'backlog', name: 'Backlog', icon: '📥', gradient: 'from-slate-50 to-slate-100', text: 'text-slate-500', border: 'border-slate-300' },
  { id: 'todo', name: 'Por hacer', icon: '📋', gradient: 'from-amber-50 to-orange-50', text: 'text-amber-600', border: 'border-amber-300' },
  { id: 'progress', name: 'En proceso', icon: '🚧', gradient: 'from-blue-50 to-indigo-50', text: 'text-blue-600', border: 'border-blue-300' },
  { id: 'review', name: 'En revisión', icon: '👀', gradient: 'from-purple-50 to-fuchsia-50', text: 'text-purple-600', border: 'border-purple-300' },
  { id: 'done', name: 'Finalizado', icon: '✅', gradient: 'from-emerald-50 to-teal-50', text: 'text-emerald-600', border: 'border-emerald-300' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState(localStorage.getItem('aura_username'));
  const [tasks, setTasks] = useState([]);
  const [roles, setRoles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({ link: 'https://drive.google.com/...', available: true });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [filterTag, setFilterTag] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // 1. Conexión a la Nube
  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  // 2. Sincronización en Tiempo Real (Masivo)
  useEffect(() => {
    if (!user) return;
    const unsubTasks = onSnapshot(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubConfig = onSnapshot(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'config', 'master'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
    const unsubLogs = onSnapshot(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'accessLogs'), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubTasks(); unsubConfig(); unsubLogs(); };
  }, [user]);

  // --- ACCIONES ---
  const toggleAccess = async () => {
    await setDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'config', 'master'), { ...config, available: !config.available }, { merge: true });
  };

  const openDriveWithInternalLog = async () => {
    const now = new Date();
    await addDoc(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'accessLogs'), {
      user: profileName, date: now.toLocaleDateString(), time: now.toLocaleTimeString(), timestamp: now.getTime()
    });
    window.open(config.link, '_blank');
  };

  const downloadAudit = () => {
    const content = "AUDITORÍA KANBAN PROYECT BI\n" + logs.sort((a,b) => b.timestamp - a.timestamp).map(l => `${l.date} ${l.time} - ${l.user}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Auditoria_BI.txt";
    a.click();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black">CARGANDO PROYECTO BI...</div>;
  if (!profileName) return <Login onLogin={(n) => { setProfileName(n); localStorage.setItem('aura_username', n); }} users={[...new Set(tasks.map(t => t.assignee))]} />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-800">🔹 Kanban <span className="text-[#F2C811] italic">Proyect BI</span></h1>
            <div className="flex items-center gap-3 mt-2">
               <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <UserCheck size={12}/> {profileName}
               </span>
               <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-slate-400 hover:text-red-500"><LogOut size={14}/></button>
            </div>
          </div>

          {/* Panel de Control de Archivo Maestro */}
          <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-slate-100 flex items-center gap-6">
             <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${config.available ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-black uppercase text-slate-400">Archivo {config.available ? 'Libre' : 'En Uso'}</span>
             </div>
             <div className="flex gap-2">
                <button onClick={toggleAccess} className={`p-2 rounded-xl border ${config.available ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                   {config.available ? <Lock size={16}/> : <Unlock size={16}/>}
                </button>
                <button onClick={openDriveWithInternalLog} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Abrir Drive</button>
                <button onClick={downloadAudit} className="bg-emerald-600 text-white p-2 rounded-xl"><FileText size={16}/></button>
             </div>
          </div>
        </div>
        
        <div className="mt-8 flex gap-4">
           <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-all">+ Nueva Tarea</button>
           <div className="bg-white p-1 rounded-2xl flex border border-slate-200 shadow-sm">
              <button onClick={() => setView('kanban')} className={`px-6 py-2 rounded-xl text-[10px] font-black ${view === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>TABLERO</button>
              <button onClick={() => setView('archive')} className={`px-6 py-2 rounded-xl text-[10px] font-black ${view === 'archive' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>HISTORIAL</button>
           </div>
        </div>
      </header>

      {view === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-10 custom-scrollbar">
          {STAGES.map(stage => (
            <div key={stage.id} 
                 className={`flex-shrink-0 w-80 bg-gradient-to-b ${stage.gradient} p-4 rounded-[2rem] border-2 ${stage.border}`}
                 onDragOver={e => e.preventDefault()}
                 onDrop={async () => {
                   const tid = window.draggedId;
                   await updateDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks', tid), { status: stage.id });
                 }}>
               <h3 className={`text-[11px] font-black uppercase tracking-widest ${stage.text} mb-4 flex justify-between`}>
                 {stage.icon} {stage.name} 
                 <span className="bg-white px-2 rounded-full shadow-sm">{tasks.filter(t => t.status === stage.id).length}</span>
               </h3>
               <div className="space-y-4">
                  {tasks.filter(t => t.status === stage.id).map(task => (
                    <div key={task.id} 
                         draggable 
                         onDragStart={() => window.draggedId = task.id}
                         onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                         className="bg-white p-5 rounded-[1.5rem] shadow-md border border-slate-100 cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-all">
                       <h4 className="font-bold text-slate-800 text-sm mb-3">{task.title}</h4>
                       <div className="flex justify-between items-center border-t pt-3">
                          <span className="text-[9px] font-black text-indigo-600 uppercase">👤 {task.assignee}</span>
                          <span className="text-[10px]">⚙️</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {tasks.filter(t => t.status === 'history').map(t => (
             <div key={t.id} className="bg-white p-6 rounded-3xl shadow-lg opacity-70">
                <h4 className="font-bold">{t.title}</h4>
                <p className="text-[10px] text-slate-400 mt-2">Finalizado por: {t.assignee}</p>
             </div>
           ))}
        </div>
      )}

      {isModalOpen && (
        <TaskModal 
          task={editingTask} 
          onClose={() => setIsModalOpen(false)} 
          onSave={async (data) => {
            const col = collection(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks');
            if (editingTask) await updateDoc(doc(col, editingTask.id), data);
            else await addDoc(col, { ...data, status: 'backlog', createdAt: Date.now() });
            setIsModalOpen(false);
          }}
          onArchive={async (id) => {
             await updateDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks', id), { status: 'history' });
             setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Login({ onLogin, users }) {
  const [n, setN] = useState("");
  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
         <h2 className="text-3xl font-black mb-6">KANBAN BI 📊</h2>
         {users.length > 0 && (
           <div className="flex flex-wrap gap-2 justify-center mb-8">
             {users.filter(u => u).map(u => <button key={u} onClick={() => onLogin(u)} className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all uppercase">👤 {u}</button>)}
           </div>
         )}
         <input type="text" value={n} onChange={e => setN(e.target.value)} placeholder="Nuevo Perfil..." className="w-full border-2 p-4 rounded-2xl mb-4 text-center font-bold outline-none focus:border-indigo-600"/>
         <button onClick={() => n && onLogin(n)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">INGRESAR</button>
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onSave, onArchive }) {
  const [d, setD] = useState(task || { title: '', assignee: '', link: '' });
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
       <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-200">
          <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Detalles de Actividad</h3>
          <div className="space-y-6">
             <input type="text" placeholder="Título..." value={d.title} onChange={e => setD({...d, title: e.target.value})} className="w-full border-2 p-4 rounded-2xl bg-slate-50 font-bold outline-none focus:bg-white"/>
             <input type="text" placeholder="Responsable..." value={d.assignee} onChange={e => setD({...d, assignee: e.target.value})} className="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"/>
             <input type="url" placeholder="Link de Drive..." value={d.link} onChange={e => setD({...d, link: e.target.value})} className="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"/>
          </div>
          <div className="flex justify-between mt-10">
             {task && <button onClick={() => onArchive(task.id)} className="text-slate-400 font-black text-xs uppercase">📦 Archivar</button>}
             <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 font-bold text-slate-400">CERRAR</button>
                <button onClick={() => onSave(d)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg">GUARDAR</button>
             </div>
          </div>
       </div>
    </div>
  );
}
