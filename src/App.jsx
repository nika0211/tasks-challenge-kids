import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Trophy,
  ShieldCheck,
  Star,
  Layout,
  Lock,
  Copy,
  Check,
  ArrowRight,
  Settings,
  RefreshCw,
  Sparkles,
  X,
  Crown,
  Minus
} from 'lucide-react';

// --- Firebase Realtime Database (REST + SSE) ---
const RTDB = 'https://tasks-challenge-kids-default-rtdb.firebaseio.com';

const fbGet   = ()           => fetch(`${RTDB}/.json`).then(r => r.json());
const fbPut   = (path, val)  => fetch(`${RTDB}/${path}.json`, { method: 'PUT',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(val) });
const fbPost  = (path, val)  => fetch(`${RTDB}/${path}.json`, { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(val) }).then(r => r.json());
const fbPatch = (path, val)  => fetch(`${RTDB}/${path}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(val) });

const applyRTDB = (data, setLogs, setChildrenData, setUserPins) => {
  setLogs(Object.entries(data?.activityLog || {}).map(([id, v]) => ({ id, ...v })));
  setChildrenData(data?.childrenScores || {});
  setUserPins(Object.fromEntries(
    Object.entries(data?.userPins || {}).map(([k, v]) => [k, typeof v === 'object' ? v?.pin : v])
  ));
};

// --- Gemini API Helper ---
const GEMINI_KEY = '';
const callGemini = async (prompt, system = '') => {
  if (!GEMINI_KEY) return 'שאבי מנמנם... המפתח ל-Gemini חסר!';
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: system }] } }) }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'שאבי מגרד באוזן כרגע... נסה שוב!';
  } catch { return 'נביחה! משהו השתבש בחיבור ל-Gemini.'; }
};

// --- CHILDREN ---
const CHILDREN = [
  { id: 'S11', name: 'שקד',  color: 'bg-blue-600',    defaultPin: '1111', token: 'sh-392' },
  { id: 'T12', name: 'טוהר', color: 'bg-indigo-600',  defaultPin: '2222', token: 'th-841' },
  { id: 'E14', name: 'אפרת', color: 'bg-rose-600',    defaultPin: '3333', token: 'ef-129' },
  { id: 'E16', name: 'איתן', color: 'bg-emerald-600', defaultPin: '4444', token: 'et-753' },
];

// --- TASKS ---
const TASK_TEMPLATES = [
  { id: 't16', name: 'כיבוי מסכים בשעה 22:00',   points: 5, icon: '📱', category: 'משמעת' },
  { id: 't17', name: 'לקום בזמן לבית הספר',       points: 3, icon: '⏰', category: 'משמעת' },
  { id: 't18', name: 'ניקיון שירותים',             points: 4, icon: '🚽', category: 'בית'   },
  { id: 't14', name: 'שטיפת רכב חיצוני',          points: 3, icon: '🚗', category: 'בית'   },
  { id: 't6',  name: 'להוציא את שאבי (פודל חום)', points: 2, icon: '🐩', category: 'יומי'  },
  { id: 't15', name: 'סידור הבית',                points: 2, icon: '🏠', category: 'בית'   },
  { id: 't13', name: 'ללכת למכולת',               points: 2, icon: '🛒', category: 'עזרה'  },
  { id: 't4',  name: 'קיפול כביסה (כולל הורדה)',  points: 2, icon: '🧺', category: 'בית'   },
  { id: 't12', name: 'פינוי מדיח',                points: 2, icon: '🧼', category: 'בית'   },
  { id: 't2',  name: 'סידור החדר',                points: 2, icon: '🧹', category: 'בית'   },
  { id: 't8',  name: 'סידור מיטה',                points: 1, icon: '🛏️', category: 'יומי'  },
  { id: 't9',  name: 'עזרה בהכנת ארוחה',         points: 3, icon: '🍳', category: 'עזרה'  },
  { id: 't5',  name: 'זריקת זבל',                 points: 1, icon: '🗑️', category: 'יומי'  },
  { id: 't19', name: 'להחזיר עגלת סופר למטה',                 points: 1, icon: '🛒', category: 'עזרה'   },
  { id: 't20', name: 'הכנת אוכל לבית הספר',                   points: 2, icon: '🥪', category: 'יומי'   },
  { id: 't21', name: 'נסיעה באוטובוס לבית הספר והגעה בזמן',   points: 2, icon: '🚌', category: 'משמעת'  },
  { id: 't22', name: 'נסיעה באוטובוס לבית הספר',           points: 2, icon: '🚌', category: 'משמעת' },
  { id: 't23', name: 'הכנת אוכל ושתייה לבית הספר',          points: 2, icon: '🥪', category: 'יומי'  },
  { id: 't24', name: 'הגדלת ראש',                            points: 1, icon: '💡', category: 'משמעת' },
  { id: 't25', name: 'לא לצאת מהחדר החל משעה 23:00',         points: 5, icon: '🌙', category: 'משמעת', golden: true },
  { id: 't26', name: 'לשחק עם שאבי (מינימום 10 דקות)',       points: 1, icon: '🐩', category: 'יומי'  },
  { id: 't27', name: 'ניקוי אבק חלונות של החדר',             points: 2, icon: '🪟', category: 'בית'   },
  { id: 't28', name: 'תליית כביסה',                          points: 2, icon: '👕', category: 'בית'   },
];

// --- SOUNDS ---
const playSound = async (type) => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === 'suspended') await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'report') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'approve') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.1);
      osc.frequency.setValueAtTime(783, now + 0.2);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now); osc.stop(now + 0.35);
    }
  } catch { /* ignore */ }
};

// --- UI HELPERS ---
const MobileBackground = () => (
  <div className="fixed inset-0 -z-10 bg-slate-50 overflow-hidden">
    <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
    <div className="absolute top-1/2 -right-24 w-80 h-80 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-24 left-1/2 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
  </div>
);

const ConfettiEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
    {[...Array(20)].map((_, i) => (
      <div key={i} className="confetti-piece" style={{
        left: `${Math.random() * 100}%`,
        backgroundColor: ['#3b82f6','#ec4899','#10b981','#f59e0b','#8b5cf6'][i % 5],
        animationDelay: `${(i * 0.1).toFixed(1)}s`,
        transform: `rotate(${i * 18}deg)`,
      }} />
    ))}
  </div>
);

// ===== MAIN APP =====
export default function App() {
  const [view,           setView]           = useState('login');
  const [activeChild,    setActiveChild]    = useState(null);
  const [logs,           setLogs]           = useState([]);
  const [childrenData,   setChildrenData]   = useState({});
  const [userPins,       setUserPins]       = useState({});
  const [loading,        setLoading]        = useState(true);
  const [pinEntry,       setPinEntry]       = useState('');
  const [pinError,       setPinError]       = useState(false);
  const [selectingChild, setSelectingChild] = useState(null);
  const [copyFeedback,   setCopyFeedback]   = useState(null);
  const [showPinChange,  setShowPinChange]  = useState(false);
  const [newPin,         setNewPin]         = useState('');
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [aiModal,        setAiModal]        = useState(null);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [deductInputs,   setDeductInputs]   = useState({});

  // ── Real-time sync via Firebase RTDB SSE ──
  useEffect(() => {
    const refresh = () => fbGet().then(d => { applyRTDB(d || {}, setLogs, setChildrenData, setUserPins); setLoading(false); }).catch(() => setLoading(false));

    const es = new EventSource(`${RTDB}/.json`);
    es.addEventListener('put', (e) => {
      try {
        const { path, data } = JSON.parse(e.data);
        if (path === '/') {
          applyRTDB(data || {}, setLogs, setChildrenData, setUserPins);
        } else {
          refresh();
        }
        setLoading(false);
      } catch { setLoading(false); }
    });
    es.addEventListener('patch', refresh);
    es.onerror = () => setLoading(false);
    return () => es.close();
  }, []);

  // ── URL token auto-login ──
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      const child = CHILDREN.find(c => c.token === token);
      if (child) { setActiveChild(child); setView('child'); }
    }
  }, []);

  // ── PIN validation ──
  useEffect(() => {
    if (pinEntry.length !== 4 || !selectingChild) return;
    const isParent  = selectingChild.id === 'parent';
    const targetPin = isParent ? '0211' : (userPins[selectingChild.id] || selectingChild.defaultPin);
    if (pinEntry === targetPin) {
      if (isParent) setView('parent');
      else { setActiveChild(selectingChild); setView('child'); }
      setPinEntry(''); setSelectingChild(null); setPinError(false);
    } else {
      setPinError(true);
      setTimeout(() => setPinEntry(''), 500);
    }
  }, [pinEntry, selectingChild, userPins]);

  // ── Actions ──
  const reportTask = async (task) => {
    if (!activeChild) return;
    playSound('report');
    try {
      await fbPost('activityLog', {
        childId: activeChild.id, childName: activeChild.name,
        taskId: task.id, taskName: task.name,
        points: task.points, status: 'Pending', timestamp: Date.now(),
      });
    } catch (err) { console.error('reportTask', err); }
  };

  const approveTask = async (log) => {
    playSound('approve');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    try {
      await fbPatch(`activityLog/${log.id}`, { status: 'Approved' });
      const currentPts = childrenData[log.childId]?.points || 0;
      await fbPut(`childrenScores/${log.childId}`, { name: log.childName, points: currentPts + (log.points || 1) });
    } catch (err) { console.error('approveTask', err); }
  };

  const updatePin = async (childId, pin) => {
    if (pin.length !== 4) return;
    try {
      await fbPut(`userPins/${childId}`, { pin });
      setShowPinChange(false);
      setNewPin('');
    } catch (err) { console.error('updatePin', err); }
  };

  const deductPoints = async (child) => {
    const amt = parseInt(deductInputs[child.id] || '0', 10);
    if (!amt || amt <= 0) return;
    const currentPts = childrenData[child.id]?.points || 0;
    const newPts = Math.max(0, currentPts - amt);
    try {
      const res = await fbPut(`childrenScores/${child.id}`, { name: child.name, points: newPts });
      if (!res.ok) throw new Error(`Firebase error: ${res.status}`);
      setChildrenData(prev => ({
        ...prev,
        [child.id]: { name: child.name, points: newPts },
      }));
      setDeductInputs(prev => ({ ...prev, [child.id]: '' }));
    } catch (err) { console.error('deductPoints', err); }
  };

  const getShabiTip = async (taskName) => {
    setAiLoading(true);
    setAiModal({ title: 'שאבי חושב על טיול...', text: '' });
    const tip = await callGemini(
      `תן טיפ קצר, מצחיק ומעודד לילד שצריך לבצע את המשימה: "${taskName}". דבר בשם שאבי, כלב פודל טוי חום קטן וחכם. השתמש במילים כמו "הב הב" ו"עצם".`,
      'אתה שאבי הפודל החום, עוזר הבית האנרגטי.'
    );
    setAiModal({ title: `טיפ משאבי ל${taskName}`, text: tip });
    setAiLoading(false);
  };

  const getRewardIdea = async (childName, pts) => {
    setAiLoading(true);
    setAiModal({ title: 'מחפש פרס מתאים...', text: '' });
    const idea = await callGemini(
      `הילד שלי ${childName} צבר ${pts} נקודות. תן לי רעיון אחד יצירתי וקטן לפרס שמתאים לכמות הזו.`,
      'אתה יועץ הורים חכם ומקורי.'
    );
    setAiModal({ title: `פרס ל${childName}`, text: idea });
    setAiLoading(false);
  };

  const copyMagicLink = (token) => {
    const url = `${window.location.origin}${window.location.pathname}?token=${token}`;
    (navigator.clipboard?.writeText(url) ?? Promise.reject()).catch(() => {
      const el = document.createElement('textarea');
      el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    });
    setCopyFeedback(token);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const leader = useMemo(() => {
    const sorted = Object.entries(childrenData).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.points - a.points);
    return sorted[0]?.id;
  }, [childrenData]);

  // ── Loading screen ──
  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50 font-sans" dir="rtl">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-600 font-bold">מכין את האתגרים...</p>
    </div>
  );

  return (
    <div className="min-h-screen relative font-sans select-none overflow-x-hidden" dir="rtl">
      <MobileBackground />
      {showConfetti && <ConfettiEffect />}

      {/* AI Modal */}
      {aiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm relative">
            <button onClick={() => setAiModal(null)} className="absolute left-6 top-6 text-slate-300 hover:text-slate-600"><X size={24}/></button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Sparkles size={24}/></div>
              <h3 className="text-xl font-black text-slate-800">{aiModal.title}</h3>
            </div>
            {aiLoading ? (
              <div className="flex flex-col items-center py-10">
                <RefreshCw className="animate-spin text-orange-500 mb-4" size={40} />
                <p className="font-bold text-slate-400 italic">שאבי מקשקש בזנב...</p>
              </div>
            ) : (
              <p className="text-slate-700 leading-relaxed italic bg-slate-50 p-5 rounded-2xl border border-slate-100">"{aiModal.text}"</p>
            )}
            {!aiLoading && <button onClick={() => setAiModal(null)} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">סגור</button>}
          </div>
        </div>
      )}

      {/* ===== LOGIN ===== */}
      {(view === 'login' || selectingChild) && (
        <div className="flex flex-col items-center p-5 pt-12">
          <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl p-8 border border-white/50">
            {!selectingChild ? (
              <>
                <div className="flex justify-center mb-6">
                  <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-xl rotate-3 flex items-center justify-center">
                    <Trophy size={40} />
                  </div>
                </div>
                <h1 className="text-4xl font-black text-center mb-2 text-slate-900">אתגר המשימות</h1>
                <p className="text-center text-slate-500 font-bold mb-10 border-b border-slate-100 pb-4">מי נכנס עכשיו?</p>
                <div className="grid gap-3">
                  {CHILDREN.map(child => (
                    <button key={child.id} onClick={() => { setSelectingChild(child); setPinError(false); setPinEntry(''); }}
                      className="flex items-center justify-between p-5 rounded-2xl bg-white border-2 border-slate-50 hover:border-blue-300 transition-all active:scale-95 shadow-sm group">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full ${child.color} flex items-center justify-center text-white font-black text-2xl shadow-md`}>{child.name[0]}</div>
                        <span className="text-xl font-black text-slate-700">{child.name}</span>
                        {leader === child.id && <Crown className="text-yellow-500 fill-yellow-500" size={18} />}
                      </div>
                      <Lock size={18} className="text-slate-200 group-hover:text-slate-400" />
                    </button>
                  ))}
                  <div className="h-px bg-slate-100 my-4"></div>
                  <button onClick={() => { setSelectingChild({ name: 'ניהול הורים', id: 'parent' }); setPinError(false); setPinEntry(''); }}
                    className="p-5 rounded-[1.5rem] bg-slate-900 text-white font-black shadow-lg flex justify-center gap-2 active:scale-95 transition-all">
                    <ShieldCheck size={20} /> כניסת הורים
                  </button>
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => { setSelectingChild(null); setPinError(false); setPinEntry(''); }}
                  className="text-blue-600 mb-8 font-black flex items-center gap-2 text-sm">
                  <ArrowRight size={18} /> חזור לבחירה
                </button>
                <h2 className="text-3xl font-black text-slate-900 mb-2">{selectingChild.name}</h2>
                <p className="text-slate-500 mb-10 text-sm font-bold uppercase tracking-widest">הקוד הסודי שלך</p>
                <input type="password" inputMode="numeric" autoFocus maxLength={4} value={pinEntry}
                  onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setPinEntry(val); if (pinError) setPinError(false); }}
                  className={`w-full text-center text-6xl tracking-[2rem] p-8 rounded-[2rem] border-2 outline-none transition-all mb-6 ${pinError ? 'border-red-500 bg-red-50 shadow-inner' : 'border-slate-100 focus:border-blue-500 bg-slate-50 shadow-inner'}`}
                  placeholder="----" />
                {pinError && <p className="text-red-500 font-black text-center">קוד שגוי, נסה שוב!</p>}
                <div className="mt-4 flex justify-center gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${pinEntry.length > i ? 'bg-slate-900 border-slate-900 scale-125' : 'bg-transparent border-slate-200'}`}></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CHILD VIEW ===== */}
      {view === 'child' && activeChild && (
        <div className="pb-24">
          {/* Header */}
          <div className={`${activeChild.color} p-12 pt-16 rounded-b-[4rem] text-white shadow-2xl relative text-center`}>
            <button onClick={() => { setView('login'); setActiveChild(null); setShowPinChange(false); }}
              className="absolute left-6 top-12 bg-white/20 p-2 px-5 rounded-full backdrop-blur-md flex items-center gap-2 font-black text-sm">
              חזור <ArrowRight size={20} />
            </button>
            <button onClick={() => setShowPinChange(v => !v)}
              className="absolute right-6 top-12 bg-white/20 p-3 rounded-full active:rotate-90 transition-transform shadow-lg">
              <Settings size={24} />
            </button>
            <div className="relative inline-block">
              <div className="w-28 h-28 bg-white/20 rounded-full mx-auto mb-5 flex items-center justify-center text-5xl font-black border-4 border-white/30 shadow-inner">{activeChild.name[0]}</div>
              {leader === activeChild.id && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full shadow-lg border-2 border-white text-slate-800 animate-bounce">
                  <Crown size={24} fill="currentColor"/>
                </div>
              )}
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">שלום {activeChild.name}!</h1>
            <div className="inline-flex items-center gap-3 bg-white text-slate-900 px-10 py-4 rounded-full mt-6 font-black shadow-2xl scale-110">
              <Star fill="#facc15" size={28} className="text-yellow-400" />
              <span className="text-2xl">{childrenData[activeChild.id]?.points || 0}</span>
            </div>
          </div>

          <div className="max-w-md mx-auto p-6 mt-6">
            {/* Change Password panel — collapsible, always accessible via gear icon */}
            {showPinChange && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-100 mb-8">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Lock size={22}/> שינוי קוד אישי</h3>
                <input type="password" inputMode="numeric" maxLength={4} value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center text-4xl p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-500 mb-6 shadow-inner"
                  placeholder="----" />
                <div className="flex gap-3">
                  <button onClick={() => updatePin(activeChild.id, newPin)}
                    className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl active:scale-95 shadow-md">עדכן קוד</button>
                  <button onClick={() => { setShowPinChange(false); setNewPin(''); }}
                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl">ביטול</button>
                </div>
              </div>
            )}

            {/* Tasks list — always visible */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Layout size={24} className="text-slate-400" /> האתגרים שלי</h2>
              </div>
              {TASK_TEMPLATES.map(task => {
                const isPending = !!logs.find(l => l.childId === activeChild.id && l.taskId === task.id && l.status === 'Pending');
                return (
                  <div key={task.id}
                    className={`bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border-2 ${task.golden ? 'border-yellow-400 bg-yellow-50/60' : isPending ? 'border-amber-400/30 bg-amber-50/50' : 'border-white'} flex items-center justify-between transition-all active:scale-[0.98]`}
                    style={task.golden ? { boxShadow: '0 0 18px 5px rgba(251,191,36,0.45), 0 0 36px 10px rgba(251,191,36,0.2)', animation: 'goldShimmerReact 2s ease-in-out infinite' } : {}}
                  >
                    <div className="flex items-center gap-5">
                      <div className="text-4xl bg-slate-50 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">{task.icon}</div>
                      <div>
                        <p className="font-black text-slate-800 text-xl leading-tight">{task.name}</p>
                        {task.golden && (
                          <span className="text-[10px] font-black text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full mt-1 mb-1 inline-block">⭐ משימת הזהב</span>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{task.points} נקודות</span>
                          <button onClick={() => getShabiTip(task.name)}
                            className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-md flex items-center gap-1 active:bg-orange-200">
                            <Sparkles size={12}/> טיפ
                          </button>
                        </div>
                      </div>
                    </div>
                    {isPending
                      ? <div className="bg-amber-100 text-amber-700 px-5 py-2 rounded-2xl font-black text-sm tracking-wide">ממתין...</div>
                      : <button onClick={() => reportTask(task)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-90 transition-all">בוצע</button>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== PARENT VIEW ===== */}
      {view === 'parent' && (
        <div className="pb-10">
          <div className="bg-slate-900 p-8 pt-16 text-white flex justify-between items-center shadow-2xl sticky top-0 z-20 rounded-b-[3rem]">
            <h1 className="text-3xl font-black flex items-center gap-3"><ShieldCheck className="text-blue-400" size={32}/> ניהול</h1>
            <button onClick={() => setView('login')}
              className="bg-white/10 px-8 py-3 rounded-2xl font-black flex items-center gap-2 active:scale-95 transition-all">
              חזור <ArrowRight size={20} />
            </button>
          </div>
          <div className="max-w-2xl mx-auto p-6">
            {/* Child score cards */}
            <div className="grid gap-4 mb-12">
              {CHILDREN.map(c => (
                <div key={c.id} className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-white flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full ${c.color} flex items-center justify-center text-white font-black text-2xl shadow-xl`}>{c.name[0]}</div>
                      <div>
                        <span className="font-black text-2xl text-slate-900">{c.name}</span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded-full font-bold">קוד: {userPins[c.id] || c.defaultPin}</span>
                          {leader === c.id && <span className="bg-yellow-400/20 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1"><Crown size={10}/> מקום 1</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-4xl font-black text-slate-900 px-6 border-l-2 border-slate-100">
                      {childrenData[c.id]?.points || 0}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => getRewardIdea(c.name, childrenData[c.id]?.points || 0)}
                      className="flex-1 py-4 bg-orange-100 text-orange-700 rounded-2xl flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition-all">
                      <Sparkles size={18}/> הצעת פרס
                    </button>
                    <button onClick={() => copyMagicLink(c.token)}
                      className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all ${copyFeedback === c.token ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                      {copyFeedback === c.token ? <Check size={18}/> : <Copy size={18}/>} קישור ישיר
                    </button>
                  </div>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="1"
                      value={deductInputs[c.id] || ''}
                      onChange={e => setDeductInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="כמות"
                      className="flex-1 py-4 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-slate-700 outline-none focus:border-red-300"
                    />
                    <button
                      onClick={() => deductPoints(c)}
                      className="flex-1 py-4 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition-all">
                      <Minus size={18}/> הורד נקודות
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending approvals */}
            <div className="flex items-center justify-between mb-8 px-2 border-r-8 border-blue-600 pr-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Clock size={32}/> בקשות לאישור</h2>
                <p className="text-slate-400 font-bold text-sm">ממתינים לאישור שלך לקבלת נקודות</p>
              </div>
              <span className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-full text-xl font-black shadow-lg shadow-blue-200">
                {logs.filter(l => l.status === 'Pending').length}
              </span>
            </div>
            <div className="grid gap-5">
              {logs.filter(l => l.status === 'Pending').length === 0 ? (
                <div className="bg-white/50 backdrop-blur-md p-16 rounded-[4rem] border-4 border-dashed border-slate-200 text-center flex flex-col items-center">
                  <CheckCircle2 size={64} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 font-black text-xl italic">הכל נקי! אין משימות ממתינות.</p>
                </div>
              ) : (
                logs.filter(l => l.status === 'Pending')
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map(log => (
                    <div key={log.id} className="bg-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between border-2 border-blue-50 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-2 h-full bg-blue-600"></div>
                      <div className="flex gap-5 items-center">
                        <div className="text-4xl bg-slate-50 p-4 rounded-3xl group-hover:scale-110 transition-transform">
                          {TASK_TEMPLATES.find(t => t.id === log.taskId)?.icon || '✨'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-2xl leading-tight">{log.taskName}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-blue-600 font-black px-3 py-1 bg-blue-50 rounded-full text-sm">{log.childName}</span>
                            <span className="text-slate-400 font-bold text-xs">+ {log.points} נקודות</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => approveTask(log)}
                        className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-200 active:scale-90 transition-all hover:bg-blue-700">אשר</button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
