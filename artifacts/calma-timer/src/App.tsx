import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Pause, Play, Leaf } from 'lucide-react';

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
  const [bell, setBell] = useState<boolean>(prefs.bellExplicit === true ? prefs.bell === true : true);
  const [bellExplicit, setBellExplicit] = useState<boolean>(prefs.bellExplicit === true);
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
      const play = () => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.25);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 1.3);
      };
      if (context.state === 'suspended') void context.resume().then(play).catch(() => {});
      else play();
    } catch { /* Audio may be unavailable; the timer remains usable. */ }
  }

  function prepareAudio() {
    try {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch { /* Audio may be unavailable; the timer remains usable. */ }
  }

  function changeBell(enabled: boolean) {
    if (enabled) prepareAudio();
    setBell(enabled);
    setBellExplicit(true);
  }

  useEffect(() => {
    localStorage.setItem('calma-preferences', JSON.stringify({ practiceId, duration, bell, bellExplicit, intervalMinutes }));
  }, [practiceId, duration, bell, bellExplicit, intervalMinutes]);

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
    if (bell) prepareAudio();
    if (status === 'finished') setRemaining(duration * 60);
    startedAt.current = Date.now() - (duration * 60 - (status === 'finished' ? duration * 60 : remaining)) * 1000;
    setStatus('running');
  }
  function pause() {
    setStatus('paused');
  }
  function resume() {
    if (bell) prepareAudio();
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
      <main className="zen-layout">
        <header className="zen-header">
          <div className="zen-brand" aria-label="Zen Timer">
            <span>zen timer</span>
            <Leaf className="brand-leaf" aria-hidden="true" />
          </div>
        </header>

        <section className="timer-stage" aria-label="Temporizador de meditación">
          <div className="timer-kicker">{practice.name}</div>
          <div className={`timer-orbit ${activePhase?.motion ?? ''}`}>
            <div className="timer-core">
              <div className="time" data-testid="text-time-remaining" role="timer">{timeText}</div>
              <div className="phase" data-testid="status-breath-phase" aria-live="polite">{phaseHint}</div>
            </div>
          </div>
          <p className="state-line" data-testid="status-session" aria-live="polite">
            {status === 'running' ? 'Estás aquí. Sin prisa.' : status === 'paused' ? 'La sesión está en pausa.' : status === 'finished' ? 'Has llegado hasta aquí. Bien.' : 'Cuando quieras, puedes empezar.'}
          </p>
          <div className="controls">
            {status === 'running' ? (
              <button className="primary-btn" onClick={pause} data-testid="button-pause" aria-label="Pausar sesión"><Pause size={16} strokeWidth={1.8} /> Pausar</button>
            ) : status === 'paused' ? (
              <button className="primary-btn" onClick={resume} data-testid="button-resume" aria-label="Reanudar sesión"><Play size={16} strokeWidth={1.8} fill="currentColor" /> Reanudar</button>
            ) : (
              <button className="primary-btn" onClick={start} data-testid="button-start"><Play size={16} strokeWidth={1.8} fill="currentColor" /> {status === 'finished' ? 'Otra vez' : 'Comenzar'}</button>
            )}
            <button className="quiet-btn" onClick={reset} aria-label="Reiniciar temporizador" title="Reiniciar" data-testid="button-reset"><RotateCcw /></button>
          </div>
        </section>

        <section className="mode-section" aria-label="Elegir práctica">
          <div className="mode-grid" role="group" aria-label="Prácticas de meditación">
            {practices.map((item) => (
              <button key={item.id} type="button" className={`mode-option ${practiceId === item.id ? 'selected' : ''}`} onClick={() => selectPractice(item.id)} aria-pressed={practiceId === item.id} data-testid={`button-practice-${item.id}`}>
                <span className="mode-name">{item.name}</span>
                <span className="mode-detail">{item.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section" aria-label="Ajustes del temporizador">
          <div className="settings-heading">Duración</div>
          <div className="duration-grid" role="group" aria-label="Duración en minutos">
            {presets.map((minutes) => <button key={minutes} type="button" className={`duration-chip ${duration === minutes ? 'selected' : ''}`} aria-pressed={duration === minutes} onClick={() => selectDuration(minutes)} data-testid={`button-duration-${minutes}`}>{minutes} min</button>)}
          </div>
          <div className="settings-row">
            <form className="custom-row" onSubmit={(event) => { event.preventDefault(); if (customMinutes) selectDuration(Number(customMinutes)); }}>
              <label htmlFor="custom-duration">Otra duración</label>
              <input id="custom-duration" className="custom-input" type="number" min="1" max="120" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} aria-label="Duración personalizada en minutos" data-testid="input-custom-duration" />
              <span>min</span>
              <button type="submit" className="text-button" aria-label="Aplicar duración personalizada" data-testid="button-apply-duration">Aplicar</button>
            </form>
            <label className="toggle-row" htmlFor="bell-toggle"><span>Campana</span><input id="bell-toggle" className="toggle-control" type="checkbox" checked={bell} onChange={(event) => changeBell(event.target.checked)} data-testid="toggle-bell" /></label>
            <div className="interval-row">
              <label htmlFor="interval-select">Avisos</label>
              <select id="interval-select" className="interval-select" value={intervalMinutes} onChange={(event) => setIntervalMinutes(Number(event.target.value))} data-testid="select-interval">
                <option value={0}>Sin intervalos</option><option value={5}>Cada 5 min</option><option value={10}>Cada 10 min</option><option value={15}>Cada 15 min</option>
              </select>
            </div>
          </div>
        </section>

        <details className="guide-details">
          <summary>Prácticas seguras y fuentes</summary>
          <div className="guide-content">
            <p>La atención plena consiste en notar el momento presente sin juzgar. Si la atención se dispersa, vuelve con amabilidad a la respiración; no se trata de dejar la mente en blanco. <a href="https://www.mayoclinic.org/tests-procedures/meditation/in-depth/mindfulness-exercises/art-20046356" target="_blank" rel="noreferrer">Mayo Clinic · 21 ene 2026</a></p>
            <p>La respiración en caja alterna inhalar, sostener, exhalar y sostener a una cuenta cómoda de cuatro. La práctica 4–7–8 y la caja son opciones populares, no superiores ni garantizadas. <a href="https://health.clevelandclinic.org/box-breathing-benefits" target="_blank" rel="noreferrer">Cleveland Clinic</a></p>
            <p>En un estudio comparativo de 2025 con 84 estudiantes, respirar a 6/min elevó más ciertas medidas de variabilidad cardiaca que las otras condiciones, sin cambios significativos de ánimo o presión arterial; se observó sobreventilación leve. La eficacia relativa requiere más investigación. <a href="https://pubmed.ncbi.nlm.nih.gov/39864026" target="_blank" rel="noreferrer">Estudio en PubMed</a></p>
            <p className="safety">Hazlo a una cuenta cómoda y no fuerces las retenciones. Si sientes mareo o incomodidad, detente y vuelve a tu respiración natural. <a href="https://www.nhsinform.scot/healthy-living/mental-wellbeing/breathing-and-relaxation-exercises/tips-for-doing-breathing-and-relaxation-exercises" target="_blank" rel="noreferrer">Consejos de NHS inform</a>. Esta herramienta no es un tratamiento médico.</p>
          </div>
        </details>

        <footer className="footer">
          <span>CALMA · UN MOMENTO A LA VEZ</span>
          <a className="footer-credit" href="https://github.com/andrea-servinm" target="_blank" rel="noreferrer">
            © 2026 · @andrea-servinm
          </a>
        </footer>
      </main>
    </div>
  );
}

export default App;
