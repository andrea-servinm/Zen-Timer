import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Pause, Play } from 'lucide-react';

type PracticeId = 'mindfulness' | 'box' | '478' | 'slow';
type Phase = { name: string; seconds: number; motion: 'inhale' | 'hold' | 'exhale' };

const practices: { id: PracticeId; name: string; detail: string; phases: Phase[] }[] = [
  { id: 'mindfulness', name: 'Atención plena', detail: 'Volver a la respiración', phases: [] },
  { id: 'box', name: 'Respiración en caja', detail: '4 · 4 · 4 · 4', phases: [
    { name: 'Inhala', seconds: 4, motion: 'inhale' }, { name: 'Sostén', seconds: 4, motion: 'hold' },
    { name: 'Exhala', seconds: 4, motion: 'exhale' }, { name: 'Sostén', seconds: 4, motion: 'hold' },
  ] },
  { id: '478', name: 'Respiración 4–7–8', detail: 'Inhala 4 · sostén 7 · exhala 8', phases: [
    { name: 'Inhala', seconds: 4, motion: 'inhale' }, { name: 'Sostén', seconds: 7, motion: 'hold' },
    { name: 'Exhala', seconds: 8, motion: 'exhale' },
  ] },
  { id: 'slow', name: 'Respiración pausada', detail: 'Inhala 4 · exhala 6 · 6 ciclos/min', phases: [
    { name: 'Inhala', seconds: 4, motion: 'inhale' }, { name: 'Exhala', seconds: 6, motion: 'exhale' },
  ] },
];
const presets = [5, 10, 15, 20, 25];

function readPreferences() {
  try {
    const saved = localStorage.getItem('calma-preferences');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function App() {
  const prefs = useRef(readPreferences()).current;
  const [practiceId, setPracticeId] = useState<PracticeId>(prefs.practiceId ?? 'mindfulness');
  const [duration, setDuration] = useState<number>(presets.includes(prefs.duration) ? prefs.duration : 25);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [remaining, setRemaining] = useState(duration * 60);
  const [status, setStatus] = useState<'ready' | 'running' | 'paused' | 'finished'>('ready');
  const [bell, setBell] = useState<boolean>(prefs.bell ?? false);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(prefs.intervalMinutes ?? 0);
  const startedAt = useRef(0);
  const lastInterval = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);
  const practice = practices.find((item) => item.id === practiceId) ?? practices[0];
  const elapsed = duration * 60 - remaining;
  const activePhase = practice.phases.length
    ? (() => {
      const total = practice.phases.reduce((sum, phase) => sum + phase.seconds, 0);
      let offset = elapsed % total;
      for (const phase of practice.phases) {
        if (offset < phase.seconds) return phase;
        offset -= phase.seconds;
      }
      return practice.phases[0];
    })()
    : null;
  const phaseHint = status === 'finished' ? 'Sesión completada' : status === 'paused' ? 'En pausa' :
    status === 'running' ? (activePhase?.name ?? 'Respira a tu ritmo') : (activePhase?.name ?? 'Un momento para ti');

  function chime() {
    if (!bell) return;
    try {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      if (context.state === 'suspended') void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.25);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 1.3);
    } catch { /* Audio may be unavailable; the timer remains usable. */ }
  }

  function changeBell(enabled: boolean) {
    if (enabled) {
      try {
        const context = audioContext.current ?? new AudioContext();
        audioContext.current = context;
        if (context.state === 'suspended') void context.resume();
      } catch { /* Audio may be unavailable; the timer remains usable. */ }
    }
    setBell(enabled);
  }

  useEffect(() => {
    localStorage.setItem('calma-preferences', JSON.stringify({ practiceId, duration, bell, intervalMinutes }));
  }, [practiceId, duration, bell, intervalMinutes]);

  useEffect(() => {
    if (status !== 'running') return undefined;
    const timer = window.setInterval(() => {
      const next = Math.max(0, duration * 60 - Math.floor((Date.now() - startedAt.current) / 1000));
      setRemaining(next);
      const elapsedSeconds = duration * 60 - next;
      if (intervalMinutes > 0 && elapsedSeconds > 0 && elapsedSeconds % (intervalMinutes * 60) === 0 && elapsedSeconds !== lastInterval.current) {
        lastInterval.current = elapsedSeconds;
        chime();
      }
      if (next <= 0) {
        setStatus('finished');
        chime();
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [status, duration, bell, intervalMinutes]);

  function start() {
    if (status === 'finished') setRemaining(duration * 60);
    startedAt.current = Date.now() - (duration * 60 - (status === 'finished' ? duration * 60 : remaining)) * 1000;
    setStatus('running');
  }
  function pause() {
    setStatus('paused');
  }
  function resume() {
    startedAt.current = Date.now() - (duration * 60 - remaining) * 1000;
    setStatus('running');
  }
  function reset() {
    setStatus('ready');
    setRemaining(duration * 60);
    lastInterval.current = 0;
  }
  function selectDuration(minutes: number) {
    const valid = Math.min(120, Math.max(1, Math.round(minutes)));
    setDuration(valid);
    setRemaining(valid * 60);
    setStatus('ready');
    setCustomMinutes('');
    lastInterval.current = 0;
  }
  function selectPractice(id: PracticeId) {
    setPracticeId(id);
    setStatus('ready');
    setRemaining(duration * 60);
    lastInterval.current = 0;
  }
  const timeText = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <div className="app-shell">
      <div className="content">
        <header className="topbar">
          <div className="brand" aria-label="Calma"><span className="brand-mark" aria-hidden="true">c</span><span>calma</span></div>
          <span className="top-note">un espacio para volver</span>
        </header>
        <main className="main">
          <section className="intro" aria-labelledby="page-title">
            <div className="eyebrow">Un pequeño paréntesis</div>
            <h1 id="page-title">Aquí, ahora.</h1>
            <p>Deja que este momento sea suficiente.</p>
          </section>
          <section className="workspace" aria-label="Temporizador de respiración">
            <div className="timer-panel">
              <div className="timer-kicker">{practice.name}</div>
              <div className={`breath-orb ${activePhase?.motion ?? ''}`} aria-hidden="true">
                <div className="orb-inner">
                  <div className="time" data-testid="text-time-remaining">{timeText}</div>
                  <div className="phase" data-testid="status-breath-phase" aria-live="polite">{phaseHint}</div>
                </div>
              </div>
              <p className="state-line" data-testid="status-session" aria-live="polite">
                {status === 'running' ? 'Estás aquí. Sin prisa.' : status === 'paused' ? 'La sesión está en pausa.' : status === 'finished' ? 'Has llegado hasta aquí. Bien.' : 'Cuando quieras, puedes empezar.'}
              </p>
              <div className="controls">
                {status === 'running' ? (
                  <button className="primary-btn" onClick={pause} data-testid="button-pause" aria-label="Pausar sesión"><Pause size={15} strokeWidth={1.7} /> <span style={{ marginLeft: 7 }}>Pausar</span></button>
                ) : status === 'paused' ? (
                  <button className="primary-btn" onClick={resume} data-testid="button-resume" aria-label="Reanudar sesión"><Play size={15} strokeWidth={1.7} fill="currentColor" /> <span style={{ marginLeft: 7 }}>Reanudar</span></button>
                ) : (
                  <button className="primary-btn" onClick={start} data-testid="button-start"><Play size={15} strokeWidth={1.7} fill="currentColor" /> <span style={{ marginLeft: 7 }}>{status === 'finished' ? 'Otra vez' : 'Comenzar'}</span></button>
                )}
                <button className="quiet-btn" onClick={reset} aria-label="Reiniciar temporizador" title="Reiniciar" data-testid="button-reset"><RotateCcw /></button>
              </div>
            </div>
            <aside className="side-panel" aria-label="Ajustes de práctica">
              <h2 className="section-label">Práctica</h2>
              <div className="practice-list" role="group" aria-label="Seleccionar práctica">
                {practices.map((item) => (
                  <button key={item.id} type="button" className={`practice-option ${practiceId === item.id ? 'selected' : ''}`} onClick={() => selectPractice(item.id)} aria-pressed={practiceId === item.id} data-testid={`button-practice-${item.id}`}>
                    <span className="practice-name">{item.name}</span><span className="practice-detail">{item.detail}</span>
                  </button>
                ))}
              </div>
              <hr className="divider" />
              <div className="duration-head"><h2 className="section-label">Duración</h2></div>
              <div className="duration-grid" role="group" aria-label="Duración en minutos">
                {presets.map((minutes) => <button key={minutes} className={`duration-chip ${duration === minutes ? 'selected' : ''}`} aria-pressed={duration === minutes} onClick={() => selectDuration(minutes)} data-testid={`button-duration-${minutes}`}>{minutes} min</button>)}
              </div>
              <form className="custom-row" onSubmit={(event) => { event.preventDefault(); if (customMinutes) selectDuration(Number(customMinutes)); }}>
                <label htmlFor="custom-duration">Otra duración</label>
                <input id="custom-duration" className="custom-input" type="number" min="1" max="120" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} aria-label="Duración personalizada en minutos" data-testid="input-custom-duration" />
                <span>min</span>
                <button type="submit" aria-label="Aplicar duración personalizada" style={{ border: 0, background: 'transparent', color: '#496e62', cursor: 'pointer', padding: '5px 2px', fontSize: 10, textDecoration: 'underline', textUnderlineOffset: 3 }}>Aplicar</button>
              </form>
              <hr className="divider" />
              <label className="toggle-row" htmlFor="bell-toggle"><span>Campana discreta</span><input id="bell-toggle" className="toggle-control" type="checkbox" checked={bell} onChange={(event) => changeBell(event.target.checked)} data-testid="toggle-bell" /></label>
              <div className="interval-row">
                <label htmlFor="interval-select">Avisos por intervalo</label>
                <select id="interval-select" className="interval-select" value={intervalMinutes} onChange={(event) => setIntervalMinutes(Number(event.target.value))} data-testid="select-interval">
                  <option value={0}>Desactivados</option><option value={5}>Cada 5 min</option><option value={10}>Cada 10 min</option><option value={15}>Cada 15 min</option>
                </select>
              </div>
              <div className="guide-note">{practiceId === 'mindfulness' ? 'No hay nada que alcanzar.' : 'Suave, sin forzar.'}</div>
            </aside>
          </section>
          <section className="info" aria-label="Información y fuentes">
            <div>
              <h2>Una práctica, no una meta.</h2>
              <p>La atención plena consiste en notar el momento presente sin juzgar. Si la atención se dispersa, vuelve con amabilidad a la respiración; no se trata de dejar la mente en blanco. <a href="https://www.mayoclinic.org/tests-procedures/meditation/in-depth/mindfulness-exercises/art-20046356" target="_blank" rel="noreferrer">Mayo Clinic · 21 ene 2026</a></p>
              <p style={{ marginTop: 9 }}>La respiración en caja alterna inhalar, sostener, exhalar y sostener a una cuenta cómoda de cuatro. La práctica 4–7–8 y la caja son opciones populares, no superiores ni garantizadas. <a href="https://health.clevelandclinic.org/box-breathing-benefits" target="_blank" rel="noreferrer">Cleveland Clinic</a></p>
              <p style={{ marginTop: 9 }}>En un estudio comparativo de 2025 con 84 estudiantes, respirar a 6/min elevó más ciertas medidas de variabilidad cardiaca que las otras condiciones, sin cambios significativos de ánimo o presión arterial; se observó sobreventilación leve. La eficacia relativa requiere más investigación. <a href="https://pubmed.ncbi.nlm.nih.gov/39864026" target="_blank" rel="noreferrer">Estudio en PubMed</a></p>
            </div>
            <aside className="safety">Hazlo a una cuenta cómoda y no fuerces las retenciones. Si sientes mareo o incomodidad, detente y vuelve a tu respiración natural. <a href="https://www.nhsinform.scot/healthy-living/mental-wellbeing/breathing-and-relaxation-exercises/tips-for-doing-breathing-and-relaxation-exercises" target="_blank" rel="noreferrer">Consejos de NHS inform</a>. Esta herramienta no es un tratamiento médico.</aside>
          </section>
          <footer className="footer">CALMA · UN MOMENTO A LA VEZ</footer>
        </main>
      </div>
    </div>
  );
}

export default App;
