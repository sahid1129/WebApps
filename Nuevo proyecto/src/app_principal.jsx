import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Plus, Settings, ExternalLink, FileText, Trash2, LogOut, Filter, UserCheck, ShieldCheck, Lock, Unlock, Layout, History, X, Send } from 'lucide-react';

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
  { id: 'backlog', name: 'Backlog', icon: '📥', gradient: 'from-slate-50 to-slate-100', border: 'border-slate-300', bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderStyle: 'border-2 dashed #cbd5e1' },
  { id: 'todo', name: 'Por hacer', icon: '📋', gradient: 'from-amber-50 to-orange-50', border: 'border-amber-300', bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderStyle: 'border-2 dashed #f59e0b' },
  { id: 'progress', name: 'En proceso', icon: '🚧', gradient: 'from-blue-50 to-indigo-50', border: 'border-blue-300', bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderStyle: 'border-2 dashed #3b82f6' },
  { id: 'review', name: 'En revisión', icon: '👀', gradient: 'from-purple-50 to-fuchsia-50', border: 'border-purple-300', bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderStyle: 'border-2 dashed #8b5cf6' },
  { id: 'done', name: 'Finalizado', icon: '✅', gradient: 'from-emerald-50 to-teal-50', border: 'border-emerald-300', bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderStyle: 'border-2 dashed #10b981' },
  { id: 'archived', name: 'Archivado', icon: '📦', gradient: 'from-slate-100 to-gray-100', border: 'border-slate-400', bgGradient: 'linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%)', borderStyle: 'border-2 dashed #a1a1aa' }
];

const DEFAULT_ROLES = [
  { id: 'etl', name: 'Arquitecto ETL', color: '#f97316', emoji: '🟠' },
  { id: 'model', name: 'Modelador', color: '#3b82f6', emoji: '🔵' },
  { id: 'dax', name: 'DAX Expert', color: '#a855f7', emoji: '🟣' },
  { id: 'ux', name: 'Diseñador UX', color: '#ec4899', emoji: '🔴' },
  { id: 'visual', name: 'Analista Visual', color: '#10b981', emoji: '🟢' }
];

const DEFAULT_TASKS = [
  { id: 1, title: '📂 Configurar Fuentes ERP', role: 'etl', labels: ['#Urgente'], status: 'backlog', assignee: 'Equipo Aura', dateStart: '2025-05-12', dateEnd: '2025-05-12', link: '', comments: [] }
];

const DEFAULT_CONFIG = {
  projectFile: { available: true, link: 'https://drive.google.com/drive/folders/1nlwk3jpDV25YhfdxJQxuWOHAcoR8Tnyg?usp=sharing' },
  accessLogs: []
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState(localStorage.getItem('aura_username'));
  const [tasks, setTasks] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('kanban');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleEmoji, setNewRoleEmoji] = useState('⚙️');
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => { setUser(u); });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const unsubTasks = onSnapshot(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks'), (snap) => {
      const taskList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(taskList.length > 0 ? taskList : DEFAULT_TASKS);
    });
    
    const unsubRoles = onSnapshot(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'roles'), (snap) => {
      const roleList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRoles(roleList.length > 0 ? roleList : DEFAULT_ROLES);
    });
    
    const unsubConfig = onSnapshot(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'config', 'master'), async (snap) => {
      if (snap.exists()) {
        setConfig(snap.data());
      } else {
        await setDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'config', 'master'), DEFAULT_CONFIG, { merge: true });
        setConfig(DEFAULT_CONFIG);
      }
      setLoading(false);
    });
    
    const unsubLogs = onSnapshot(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'accessLogs'), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubTasks(); unsubRoles(); unsubConfig(); unsubLogs(); };
  }, [user]);

  const allLabels = [...new Set(tasks.flatMap(t => t.labels || []))];
  const allAssignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))];

  const toggleFileStatus = async () => {
    await setDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'config', 'master'), 
      { projectFile: { ...config.projectFile, available: !config.projectFile.available } }, { merge: true });
  };

  const openDriveWithLog = async () => {
    if (!profileName) return;
    const now = new Date();
    await addDoc(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'accessLogs'), {
      user: profileName, date: now.toLocaleDateString(), time: now.toLocaleTimeString(), timestamp: now.getTime()
    });
    window.open(config.projectFile.link, '_blank');
  };

  const downloadAudit = () => {
    if (logs.length === 0) {
      showAlert("No hay registros de auditoría almacenados.");
      return;
    }
    let content = "RELACIÓN HISTÓRICA DE ACCESOS - Kanban Proyect BI\n";
    content += `Generado el: ${new Date().toLocaleString()}\n`;
    content += "========================================================\n\n";
    logs.sort((a,b) => b.timestamp - a.timestamp).forEach((log, i) => {
      content += `[${i + 1}] RESPONSABLE: ${log.user}\n`;
      content += `    FECHA: ${log.date} | HORA: ${log.time}\n`;
      content += `    ACCIÓN: Acceso a Carpeta Maestra de Proyecto (Drive)\n`;
      content += "--------------------------------------------------------\n";
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Auditoria_Accesos_Kanban_ProyectBI.txt";
    a.click();
  };

  const showAlert = (msg) => { setAlertMessage(msg); setIsAlertOpen(true); };
  const closeAlert = () => setIsAlertOpen(false);

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = window.draggedTaskId;
    if (!taskId) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (newStatus === 'done' && (task.role === 'dax' || task.title.toLowerCase().includes('dax'))) {
        const pendingModel = tasks.filter(t => (t.role === 'model' || t.title.toLowerCase().includes('relación')) && t.status !== 'done' && t.status !== 'archived');
        if (pendingModel.length > 0) {
          showAlert(`Bloqueo: Debes finalizar el Modelado y las Relaciones antes de validar el DAX (${pendingModel.length} pendientes).`);
          return;
        }
      }
      await updateDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks', taskId), { status: newStatus });
    }
  };

  const saveTask = async (data) => {
    const taskData = {
      ...data,
      labels: data.labels ? data.labels.split(',').map(l => { let tag = l.trim(); return tag.startsWith('#') ? tag : '#' + tag; }).filter(l => l !== '#') : []
    };
    
    if (editingTask) {
      await updateDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks', editingTask.id), taskData);
    } else {
      await addDoc(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks'), {
        ...taskData, status: 'backlog', createdAt: Date.now(), comments: []
      });
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const deleteTask = async () => {
    if (editingTask) {
      await deleteDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks', editingTask.id));
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const archiveTask = async () => {
    if (editingTask) {
      await updateDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks', editingTask.id), { status: 'archived' });
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const addComment = async () => {
    if (!editingTask || !commentText.trim() || !profileName) return;
    const comments = editingTask.comments || [];
    comments.push({ user: profileName, text: commentText.trim() });
    await updateDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'tasks', editingTask.id), { comments });
    setCommentText('');
  };

  const addNewRole = async () => {
    if (!newRoleName.trim()) return;
    await addDoc(collection(db, 'artifacts', DB_PATH, 'public', 'data', 'roles'), {
      id: 'role_' + Date.now(), name: newRoleName, color: newRoleColor, emoji: newRoleEmoji
    });
    setNewRoleName('');
  };

  const deleteRole = async (id) => {
    await deleteDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'roles', id));
  };

  const saveFileLink = async () => {
    const newLink = document.getElementById('edit-file-link').value;
    await setDoc(doc(db, 'artifacts', DB_PATH, 'public', 'data', 'config', 'master'), 
      { projectFile: { ...config.projectFile, link: newLink } }, { merge: true });
    setIsFileModalOpen(false);
  };

  const login = (nameFromList = null) => {
    const name = nameFromList || document.getElementById('new-user-name').value.trim();
    if (!name) return;
    setProfileName(name);
    localStorage.setItem('aura_username', name);
  };

  const logout = () => {
    localStorage.removeItem('aura_username');
    setProfileName(null);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 transform -rotate-12 mb-4 mx-auto">
          <span className="text-4xl">📊</span>
        </div>
        <p className="text-xl font-black tracking-tighter uppercase">Kanban Proyect BI</p>
        <p className="text-slate-400 text-sm mt-2">Cargando...</p>
      </div>
    </div>
  );

  if (!profileName) return (
    <div id="auth-overlay" className="fixed inset-0 flex items-center justify-center p-4 z-[100] bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 transform -rotate-12">
            <span className="text-4xl">📊</span>
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter uppercase">Kanban Proyect BI</h2>
        <p className="text-slate-400 mb-8 font-medium">Gestión de Flujo de Datos & Control</p>
        
        <div id="auth-existing-list" className="grid grid-cols-2 gap-3 mb-8">
          {allAssignees.filter(u => u).map(a => (
            <button key={a} onClick={() => login(a)} className="bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 p-3 rounded-2xl text-[10px] font-black text-slate-500 truncate uppercase shadow-sm transition-all">
              {a}
            </button>
          ))}
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-4 text-slate-400 font-black">Nuevo Perfil</span></div>
        </div>

        <div className="space-y-4">
          <input type="text" id="new-user-name" placeholder="Ingresa tu nombre..." className="w-full border-2 border-slate-100 rounded-2xl p-4 text-center text-lg font-bold focus:border-indigo-500 outline-none shadow-inner" />
          <button onClick={() => login()} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">
            Entrar al Sistema
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-6">
      <header className="mb-10 max-w-[1600px] mx-auto">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">🔹 Kanban <span className="text-[#F2C811] italic">Proyect BI</span></h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-indigo-700 font-black text-xs bg-indigo-100 px-4 py-1.5 rounded-full border border-indigo-200 uppercase tracking-widest italic shadow-sm">
                👤 RESPONSABLE: {profileName.toUpperCase()}
              </span>
              <button onClick={logout} className="bg-slate-800 text-white px-4 py-1.5 rounded-full text-[10px] font-black hover:bg-black transition-all shadow-md">
                <LogOut size={12} />
              </button>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 flex flex-col sm:flex-row items-center gap-6 w-full xl:w-auto">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${config.projectFile.available ? 'bg-emerald-500 animate-pulse border-4 border-emerald-50' : 'bg-red-500 border-4 border-red-50'}`}></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Archivo Maestro</p>
                <p className={`text-xs font-black uppercase ${config.projectFile.available ? 'text-emerald-600' : 'text-red-600'}`}>
                  {config.projectFile.available ? 'Disponible ✅' : 'En Uso ⛔'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-l-2 pl-6 border-slate-50">
              <button onClick={openDriveWithLog} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 group">
                <ExternalLink size={14} />
                <span className="text-[10px] font-black uppercase">Abrir Drive</span>
              </button>
              <button onClick={downloadAudit} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100">
                <FileText size={14} />
                <span className="text-[10px] font-black uppercase">Auditoría</span>
              </button>
              <button onClick={() => setIsFileModalOpen(true)} className="bg-slate-100 text-slate-500 p-2.5 rounded-xl hover:bg-slate-200 transition-all">
                <Settings size={16} />
              </button>
              <button onClick={toggleFileStatus} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[9px] font-black hover:bg-black transition-all uppercase tracking-widest">
                Estado
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 hover:scale-105">
            <Plus size={18} /> Nueva Tarea
          </button>
          <button onClick={() => setIsRoleModalOpen(true)} className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-3.5 rounded-2xl font-black shadow-xl border border-slate-200 transition-all flex items-center justify-center gap-2">
            <Settings size={18} /> Roles
          </button>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xl">
            <button onClick={() => setCurrentView('kanban')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${currentView === 'kanban' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'} uppercase`}>
              Tablero
            </button>
            <button onClick={() => setCurrentView('archive')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${currentView === 'archive' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'} uppercase`}>
              Historial 📦
            </button>
          </div>
          
          <div className="bg-white flex-1 p-3 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 overflow-x-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">🔍 Filtros:</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentFilter('all')} className={`px-5 py-2 rounded-2xl text-[9px] font-black transition-all ${currentFilter === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'} uppercase`}>
                Todo
              </button>
              {allLabels.sort().map(l => (
                <button key={l} onClick={() => setCurrentFilter(l)} className={`px-5 py-2 rounded-2xl text-[9px] font-black transition-all ${currentFilter === l ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'} uppercase`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {currentView === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-8 max-w-[1600px] mx-auto">
          {STAGES.map(stage => (
            <div key={stage.id}
                 className="flex-shrink-0 w-80 rounded-[1.25rem] p-4 min-h-[70vh] transition-all"
                 style={{ background: stage.bgGradient, borderStyle: stage.borderStyle.split('border-2')[1] ? 'dashed' : 'solid', borderWidth: '2px' }}
                 onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.filter = 'brightness(0.9) saturate(1.2)'; }}
                 onDragLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
                 onDrop={(e) => { e.currentTarget.style.filter = 'brightness(1)'; handleDrop(e, stage.id); }}>
              <h3 className={`text-[11px] font-black uppercase tracking-widest mb-4 px-2 flex justify-between items-center ${
                stage.id === 'backlog' ? 'text-slate-500' :
                stage.id === 'todo' ? 'text-amber-600' :
                stage.id === 'progress' ? 'text-blue-600' :
                stage.id === 'review' ? 'text-purple-600' :
                stage.id === 'done' ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                <span>{stage.icon} {stage.name}</span>
                <span className="bg-white px-2 rounded-full">{tasks.filter(t => t.status === stage.id && (currentFilter === 'all' || (t.labels && t.labels.includes(currentFilter)))).length}</span>
              </h3>
              <div className="space-y-4">
                {tasks.filter(t => t.status === stage.id && (currentFilter === 'all' || (t.labels && t.labels.includes(currentFilter)))).map(task => {
                  const role = roles.find(r => r.id === task.role) || {color: '#ccc', emoji: '❓', name: 'Sin Rol'};
                  return (
                    <div key={task.id}
                         draggable
                         onDragStart={() => window.draggedTaskId = task.id}
                         onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                         className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 relative overflow-hidden cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-all">
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: role.color, borderRadius: '10px 10px 0 0' }}></div>
                      <div className="mb-3">
                        {(task.labels || []).map(l => (
                          <span key={l} className="text-[7px] font-black text-slate-400 mr-1 opacity-80 border border-slate-100 px-2 py-0.5 rounded-md uppercase inline-block">{l}</span>
                        ))}
                      </div>
                      <h4 className="font-black text-slate-800 text-[13px] mb-3 leading-tight">{task.title}</h4>
                      {task.link && (
                        <button onClick={(e) => { e.stopPropagation(); window.open(task.link, '_blank'); }} className="w-full mb-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-100 border border-indigo-100 transition-colors">
                          🔗 Abrir Link
                        </button>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <span className="text-[9px] font-black text-indigo-600 uppercase">👤 {task.assignee?.split(' ')[0]}</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase">{role.emoji}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl">
            <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tighter">📦 Historial Maestro</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tasks.filter(t => t.status === 'archived').length === 0 ? (
                <p className="col-span-full text-slate-300 text-xs italic py-20 text-center uppercase tracking-widest font-black">El historial maestro está vacío</p>
              ) : (
                tasks.filter(t => t.status === 'archived').map(t => (
                  <div key={t.id} onClick={() => { setEditingTask(t); setIsModalOpen(true); }} className="bg-white p-6 rounded-3xl border border-slate-100 opacity-70 hover:opacity-100 cursor-pointer shadow-xl transition-all">
                    <h4 className="font-black text-slate-800 text-sm mb-3 tracking-tighter">{t.title}</h4>
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>👤 {t.assignee}</span><span>📅 {t.dateEnd || 'S/F'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[85vh] animate-in zoom-in duration-300">
            <div className="p-8 border-r border-slate-100 flex-1 overflow-y-auto">
              <h3 className="text-2xl font-black text-slate-800 mb-8 tracking-tighter uppercase">Gestión de Requerimiento</h3>
              <form onSubmit={(e) => { e.preventDefault(); saveTask({ title: e.target['task-title'].value, role: e.target['task-role'].value, assignee: e.target['task-assignee'].value, dateStart: e.target['task-date-start'].value, dateEnd: e.target['task-date-end'].value, labels: e.target['task-labels'].value, link: e.target['task-link'].value }); }} className="space-y-5">
                <input type="hidden" name="edit-id" defaultValue={editingTask?.id} />
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Actividad 📝</label>
                  <input type="text" name="task-title" defaultValue={editingTask?.title} required className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Responsable 👤</label>
                    <input type="text" name="task-assignee" defaultValue={editingTask?.assignee} list="assignee-suggestions" className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-bold outline-none bg-slate-50" />
                    <datalist id="assignee-suggestions">
                      {allAssignees.map(a => <option key={a} value={a} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Especialidad 🛠️</label>
                    <select name="task-role" defaultValue={editingTask?.role} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-bold outline-none bg-slate-50">
                      {roles.map(r => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Inicio 📅</label>
                    <input type="date" name="task-date-start" defaultValue={editingTask?.dateStart} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm outline-none bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Fin 📅</label>
                    <input type="date" name="task-date-end" defaultValue={editingTask?.dateEnd} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm outline-none bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Etiquetas ✨</label>
                  <input type="text" name="task-labels" defaultValue={editingTask?.labels?.join(', ')} placeholder="#Dax, #Dashboard" list="label-suggestions" className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm outline-none bg-slate-50" />
                  <datalist id="label-suggestions">
                    {allLabels.map(l => <option key={l} value={l} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Link Drive 🔗</label>
                  <input type="url" name="task-link" defaultValue={editingTask?.link} placeholder="https://..." className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm outline-none bg-slate-50" />
                </div>
                <div className="flex justify-between items-center gap-4 mt-8 pt-6 border-t border-slate-100">
                  {editingTask && (
                    <button type="button" onClick={deleteTask} className="px-5 py-2 text-xs font-black text-red-400 hover:text-red-600 uppercase">Eliminar</button>
                  )}
                  <div className="flex gap-3 ml-auto">
                    {editingTask && (
                      <button type="button" onClick={archiveTask} className="px-5 py-2 text-xs font-black text-slate-400 hover:text-slate-800 uppercase">📦 Historial</button>
                    )}
                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-600 uppercase">Cerrar</button>
                    <button type="submit" className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg hover:bg-indigo-700 uppercase">Guardar</button>
                  </div>
                </div>
              </form>
            </div>
            <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col border-l border-slate-100">
              <h4 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest">Notas del equipo 💬</h4>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 text-xs">
                {(editingTask?.comments || []).length === 0 ? (
                  <p className="text-slate-300 italic text-center py-4 text-[8px] uppercase">Sin comentarios</p>
                ) : (
                  (editingTask?.comments || []).map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="font-black text-indigo-600 text-[9px] uppercase mb-1">{c.user}</p>
                      <p className="text-slate-600 text-[10px] leading-tight">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-3">
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Añadir nota..." className="w-full border-2 border-slate-200 rounded-2xl p-4 text-xs outline-none h-24 resize-none bg-white focus:border-indigo-500"></textarea>
                <button onClick={addComment} className="w-full bg-slate-800 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">Enviar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 border border-slate-200 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tighter">Roles del Equipo ⚙️</h3>
            <div className="space-y-2 mb-8 max-h-52 overflow-y-auto pr-2">
              {roles.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }}></div>
                    <span className="text-[10px] font-black text-slate-700 uppercase">{r.emoji} {r.name}</span>
                  </div>
                  <button onClick={() => deleteRole(r.id)} className="text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Nombre" className="flex-1 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none shadow-inner" />
                <input type="text" value={newRoleEmoji} onChange={(e) => setNewRoleEmoji(e.target.value)} placeholder="🚀" className="w-16 border-2 border-slate-100 rounded-xl p-3 text-center outline-none shadow-inner" />
              </div>
              <div className="flex gap-2 items-center">
                <input type="color" value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)} className="w-12 h-12 border-none cursor-pointer rounded-xl bg-transparent" />
                <button onClick={addNewRole} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[9px] font-black uppercase shadow-lg">Registrar Rol</button>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => setIsRoleModalOpen(false)} className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl text-[9px] font-black uppercase">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {isFileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10">
            <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tighter">Ubicación del Proyecto</h3>
            <input type="url" id="edit-file-link" defaultValue={config.projectFile.link} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 shadow-inner mb-8" />
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsFileModalOpen(false)} className="px-6 py-2 text-xs font-black text-slate-400 uppercase">Cancelar</button>
              <button onClick={saveFileLink} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {isAlertOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-sm text-center border-t-[10px] border-red-500">
            <div className="text-5xl mb-4">🚫</div>
            <h4 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter">Acción Bloqueada</h4>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">{alertMessage}</p>
            <button onClick={closeAlert} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg uppercase tracking-widest">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}