/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Music, Image as ImageIcon, Volume2, Settings, Check, X, Plus, Trash2, ExternalLink, Maximize2, Video, Youtube, ChevronRight, ChevronLeft, Wind, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Helpers ---
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, str: `${r}, ${g}, ${b}` };
};

const lerpColor = (c1: string, c2: string, f: number) => {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * f), g = Math.round(g1 + (g2 - g1) * f), b = Math.round(b1 + (b2 - b1) * f);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// --- Types ---
type Mode = 'focus' | 'short' | 'long';

interface Task {
  id: number;
  text: string;
  done: boolean;
  tag: string;
}

interface Config {
  focus: number;
  short: number;
  long: number;
  sessions: number;
}

interface Sound {
  id: string;
  name: string;
  icon: string;
  type: string;
}

// --- Constants ---
const MODES: Record<Mode, { label: string; color: string; emoji: string; title: string }> = {
  focus: { label: 'FOCUSING', color: '#7c6fff', emoji: '🎯', title: 'Focus Session' },
  short: { label: 'SHORT BREAK', color: '#4fffb0', emoji: '☕', title: 'Short Break' },
  long: { label: 'LONG BREAK', color: '#ff6f91', emoji: '🛋️', title: 'Long Break' },
};

const AMBIENT_SOUNDS: Sound[] = [
  { id: 'rain', name: 'Rain', icon: '🌧️', type: 'rain' },
  { id: 'river', name: 'River', icon: '💧', type: 'river' },
  { id: 'ocean', name: 'Ocean', icon: '🌊', type: 'ocean' },
  { id: 'cafe', name: 'Café', icon: '☕', type: 'cafe' },
  { id: 'library', name: 'Library', icon: '📚', type: 'library' },
  { id: 'keyboard', name: 'Keys', icon: '⌨️', type: 'keyboard' },
];

const NOISE_SOUNDS: Sound[] = [
  { id: 'white', name: 'White', icon: '⬜', type: 'white' },
  { id: 'pink', name: 'Pink', icon: '🌸', type: 'pink' },
  { id: 'brown', name: 'Brown', icon: '🟫', type: 'brown' },
  { id: 'grey', name: 'Grey', icon: '🩶', type: 'grey' },
  { id: 'blue', name: 'Blue', icon: '🔵', type: 'blue' },
  { id: 't432', name: '432 Hz', icon: '🎵', type: 'tone432' },
  { id: 't528', name: '528 Hz', icon: '✨', type: 'tone528' },
  { id: 'bin', name: '40Hz Bi', icon: '🧠', type: 'binaural' },
];

const ALL_SOUNDS = [...AMBIENT_SOUNDS, ...NOISE_SOUNDS];

const VIDEO_BGS = [
  { id: 'v-rain', name: 'Rain', icon: '🌧️', yt: 'emdbRBhVips', accent: '#60a5fa' },
  { id: 'v-forest', name: 'Forest', icon: '🌲', yt: 'tfO0lH3erCQ', accent: '#4ade80' },
  { id: 'v-ocean', name: 'Ocean', icon: '🌊', yt: 'qREKP9oijWI', accent: '#38bdf8' },
  { id: 'v-city', name: 'City Night', icon: '🌃', yt: '3oWtQLRN_Zc', accent: '#fbbf24' },
  { id: 'v-snow', name: 'Snow', icon: '❄️', yt: 'mPZkdNFkNps', accent: '#94a3b8' },
  { id: 'v-lofi', name: 'Lo-Fi', icon: '🎹', yt: 'jfKfPfyJRdk', accent: '#f472b6' },
  { id: 'v-space', name: 'Space', icon: '🌌', yt: 'wnhvanMdx4s', accent: '#a78bfa' },
  { id: 'v-cafe', name: 'Café', icon: '☕', yt: '2R6MD3pRFTU', accent: '#fb923c' },
];

const ANIM_BGS = [
  { id: 'cosmic', name: 'Cosmic', icon: '🌌', accent: '#8b5cf6' },
  { id: 'aurora', name: 'Aurora', icon: '🌈', accent: '#10b981' },
  { id: 'particles', name: 'Particles', icon: '✨', accent: '#f59e0b' },
  { id: 'galaxy', name: 'Galaxy', icon: '🌀', accent: '#6366f1' },
  { id: 'lofi', name: 'Lo-Fi', icon: '🌆', accent: '#ec4899' },
  { id: 'none', name: 'No BG', icon: '⬛', accent: '#7c6fff' },
];

const STATIC_BGS = [
  { id: 's-dark', name: 'Pure Dark', color: '#09090f', accent: '#7c6fff' },
  { id: 's-mid', name: 'Midnight', color: '#050a18', accent: '#3b82f6' },
  { id: 's-forest', name: 'Forest', color: '#050f08', accent: '#22c55e' },
  { id: 's-ember', name: 'Ember', color: '#150508', accent: '#ef4444' },
  { id: 's-slate', name: 'Slate', color: '#0d1117', accent: '#64748b' },
  { id: 's-grape', name: 'Grape', color: '#0d0814', accent: '#a855f7' },
  { id: 's-wave', name: 'Great Wave', color: '#f0f0f0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Great_Wave_off_Kanagawa2.jpg/1280px-Great_Wave_off_Kanagawa2.jpg', accent: '#8B9BB4' },
  { id: 's-zen', name: 'Zen Light', color: '#f5f5f0', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop', accent: '#818cf8' },
];

const ACCENT_COLORS = [
  { color: '#7c6fff', name: 'Purple' },
  { color: '#ff6f91', name: 'Pink' },
  { color: '#4fffb0', name: 'Mint' },
  { color: '#ffc850', name: 'Gold' },
  { color: '#60cfff', name: 'Sky' },
  { color: '#ff9060', name: 'Coral' },
  { color: '#a0ff60', name: 'Lime' },
  { color: '#ff60d0', name: 'Fuchsia' },
];

const QUOTES = [
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["Focus on being productive instead of busy.", "Tim Ferriss"],
  ["It always seems impossible until it is done.", "Nelson Mandela"],
  ["Study hard what interests you most in the most undisciplined way.", "Richard Feynman"],
  ["An investment in knowledge pays the best interest.", "Benjamin Franklin"],
  ["Push yourself — no one else is going to do it for you.", "Unknown"],
  ["The beautiful thing about learning is nobody can take it away from you.", "B.B. King"],
  ["Do the hard jobs first. The easy jobs will take care of themselves.", "Dale Carnegie"]
];

// --- Helper Functions ---
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- Components ---
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  as?: 'div' | 'button';
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", style = {}, onClick, as = 'div' }) => {
  const [mPos, setMPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const Component = as as any;

  // Extract layout classes to apply to the content wrapper
  const layoutClasses = className.split(' ').filter(c => 
    c.startsWith('flex') || c.startsWith('items-') || c.startsWith('justify-') || c.startsWith('gap-') || c.startsWith('grid')
  ).join(' ');

  return (
    <Component
      onClick={onClick}
      onMouseMove={(e: any) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden glass-card ${className}`}
      style={style}
    >
      {/* Edge Glow Effect */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 100px at ${mPos.x}px ${mPos.y}px, rgba(255,255,255,0.12), transparent 70%)`,
        }}
      />
      {/* Border Highlight Effect */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-[inherit] z-10 transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          border: '1px solid rgba(255,255,255,0.3)',
          maskImage: `radial-gradient(circle 80px at ${mPos.x}px ${mPos.y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(circle 80px at ${mPos.x}px ${mPos.y}px, black, transparent)`,
        }}
      />
      <div className={`relative z-20 w-full h-full ${layoutClasses}`}>{children}</div>
    </Component>
  );
};

export default function App() {
  // --- State ---
  const [mode, setMode] = useState<Mode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [sessionsDone, setSessionsDone] = useState(0);
  const [focusMins, setFocusMins] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTag, setActiveTag] = useState('all');
  const [config, setConfig] = useState<Config>({ focus: 25, short: 5, long: 15, sessions: 4 });
  const [allTimeStats, setAllTimeStats] = useState<{
    totalSessions: number;
    totalFocusMins: number;
    dailyLog: { date: string; sessions: number; focusMins: number }[];
  }>({ totalSessions: 0, totalFocusMins: 0, dailyLog: [] });
  const [activeBg, setActiveBg] = useState('cosmic');
  const [bgType, setBgType] = useState<'anim' | 'video' | 'static' | 'none'>('anim');
  const [activeTab, setActiveTab] = useState('tasks');
  const [overlayOpacity, setOverlayOpacity] = useState(54);
  const [accentColor, setAccentColor] = useState('#7c6fff');
  const [quote, setQuote] = useState(QUOTES[0]);
  const [showBreakOverlay, setShowBreakOverlay] = useState(false);
  const [breakType, setBreakType] = useState<Mode>('short');
  const [showHubOverlay, setShowHubOverlay] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.6);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [activeSounds, setActiveSounds] = useState<Record<string, number>>({});
  const [soundVolumes, setSoundVolumes] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    ALL_SOUNDS.forEach(s => v[s.id] = 0.5);
    return v;
  });
  const [localFiles, setLocalFiles] = useState<{ name: string; url: string }[]>([]);
  const [isLocalListOpen, setIsLocalListOpen] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLooped, setIsLooped] = useState(false);
  const [radioUrl, setRadioUrl] = useState('');
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioError, setRadioError] = useState<string | null>(null);
  const [isRadioMenuOpen, setIsRadioMenuOpen] = useState(false);
  const [customRadioUrl, setCustomRadioUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytPlaying, setYtPlaying] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isYtVisible, setIsYtVisible] = useState(true);
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);

  const [customYtId, setCustomYtId] = useState('');
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWasOpenBeforeHub, setSidebarWasOpenBeforeHub] = useState(false);
  const [syncSound, setSyncSound] = useState(true);
  const [isSceneChanging, setIsSceneChanging] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<{ id: number; mode: Mode; timestamp: number }[]>([]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gnodesRef = useRef<Record<string, GainNode>>({});
  const snodesRef = useRef<Record<string, { stop: () => void }>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const localSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const radioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bgT = useRef(0);
  const bgFadeRef = useRef(1);
  const prevBgRef = useRef<string | null>(null);
  const accentLerpRef = useRef(accentColor);
  const pts = useRef<any[]>([]);

  useEffect(() => {
    setIsSceneChanging(true);
    const timer = setTimeout(() => setIsSceneChanging(false), 800);
    return () => clearTimeout(timer);
  }, [activeBg, bgType]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const saved = localStorage.getItem('focus_app_state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.tasks) setTasks(data.tasks);
        if (data.tasksDone) setTasksDone(data.tasksDone);
        if (data.config) {
          setConfig(data.config);
          if (!isRunning) {
            const mins = mode === 'focus' ? data.config.focus : mode === 'short' ? data.config.short : data.config.long;
            setTimeLeft(mins * 60);
            setTotalTime(mins * 60);
          }
        }
        if (data.accentColor) setAccentColor(data.accentColor);
        if (data.activeBg) setActiveBg(data.activeBg);
        if (data.bgType) setBgType(data.bgType);
        if (data.soundVolumes) setSoundVolumes(data.soundVolumes);
        if (data.masterVolume) setMasterVolume(data.masterVolume);
        if (data.musicVolume) setMusicVolume(data.musicVolume);
        if (data.sessionHistory) setSessionHistory(data.sessionHistory);
        if (data.allTimeStats) setAllTimeStats(data.allTimeStats);

        // Daily reset: if saved date != today, reset daily stats
        const lastDate: string = data.lastDate || '';
        if (lastDate !== today) {
          setSessionsDone(0);
          setFocusMins(0);
        } else {
          // Same day — restore daily stats
          if (data.sessionsDone) setSessionsDone(data.sessionsDone);
          if (data.focusMins) setFocusMins(data.focusMins);
        }
      } catch (e) { console.error('Failed to load state', e); }
    }
  }, []);

  // --- Persistence ---
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      const state = {
        tasks, sessionsDone, focusMins, tasksDone, config, accentColor, activeBg, bgType,
        soundVolumes, masterVolume, musicVolume, sessionHistory, allTimeStats, lastDate: today
      };
      localStorage.setItem('focus_app_state', JSON.stringify(state));
    }, 1000);
  }, [tasks, sessionsDone, focusMins, tasksDone, config, accentColor, activeBg, bgType, soundVolumes, masterVolume, musicVolume, sessionHistory, allTimeStats]);

  // Sync timer with config changes
  useEffect(() => {
    if (!isRunning) {
      const mins = mode === 'focus' ? config.focus : mode === 'short' ? config.short : config.long;
      setTimeLeft(mins * 60);
      setTotalTime(mins * 60);
    }
  }, [config, mode]);

  // Sync music volume
  useEffect(() => {
    if (localAudioRef.current) {
      localAudioRef.current.volume = musicVolume;
    }
    if (radioAudioRef.current) {
      radioAudioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);


  // --- Audio Logic ---
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.75;
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  }, []);

  const resumeCtx = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const mkBuf = useCallback((type: string) => {
    if (!audioCtxRef.current) return null;
    const ctx = audioCtxRef.current;
    const sr = ctx.sampleRate;
    const len = sr * 8;
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      } else if (type === 'brown') {
        let l = 0;
        for (let i = 0; i < len; i++) {
          const w = (Math.random() * 2 - 1) * 0.02;
          l = Math.max(-1, Math.min(1, (l + w) / 1.001));
          d[i] = l * 3.5;
        }
      } else if (type === 'blue') {
        let p = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          d[i] = (w - p) * 0.6;
          p = w;
        }
      } else {
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
      }
    }
    return buf;
  }, []);

  const startSnd = useCallback((id: string, stype: string, initialVol?: number) => {
    initAudio();
    resumeCtx();
    if (!audioCtxRef.current || !analyserRef.current) return;
    const ctx = audioCtxRef.current;

    if (gnodesRef.current[id]) {
      stopSnd(id, true);
    }

    const gn = ctx.createGain();
    gn.gain.value = 0;
    gn.connect(analyserRef.current);
    gnodesRef.current[id] = gn;

    const activeNodes: { stop: () => void }[] = [];
    const intervals: number[] = [];
    const timeouts: number[] = [];

    const addNode = (node: any) => {
      activeNodes.push({ stop: () => { try { node.stop(); } catch (e) { } } });
    };

    const addTimeout = (fn: () => void, delay: number) => {
      const t = setTimeout(fn, delay);
      timeouts.push(t as any);
      return t;
    };

    const createLayer = (noiseType: string, filterType: BiquadFilterType, freq: number, Q: number = 1, gainVal: number = 1) => {
      const buf = mkBuf(noiseType);
      if (!buf) return null;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = Q;
      const lgn = ctx.createGain();
      lgn.gain.value = gainVal;
      src.connect(f);
      f.connect(lgn);
      lgn.connect(gn);
      src.start();
      addNode(src);
      return { src, f, lgn };
    };

    const createTexture = (freq: number, Q: number, rate: number, dur: number, gainVal: number, type: 'noise' | 'sine' = 'noise') => {
      const trigger = () => {
        if (!gnodesRef.current[id]) return;
        const tgn = ctx.createGain();
        tgn.gain.value = 0;
        tgn.connect(gn);
        
        let source: any;
        if (type === 'noise') {
          const buf = mkBuf('white');
          if (!buf) return;
          source = ctx.createBufferSource();
          source.buffer = buf;
        } else {
          source = ctx.createOscillator();
          source.type = 'sine';
          source.frequency.value = freq + (Math.random() - 0.5) * freq * 0.2;
        }

        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = freq;
        f.Q.value = Q;

        source.connect(f);
        f.connect(tgn);

        const now = ctx.currentTime;
        tgn.gain.setValueAtTime(0, now);
        tgn.gain.linearRampToValueAtTime(gainVal * (0.5 + Math.random() * 0.5), now + 0.01);
        tgn.gain.exponentialRampToValueAtTime(0.001, now + dur);
        
        source.start();
        setTimeout(() => {
          try { source.stop(); source.disconnect(); tgn.disconnect(); } catch (e) {}
        }, dur * 1000 + 100);
      };

      const interval = setInterval(() => {
        if (Math.random() < rate) trigger();
      }, 200);
      intervals.push(interval as any);
    };

    const runSynthesis = (stype: string, gn: GainNode, addNode: (n: any) => void, createLayer: any, createTexture: any, intervals: number[], timeouts: number[]) => {
      if (stype === 'tone432' || stype === 'tone528') {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = stype === 'tone432' ? 432 : 528;
        o.connect(gn);
        o.start();
        addNode(o);
      } else if (stype === 'binaural') {
        const m = ctx.createChannelMerger(2);
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        o1.frequency.value = 200;
        o2.frequency.value = 240;
        o1.connect(m, 0, 0);
        o2.connect(m, 0, 1);
        m.connect(gn);
        o1.start();
        o2.start();
        addNode(o1);
        addNode(o2);
      } else {
        // Apply Recipes
        switch (stype) {
          case 'rain':
            createLayer('white', 'bandpass', 1200, 0.5, 0.8);
            createLayer('pink', 'lowpass', 800, 1, 0.4);
            createTexture(2500, 2, 0.3, 0.05, 0.1); // Patter
            break;
          case 'thunder':
            const tBase = createLayer('brown', 'lowpass', 100, 1, 0.8);
            const tMod = () => {
              if (!gnodesRef.current[id] || !tBase) return;
              const now = ctx.currentTime;
              tBase.lgn.gain.setTargetAtTime(0.2 + Math.random() * 0.8, now, 1.5);
              addTimeout(tMod, 3000 + Math.random() * 5000);
            };
            tMod();
            break;
          case 'forest':
            createLayer('pink', 'bandpass', 1000, 0.5, 0.6);
            createTexture(3000, 10, 0.05, 0.2, 0.05, 'sine'); // Bird
            break;
          case 'ocean':
            const oBase = createLayer('pink', 'lowpass', 400, 1, 0.7);
            const oMod = () => {
              if (!gnodesRef.current[id] || !oBase) return;
              const now = ctx.currentTime;
              const cycle = 4000 + Math.random() * 2000;
              oBase.lgn.gain.linearRampToValueAtTime(0.8, now + cycle/2000);
              oBase.lgn.gain.linearRampToValueAtTime(0.2, now + cycle/1000);
              addTimeout(oMod, cycle);
            };
            oMod();
            break;
          case 'cafe':
            createLayer('pink', 'bandpass', 1000, 0.4, 0.7); // Babble
            createLayer('brown', 'lowpass', 200, 1, 0.3); // Rumble
            createTexture(4000, 20, 0.1, 0.1, 0.08, 'sine'); // Clinks
            createTexture(1500, 5, 0.2, 0.3, 0.1); // Mumbles
            createTexture(600, 1, 0.05, 0.5, 0.1); // Chair scrapes
            break;
          case 'library':
            createLayer('pink', 'lowpass', 600, 1, 0.5);
            createTexture(800, 2, 0.03, 0.4, 0.15); // Page turns
            break;
          case 'fire':
            createLayer('brown', 'lowpass', 150, 1, 0.8);
            createTexture(5000, 0.5, 0.4, 0.01, 0.2); // Crackle
            break;
          case 'wind':
            const wBase = createLayer('grey', 'bandpass', 600, 0.2, 0.7);
            const wMod = () => {
              if (!gnodesRef.current[id] || !wBase) return;
              const now = ctx.currentTime;
              wBase.f.frequency.setTargetAtTime(400 + Math.random() * 600, now, 2);
              addTimeout(wMod, 3000);
            };
            wMod();
            break;
          case 'night':
            createLayer('white', 'bandpass', 2500, 2, 0.3);
            createTexture(3500, 30, 0.2, 0.1, 0.05, 'sine'); // Crickets
            break;
          case 'train':
            createLayer('brown', 'lowpass', 150, 1, 0.8);
            const trMod = () => {
              if (!gnodesRef.current[id]) return;
              const now = ctx.currentTime;
              gn.gain.setTargetAtTime(masterVolume * (activeSounds[id] || 0.5) * 1.2, now, 0.05);
              addTimeout(() => {
                if (gnodesRef.current[id]) gn.gain.setTargetAtTime(masterVolume * (activeSounds[id] || 0.5) * 0.8, ctx.currentTime, 0.05);
              }, 150);
              addTimeout(trMod, 1000);
            };
            trMod();
            break;
          case 'keyboard':
            createLayer('white', 'highpass', 3000, 1, 0.05); // Ambient hiss
            createTexture(2000, 5, 0.6, 0.03, 0.15); // Clicks
            createTexture(400, 2, 0.1, 0.05, 0.1); // Spacebar thumps
            break;
          default:
            const buf = mkBuf(stype || 'white');
            if (buf) {
              const src = ctx.createBufferSource();
              src.buffer = buf;
              src.loop = true;
              src.connect(gn);
              src.start();
              addNode(src);
            }
        }
      }
    };

    const SOUND_URLS: Record<string, string> = {
      lofi: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Lofi_Hip_Hop_Beat.ogg',
      rain: 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Light_Rain_Distant_Thunder_July_5th_2016.wav',
      river: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Relaxing_forest_river.webm',
      ocean: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Bubbling_Waterfall_and_Ocean_Waves.ogg',
      cafe: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Cafe_ambiance.ogg',
      library: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/20121112_TU_Delft_Library%2C_ground_level_-_general_ambience_-_SoundCloud_-_el_mar.ogg',
      keyboard: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Keyboard_noise.ogg'
    };

    if (SOUND_URLS[stype]) {
      console.log(`Playing ambient sound: ${stype} from ${SOUND_URLS[stype]}`);
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = SOUND_URLS[stype];
      audio.loop = true;
      audio.volume = 1;
      
      const source = ctx.createMediaElementSource(audio);
      source.connect(gn);
      
      audio.play().catch(e => {
        console.warn('Audio play failed, falling back to synthesis', e);
        runSynthesis(stype, gn, addNode, createLayer, createTexture, intervals, timeouts);
      });
      
      activeNodes.push({ stop: () => { audio.pause(); audio.src = ''; } });
    } else {
      runSynthesis(stype, gn, addNode, createLayer, createTexture, intervals, timeouts);
    }

    snodesRef.current[id] = { 
      stop: () => { 
        activeNodes.forEach(n => n.stop()); 
        intervals.forEach(i => clearInterval(i));
        timeouts.forEach(t => clearTimeout(t));
      } 
    };

    const vol = (initialVol !== undefined ? initialVol : (activeSounds[id] || 0.5)) * masterVolume;
    try { gn.gain.setTargetAtTime(vol, ctx.currentTime, 0.4); } catch (e) { gn.gain.value = vol; }
  }, [initAudio, resumeCtx, mkBuf, activeSounds, masterVolume]);

  const stopSnd = useCallback((id: string, instant = false) => {
    const gn = gnodesRef.current[id];
    if (!gn) return;
    const doStop = () => {
      if (snodesRef.current[id]) {
        snodesRef.current[id].stop();
        delete snodesRef.current[id];
      }
      try { gn.disconnect(); } catch (e) { }
      delete gnodesRef.current[id];
    };
    if (instant) {
      doStop();
      return;
    }
    if (audioCtxRef.current) {
      try { gn.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.3); } catch (e) { }
    }
    setTimeout(doStop, 700);
  }, []);

  const toggleSound = (id: string, stype: string) => {
    if (gnodesRef.current[id]) {
      stopSnd(id);
      const next = { ...activeSounds };
      delete next[id];
      setActiveSounds(next);
    } else {
      const vol = soundVolumes[id] || 0.5;
      setActiveSounds(prev => ({ ...prev, [id]: vol }));
      startSnd(id, stype, vol);
    }
  };

  const setSoundVol = (id: string, v: number) => {
    const vol = v / 100;
    setSoundVolumes(prev => ({ ...prev, [id]: vol }));
    if (gnodesRef.current[id]) {
      setActiveSounds(prev => ({ ...prev, [id]: vol }));
      const gn = gnodesRef.current[id];
      if (gn && audioCtxRef.current) {
        try { gn.gain.setTargetAtTime(vol * masterVolume, audioCtxRef.current.currentTime, 0.08); } catch (e) { }
      }
    }
  };

  const runDemo = () => {
    const demos = [
      { bg: 'v-rain', sound: 'rain', name: 'Rainy Day', type: 'rain' },
      { bg: 'v-cafe', sound: 'cafe', name: 'Cozy Cafe', type: 'cafe' },
      { bg: 'v-forest', sound: 'forest', name: 'Deep Forest', type: 'forest' },
      { bg: 'v-ocean', sound: 'ocean', name: 'Ocean Waves', type: 'ocean' },
      { bg: 'v-city', sound: 'night', name: 'City Night', type: 'night' },
      { bg: 'v-lofi', sound: 'keyboard', name: 'Lo-Fi Study', type: 'keyboard' },
    ];
    const d = demos[Math.floor(Math.random() * demos.length)];
    
    setBgType('video');
    setActiveBg(d.bg);
    
    // Stop all current sounds
    Object.keys(gnodesRef.current).forEach(id => {
      stopSnd(id, true);
    });
    
    // Start the demo sound
    const vol = 0.6;
    setActiveSounds({ [d.sound]: vol });
    startSnd(d.sound, d.type, vol);
  };

  // --- Visuals Logic ---
  const initPts = useCallback((n: number, type: string) => {
    const W = window.innerWidth, H = window.innerHeight;
    const newPts = [];
    const hBase = parseInt(accentColor.slice(1, 3), 16);
    
    for (let i = 0; i < n; i++) {
      newPts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * (type === 'galaxy' ? 0.5 : 0.2),
        vy: (Math.random() - 0.5) * (type === 'galaxy' ? 0.5 : 0.2),
        sz: Math.random() * 2 + 0.5,
        a: Math.random(),
        life: Math.random() * 200,
        h: (hBase + (Math.random() - 0.5) * 40) % 360
      });
    }
    pts.current = newPts;
  }, [accentColor]);


  useEffect(() => {
    initPts(120, activeBg);
    
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }

    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let rafId: number;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      
      let bass = 0, mid = 0, high = 0;
      const isExternalMusic = ytUrl.startsWith('https://www.youtube.com/embed/') || 
                             spotifyUrl.startsWith('https://open.spotify.com/embed/') ||
                             bgType === 'video' ||
                             isRadioPlaying;
      
      const analyser = analyserRef.current;
      if (analyser) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const bl = buf.length;
        // Optimized frequency analysis
        for (let i = 0; i < 10; i++) bass += buf[i];
        for (let i = 10; i < 40; i++) mid += buf[i];
        for (let i = 40; i < 100; i++) high += buf[i];
        bass /= (10 * 255); mid /= (30 * 255); high /= (60 * 255);

        // Simulate activity if external music is playing but analyser is quiet
        if (isExternalMusic && bass < 0.05 && mid < 0.05) {
          const t = Date.now() * 0.001;
          const beat = Math.pow(Math.sin(t * Math.PI * 1.5), 10);
          bass = 0.15 + 0.3 * beat + 0.05 * Math.sin(t * 2);
          mid = 0.1 + 0.2 * beat + 0.05 * Math.sin(t * 3);
          high = 0.05 + 0.1 * beat + 0.05 * Math.sin(t * 5);
        }
      } else if (isExternalMusic) {
        const t = Date.now() * 0.001;
        bass = 0.2 + 0.1 * Math.sin(t * 2);
        mid = 0.15 + 0.1 * Math.sin(t * 3);
        high = 0.1 + 0.05 * Math.sin(t * 5);
      }


      // BG & Effects
      if (canvasRef.current && (bgType === 'anim' || bgType === 'static')) {
        const bgx = canvasRef.current.getContext('2d');
        if (bgx) {
          const W = canvasRef.current.width, H = canvasRef.current.height;
          bgT.current += 0.004;

          // Handle Transition
          if (prevBgRef.current !== activeBg) {
            bgFadeRef.current -= 0.025;
            if (bgFadeRef.current <= 0) {
              prevBgRef.current = activeBg;
              initPts(120, activeBg); 
            }
          } else {
            bgFadeRef.current = Math.min(1, bgFadeRef.current + 0.025);
          }

          bgx.globalAlpha = bgFadeRef.current;
          accentLerpRef.current = lerpColor(accentLerpRef.current, accentColor, 0.05);
          const currentAccent = accentLerpRef.current;
          const rgb = hexToRgb(currentAccent);

          if (bgType === 'anim') {
            if (activeBg === 'cosmic') {
              bgx.fillStyle = 'rgba(9,9,15,0.15)';
              bgx.fillRect(0, 0, W, H);
              const spBase = 1 + (bass * 3);
              const hBase = parseInt(currentAccent.slice(1, 3), 16);
              
              pts.current.forEach(p => {
                p.x += p.vx * spBase; p.y += p.vy * spBase;
                p.a = 0.4 + 0.6 * Math.sin(p.life * 0.05);
                p.life++;
                if (p.x < 0 || p.x > W) p.vx *= -1;
                if (p.y < 0 || p.y > H) p.vy *= -1;
                bgx.beginPath();
                bgx.arc(p.x, p.y, p.sz * (1 + (high * 0.8)), 0, Math.PI * 2);
                bgx.fillStyle = `hsla(${(hBase + p.h * 0.1) % 360}, 70%, ${70 + (high * 30)}%, ${p.a})`;
                bgx.fill();
              });
            } else if (activeBg === 'aurora') {
              bgx.fillStyle = 'rgba(9,9,15,0.08)';
              bgx.fillRect(0, 0, W, H);
              const hBase = parseInt(currentAccent.slice(1, 3), 16);
              const bShift = bass * 30;
              const hShift = high * 40;
              
              for (let i = 0; i < 4; i++) {
                const y = H * 0.3 + Math.sin(bgT.current + i * 1.2) * H * 0.15 + bShift;
                const gg = bgx.createLinearGradient(0, y - 90, 0, y + 90);
                gg.addColorStop(0, 'transparent');
                gg.addColorStop(0.5, `hsla(${(hBase + i * 30 + hShift) % 360}, 80%, ${55 + (mid * 20)}%, ${0.12 + (bass * 0.1)})`);
                gg.addColorStop(1, 'transparent');
                bgx.fillStyle = gg;
                bgx.fillRect(0, y - 90, W, 180);
              }
              const hBase2 = parseInt(currentAccent.slice(3, 5), 16);
              pts.current.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.life++;
                p.a = 0.3 + 0.7 * Math.sin(p.life * 0.03);
                if (p.x < 0 || p.x > W) p.x = Math.random() * W;
                if (p.y < 0 || p.y > H) p.y = Math.random() * H;
                bgx.beginPath(); bgx.arc(p.x, p.y, 0.7, 0, Math.PI * 2);
                bgx.fillStyle = `hsla(${(hBase2 + p.h * 0.5) % 360}, 90%, 70%, ${p.a * 0.5})`;
                bgx.fill();
              });
            } else if (activeBg === 'particles') {
              bgx.fillStyle = 'rgba(9,9,15,0.1)';
              bgx.fillRect(0, 0, W, H);
              const spBase = 1 + (bass * 4);
              const hBase = parseInt(currentAccent.slice(5, 7), 16);
              const bShift = bass * 60;
              
              pts.current.forEach(p => {
                p.x += p.vx * spBase; p.y += p.vy * spBase;
                p.life++; p.a = 0.4 + 0.6 * Math.sin(p.life * 0.04);
                if (p.x < 0 || p.x > W) p.vx *= -1;
                if (p.y < 0 || p.y > H) p.vy *= -1;
                bgx.beginPath(); bgx.arc(p.x, p.y, p.sz * (1 + high * 0.5), 0, Math.PI * 2);
                bgx.fillStyle = `hsla(${(hBase + p.h + bShift) % 360}, 70%, 70%, ${p.a})`;
                bgx.fill();
              });
            } else if (activeBg === 'galaxy') {
              bgx.fillStyle = 'rgba(9,9,15,0.07)';
              bgx.fillRect(0, 0, W, H);
              const cx = W / 2, cy = H / 2, gsp = 1 + bass * 2;
              const hBase = parseInt(currentAccent.slice(1, 3), 16);
              
              pts.current.forEach((p, i) => {
                const ang = bgT.current * gsp + i * 0.1, r = 30 + i * 0.65;
                p.x = cx + Math.cos(ang) * r;
                p.y = cy + Math.sin(ang) * r * 0.4;
                bgx.beginPath(); bgx.arc(p.x, p.y, 0.8 + high * 0.6, 0, Math.PI * 2);
                bgx.fillStyle = `hsla(${(hBase + i * 5 + bgT.current * 60) % 360}, 80%, 80%, 0.5)`;
                bgx.fill();
              });
            } else if (activeBg === 'lofi') {
              bgx.fillStyle = 'rgba(9,9,15,0.07)';
              bgx.fillRect(0, 0, W, H);
              bgx.fillStyle = `rgba(${rgb.str}, 0.2)`;
              const bShift = bass * 30;
              for (let i = 0; i < 18; i++) {
                const bw2 = W / 18, bh = 50 + Math.sin(i * 1.7) * 90 + bShift;
                bgx.fillRect(i * bw2, H - bh - 60, bw2 - 2, bh + 60);
              }
              pts.current.forEach(p => {
                p.a = 0.3 + 0.7 * Math.sin(p.life * 0.03 + bgT.current);
                p.life++; bgx.beginPath(); bgx.arc(p.x, p.y, 0.7 + high * 0.5, 0, Math.PI * 2);
                bgx.fillStyle = `rgba(255,220,180,${p.a * 0.4})`;
                bgx.fill();
              });
            }
          }
          bgx.globalAlpha = 1.0;
        }
      }

    };
    loop();
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [bgType, activeBg, accentColor, initPts]);

  const toggleRadio = (url: string) => {
    initAudio();
    resumeCtx();
    if (!audioCtxRef.current || !analyserRef.current) return;

    const ctx = audioCtxRef.current;
    const analyser = analyserRef.current;

    // If clicking the same station that's already playing, toggle it
    if (radioUrl === url && isRadioPlaying) {
      radioAudioRef.current?.pause();
      setIsRadioPlaying(false);
      return;
    }

    // Stop other music sources
    if (isLocalPlaying) toggleLocalPlay();
    setYtUrl('');

    // Initialize the persistent radio audio element and source node if they don't exist
    if (!radioAudioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      radioAudioRef.current = audio;
      
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        radioSourceRef.current = source;
      } catch (e) {
        console.error("Failed to create radio source node:", e);
      }
    }

    const audio = radioAudioRef.current;
    
    // If it's a new URL, update the source
    if (radioUrl !== url) {
      audio.pause();
      audio.src = url;
      audio.load();
    }

    setRadioUrl(url);
    setIsRadioPlaying(true);
    setRadioError(null);
    audio.volume = musicVolume;

    const onAudioError = (e: any) => {
      console.error("Radio stream error:", e);
      setIsRadioPlaying(false);
      setRadioError("Stream connection failed. This station might be offline or blocked.");
      cleanup();
    };

    const onPlaying = () => {
      setRadioError(null);
      setIsRadioPlaying(true);
    };

    const cleanup = () => {
      audio.removeEventListener('error', onAudioError);
      audio.removeEventListener('playing', onPlaying);
    };

    audio.addEventListener('error', onAudioError);
    audio.addEventListener('playing', onPlaying);

    audio.play().catch(err => {
      console.error("Radio play failed:", err);
      setIsRadioPlaying(false);
      setRadioError("Could not start stream. Try another station.");
      cleanup();
    });
  };

  const RADIO_STREAMS = [
    { name: 'Lofi Radio', url: 'https://lofi.stream.laut.fm/lofi', icon: '📻', category: 'Lofi' },
    { name: 'Chillhop Live', url: 'https://stream.zeno.fm/0r0xa792kwzuv', icon: '☕', category: 'Lofi' },
    { name: 'Jazz Radio', url: 'https://cast1.torontocast.com:4640/stream', icon: '🎷', category: 'Jazz' },
    { name: 'Smooth Jazz', url: 'https://smooth-jazz.stream.laut.fm/smooth-jazz', icon: '🎹', category: 'Jazz' },
    { name: 'Classic Jazz', url: 'https://classic.stream.laut.fm/classic', icon: '🎺', category: 'Jazz' }
  ];

  // --- Streak (computed from allTimeStats.dailyLog) ---
  const streak = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let count = 0;
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().slice(0, 10);
      const hasEntry = allTimeStats.dailyLog.some(e => e.date === dateStr && e.sessions > 0);
      // Today with no sessions yet doesn't break the streak, skip it
      if (dateStr === today && !hasEntry) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      if (!hasEntry) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [allTimeStats.dailyLog]);

  // --- Timer Logic ---
  const timerExpiredRef = useRef(false);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const onTimerEnd = useCallback(() => {
    if (timerExpiredRef.current) return;
    timerExpiredRef.current = true;
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Beep
    initAudio();
    resumeCtx();
    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      [[880, 0.28, 0], [1100, 0.18, 300]].forEach(([freq, vol, delay]) => {
        setTimeout(() => {
          try {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = freq; g.gain.setValueAtTime(vol, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
            o.start(); o.stop(ctx.currentTime + 0.7);
          } catch (e) { }
        }, delay as number);
      });
    }

    if (mode === 'focus') {
      // Add to history - only for completed focus sessions
      const newHistoryItem = { id: Date.now(), mode: 'focus', timestamp: Date.now() };
      setSessionHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
      setFocusMins(f => f + config.focus * 60);
      setSessionsDone(prev => prev + 1);

      // Update all-time stats
      const today = new Date().toISOString().slice(0, 10);
      setAllTimeStats(prev => {
        const exists = prev.dailyLog.some(d => d.date === today);
        const log = exists
          ? prev.dailyLog.map(d => d.date === today
              ? { ...d, sessions: d.sessions + 1, focusMins: d.focusMins + config.focus }
              : d)
          : [...prev.dailyLog, { date: today, sessions: 1, focusMins: config.focus }];
        return {
          totalSessions: prev.totalSessions + 1,
          totalFocusMins: prev.totalFocusMins + config.focus,
          dailyLog: log.slice(-365),
        };
      });

      const nextSessionsDone = sessionsDone + 1;
      const isLong = nextSessionsDone % config.sessions === 0;
      const nextMode = isLong ? 'long' : 'short';
      const breakTime = nextMode === 'long' ? config.long * 60 : config.short * 60;
      setBreakType(nextMode as Mode);
      setMode(nextMode as Mode);
      setTimeLeft(breakTime);
      setTotalTime(breakTime);
      setShowBreakOverlay(true);

      // Auto-start the break countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerExpiredRef.current = false;
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);

      // Change to a random quote
      const currentIndex = QUOTES.findIndex(q => q[0] === quote[0]);
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * QUOTES.length);
      } while (newIndex === currentIndex && QUOTES.length > 1);
      setQuote(QUOTES[newIndex]);
    } else {
      setShowBreakOverlay(false);
      setMode('focus');
      const nextTime = config.focus * 60;
      setTimeLeft(nextTime);
      setTotalTime(nextTime);
    }
  }, [mode, config, sessionsDone, initAudio, resumeCtx, quote]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerExpiredRef.current = false;
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Fire onTimerEnd when the countdown reaches zero
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      onTimerEnd();
    }
  }, [timeLeft, isRunning, onTimerEnd]);

  const toggleTimer = () => {
    initAudio();
    resumeCtx();
    if (isRunning) pauseTimer();
    else startTimer();
  };

  const resetTimer = () => {
    pauseTimer();
    const mins = mode === 'focus' ? config.focus : mode === 'short' ? config.short : config.long;
    setTimeLeft(mins * 60);
    setTotalTime(mins * 60);
  };

  const skipBreak = () => {
    setShowBreakOverlay(false);
    pauseTimer();
    setMode('focus');
    const nextTime = config.focus * 60;
    setTimeLeft(nextTime);
    setTotalTime(nextTime);
  };

  // --- Music Logic ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files as FileList).map((f: File) => ({
      name: f.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(f)
    }));
    setLocalFiles(prev => [...prev, ...files]);
  };

  const removeLocalTrack = (index: number) => {
    setLocalFiles(prev => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });

    if (index === currentTrackIndex) {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current.src = '';
      }
      setIsLocalPlaying(false);
      setCurrentTrackIndex(0);
    } else if (index < currentTrackIndex) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  const playLocalTrack = (index: number) => {
    setCurrentTrackIndex(index);
    if (localAudioRef.current) {
      localAudioRef.current.src = localFiles[index].url;
      localAudioRef.current.play();
      setIsLocalPlaying(true);
      connectLocalAudio();
    }
  };

  const connectLocalAudio = () => {
    if (localSourceRef.current || !localAudioRef.current) return;
    initAudio();
    if (!audioCtxRef.current || !analyserRef.current) return;
    try {
      const source = audioCtxRef.current.createMediaElementSource(localAudioRef.current);
      source.connect(analyserRef.current);
      localSourceRef.current = source;
    } catch (e) {
      console.warn('Failed to connect local audio source:', e);
    }
  };

  const toggleLocalPlay = () => {
    if (!localAudioRef.current) return;
    if (isLocalPlaying) {
      localAudioRef.current.pause();
      setIsLocalPlaying(false);
    } else {
      localAudioRef.current.play();
      setIsLocalPlaying(true);
      connectLocalAudio();
    }
  };

  const nextTrack = () => {
    if (localFiles.length === 0) return;
    const next = isShuffled 
      ? Math.floor(Math.random() * localFiles.length) 
      : (currentTrackIndex + 1) % localFiles.length;
    playLocalTrack(next);
  };

  const prevTrack = () => {
    if (localFiles.length === 0) return;
    const prev = (currentTrackIndex - 1 + localFiles.length) % localFiles.length;
    playLocalTrack(prev);
  };

  const handleYtGo = () => {
    const raw = ytUrl.trim();
    if (!raw) return;
    const m = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (m) {
      setYtUrl(`https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`);
      setYtPlaying(true);
    }
  };

  const ytCommand = (cmd: 'playVideo' | 'pauseVideo' | 'stopVideo') => {
    const iframe = document.getElementById('globalYtPlayer') as HTMLIFrameElement | null;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
    if (cmd === 'playVideo') setYtPlaying(true);
    else setYtPlaying(false);
  };

  const handleSpotifyGo = () => {
    const raw = spotifyUrl.trim();
    if (!raw) return;
    const m = raw.match(/spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/);
    if (m) {
      setSpotifyUrl(`https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`);
    }
  };

  const handleVideoImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalVideoUrl(url);
      setActiveBg('local-video');
      setBgType('local-video');
    }
  };

  const addTask = (text: string, tag: string) => {
    if (!text.trim()) return;
    const newTask: Task = { id: Date.now(), text, done: false, tag };
    setTasks([newTask, ...tasks]);
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        if (!t.done) setTasksDone(d => d + 1);
        else setTasksDone(d => Math.max(0, d - 1));
        return { ...t, done: !t.done };
      }
      return t;
    }));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // --- YouTube Fix Logic ---
  const getYTUrl = (ytId: string) => {
    return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`;
  };

  // --- Render Helpers ---
  const progress = timeLeft / totalTime;
  const dashOffset = 2 * Math.PI * 100 * (1 - progress);

  const sidebarContent = useMemo(() => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="font-display text-[20px] font-bold text-white/90">Mimodoro<span style={{ color: accentColor }}>.</span></div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <PanelRightOpen size={18} />
          </button>
        </div>
        <div className="flex items-center gap-1 p-2 border-b border-white/5">
          {/* Mobile specific close removed as we have a global one now */}
          {['sounds', 'bg', 'music', 'tasks', 'hub', 'settings'].map(t => (
            <button 
              key={t}
              onClick={() => {
                if (t === 'hub') {
                  setSidebarWasOpenBeforeHub(isSidebarOpen);
                  setShowHubOverlay(true);
                  setIsSidebarOpen(false);
                } else {
                  setActiveTab(t as any);
                }
              }}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'}`}
              style={{ color: activeTab === t ? accentColor : '' }}
            >
              {t === 'sounds' ? <Volume2 size={14} className="mx-auto" /> :
               t === 'bg' ? <ImageIcon size={14} className="mx-auto" /> :
               t === 'music' ? <Music size={14} className="mx-auto" /> :
               t === 'tasks' ? <Check size={14} className="mx-auto" /> :
               t === 'hub' ? 'HUB' :
               <Settings size={14} className="mx-auto" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'sounds' && (
            <div className="space-y-4">
              <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5">Atmosphere</div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SOUNDS.map(s => (
                  <GlassCard 
                    as="button"
                    key={s.id}
                    onClick={() => toggleSound(s.id, s.type)}
                    className={`flex flex-col items-center gap-2 py-2 px-3 rounded-xl transition-all ${activeSounds[s.id] !== undefined ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                    style={{ borderColor: activeSounds[s.id] !== undefined ? `${accentColor}40` : '' }}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-[10px] font-medium text-white/80">{s.name}</span>
                    {activeSounds[s.id] !== undefined && (
                      <input 
                        type="range" min="0" max="100" 
                        value={(activeSounds[s.id] || 0) * 100} 
                        onClick={e => e.stopPropagation()}
                        onChange={e => setSoundVol(s.id, parseInt(e.target.value))}
                        className="w-full h-1 mt-1 accent-[#7c6fff] relative z-30"
                        style={{ accentColor }}
                      />
                    )}
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bg' && (
            <>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50">Animated Scenes</div>
                <button 
                  onClick={() => setSyncSound(!syncSound)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${syncSound ? 'bg-[#7c6fff]/20 border-[#7c6fff]/50 text-[#7c6fff]' : 'bg-white/5 border-white/10 text-white/50'}`}
                  style={{ 
                    color: syncSound ? accentColor : '', 
                    borderColor: syncSound ? `${accentColor}80` : '',
                    backgroundColor: syncSound ? `${accentColor}33` : ''
                  }}
                >
                  {syncSound ? '🔊 AUTO-SYNC ON' : '🔇 AUTO-SYNC OFF'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ANIM_BGS.map(b => (
                  <GlassCard 
                    key={b.id} 
                    onClick={() => { 
                      setActiveBg(b.id); 
                      setBgType(b.id === 'none' ? 'none' : 'anim'); 
                      setAccentColor(b.accent);
                      initPts(120, b.id); 
                    }}
                    className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all ${activeBg === b.id ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ borderColor: activeBg === b.id ? accentColor : 'transparent' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <span className="text-xl">{b.icon}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 backdrop-blur-sm text-[9px] font-bold text-center uppercase tracking-tighter z-30">{b.name}</div>
                  </GlassCard>
                ))}
              </div>

              <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mt-6 mb-2.5">Video Backgrounds</div>
              <div className="grid grid-cols-2 gap-1.5">
                {VIDEO_BGS.map(v => (
                  <GlassCard 
                    key={v.id} 
                    onClick={() => { setActiveBg(v.id); setBgType('video'); setAccentColor(v.accent); }}
                    className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all ${activeBg === v.id ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ borderColor: activeBg === v.id ? accentColor : 'transparent' }}
                  >
                    <img src={`https://img.youtube.com/vi/${v.yt}/mqdefault.jpg`} className="w-full h-full object-cover" alt={v.name} referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 backdrop-blur-sm text-[9px] font-bold text-center uppercase tracking-tighter z-30">{v.name}</div>
                  </GlassCard>
                ))}
              </div>

              <div className="text-[10px] font-semibold tracking-widest uppercase text-white/20 mt-6 mb-2">Static & Colors</div>
              <div className="grid grid-cols-2 gap-1.5">
                {STATIC_BGS.map(s => (
                  <motion.div 
                    key={s.id} 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveBg(s.id); setBgType('static'); setAccentColor(s.accent); }}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${activeBg === s.id ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ borderColor: activeBg === s.id ? accentColor : 'transparent' }}
                  >
                    {s.img ? (
                      <img src={s.img} className="w-full h-full object-cover" alt={s.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: s.color }} />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 backdrop-blur-sm text-[9px] font-bold text-center uppercase tracking-tighter">{s.name}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/20 mb-3">Customization</div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
                      <span>Overlay Opacity</span>
                      <span>{overlayOpacity}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="95" 
                      value={overlayOpacity} 
                      onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                      className="w-full h-1 accent-[#7c6fff]"
                      style={{ accentColor }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'music' && (
            <div className="space-y-6">
              <GlassCard className="p-4 rounded-2xl">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5">YouTube Player</div>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="Paste YouTube Link..." 
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleYtGo()}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white/20 relative z-30 text-white/80"
                  />
                  <GlassCard as="button" onClick={handleYtGo} className="p-2 rounded-xl hover:bg-white/20 transition-all"><Plus size={16} /></GlassCard>
                </div>
                {ytUrl.startsWith('https://www.youtube.com/embed/') && (
                  <div className="flex items-center gap-2 mt-1">
                    <GlassCard as="button" onClick={() => ytCommand(ytPlaying ? 'pauseVideo' : 'playVideo')} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-white/20 transition-all text-[11px] font-medium">
                      {ytPlaying ? <Pause size={13} /> : <Play size={13} />}
                      {ytPlaying ? 'Pause' : 'Play'}
                    </GlassCard>
                    <GlassCard as="button" onClick={() => { ytCommand('stopVideo'); setYtUrl(''); }} className="p-2 rounded-xl hover:bg-white/20 transition-all text-white/50 hover:text-white/80">
                      <X size={13} />
                    </GlassCard>
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-4 rounded-2xl">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5">Local Music</div>
                <div className="space-y-4">
                  <label className="block">
                    <input
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={handleFileImport}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/80 hover:border-white/20 transition-all cursor-pointer">
                      <span>Import local audio</span>
                      <Plus size={16} />
                    </div>
                  </label>

                  {localFiles.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-white/90">{localFiles[currentTrackIndex]?.name || 'Select a track'}</div>
                          <div className="text-[9px] text-white/60">{localFiles.length} track{localFiles.length === 1 ? '' : 's'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={prevTrack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><SkipBack size={16} /></button>
                          <button onClick={toggleLocalPlay} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            {isLocalPlaying ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button onClick={nextTrack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><SkipForward size={16} /></button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[10px] font-medium text-white/80">Playlist</div>
                        <button
                          type="button"
                          onClick={() => setIsLocalListOpen(open => !open)}
                          className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/70 hover:text-white transition-all"
                        >
                          {isLocalListOpen ? 'Hide songs' : 'Show songs'}
                        </button>
                      </div>

                      {isLocalListOpen && (
                        <div className="grid gap-2">
                          {localFiles.map((file, index) => (
                            <GlassCard
                              as="div"
                              key={file.url}
                              onClick={() => playLocalTrack(index)}
                              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl transition-all cursor-pointer ${currentTrackIndex === index ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                              style={{ borderColor: currentTrackIndex === index ? `${accentColor}40` : '' }}
                            >
                              <div className="min-w-0">
                                <span className="truncate text-[10px] font-medium text-white/80">{file.name}</span>
                                <div className="text-[9px] text-white/60">{currentTrackIndex === index && isLocalPlaying ? 'Playing' : 'Select'}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeLocalTrack(index); }}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </GlassCard>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-white/60">Add one or more audio files to play them here.</div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-4 rounded-2xl">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mt-2 mb-2.5 flex items-center justify-between">
                  <span>Lofi & Jazz Radio</span>
                  <button 
                    onClick={() => setIsRadioMenuOpen(!isRadioMenuOpen)}
                    className="text-[9px] text-white/70 hover:text-white underline decoration-white/20 relative z-30"
                  >
                    {isRadioMenuOpen ? 'Close Menu' : 'Change Station'}
                  </button>
                </div>
                
                {radioError && (
                  <div className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2 mt-2">
                    {radioError}
                  </div>
                )}

                {isRadioPlaying && !isRadioMenuOpen && (
                  <GlassCard className="mt-3 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                      {RADIO_STREAMS.find(s => s.url === radioUrl)?.icon || '📻'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-white/90 truncate">
                        {RADIO_STREAMS.find(s => s.url === radioUrl)?.name || 'Radio'}
                      </div>
                      <div className="text-[9px] text-white/70 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live Stream
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleRadio(radioUrl)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all relative z-30"
                    >
                      <Pause size={14} fill="currentColor" />
                    </button>
                  </GlassCard>
                )}

                <AnimatePresence>
                  {isRadioMenuOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-1.5 mt-3">
                        {['Lofi', 'Jazz'].map(cat => (
                          <div key={cat} className="space-y-1.5">
                            <div className="text-[9px] font-bold text-white/50 uppercase tracking-widest px-1 mt-2">{cat}</div>
                            {RADIO_STREAMS.filter(s => s.category === cat).map(s => (
                              <GlassCard 
                                as="button"
                                key={s.url}
                                onClick={() => toggleRadio(s.url)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${radioUrl === s.url && isRadioPlaying ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                style={{ borderColor: radioUrl === s.url && isRadioPlaying ? `${accentColor}40` : '' }}
                              >
                                <span className="text-lg">{s.icon}</span>
                                <div className="flex-1 text-left">
                                  <div className="text-[11px] font-medium text-white/90">{s.name}</div>
                                  <div className="text-[9px] text-white/60">{cat} Station</div>
                                </div>
                                {radioUrl === s.url && isRadioPlaying ? (
                                  <div className="flex gap-0.5 items-end h-3">
                                    {[0.4, 0.8, 0.5, 0.9].map((h, i) => (
                                      <motion.div 
                                        key={i}
                                        animate={{ height: ['20%', '100%', '20%'] }}
                                        transition={{ duration: 0.5 + i * 0.1, repeat: Infinity }}
                                        className="w-0.5 bg-white/60 rounded-full"
                                        style={{ backgroundColor: accentColor }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <Play size={12} className="text-white/50" />
                                )}
                              </GlassCard>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>

              <GlassCard className="p-4 rounded-2xl">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5">Spotify Embed</div>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="Paste Spotify Link..." 
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white/20 relative z-30 text-white/80"
                  />
                  <GlassCard as="button" onClick={handleSpotifyGo} className="p-2 rounded-xl hover:bg-white/20 transition-all"><Plus size={16} /></GlassCard>
                </div>
                {spotifyUrl.startsWith('https://open.spotify.com/embed/') && (
                  <div className="flex flex-col gap-2">
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black h-[80px] flex items-center justify-center text-white/50 text-[10px] font-bold uppercase tracking-widest bg-zinc-900">
                      Playing in background
                    </div>
                    <button onClick={() => setSpotifyUrl('')} className="text-[10px] text-white/70 hover:text-white self-start relative z-30">✕ Close</button>
                  </div>
                )}

                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mt-4 mb-2.5">Music Volume</div>
                <GlassCard className="flex items-center gap-3 rounded-xl py-1.5 px-3">
                  <Volume2 size={14} className="text-white/70" />
                  <input 
                    type="range" min="0" max="100" 
                    value={musicVolume * 100} 
                    onChange={(e) => setMusicVolume(parseInt(e.target.value) / 100)}
                    className="flex-1 h-1 accent-[#7c6fff] cursor-pointer relative z-30"
                    style={{ accentColor }}
                  />
                  <span className="text-[10px] text-white/70 w-6">{Math.round(musicVolume * 100)}%</span>
                </GlassCard>
              </GlassCard>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5">To-Do List</div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="What needs to be done?" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-white/20 text-white/80"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTask(e.currentTarget.value, 'focus');
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                {tasks.map(t => (
                  <GlassCard key={t.id} className="flex items-center gap-3 p-3 rounded-xl group transition-all">
                    <button 
                      onClick={() => toggleTask(t.id)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all relative z-30 ${t.done ? 'bg-white/20 border-white/40' : 'border-white/10 hover:border-white/20'}`}
                      style={{ backgroundColor: t.done ? accentColor : '', borderColor: t.done ? accentColor : '' }}
                    >
                      {t.done && <Check size={12} className="text-white" />}
                    </button>
                    <span className={`flex-1 text-xs transition-all ${t.done ? 'text-white/40 line-through' : 'text-white/90'}`}>{t.text}</span>
                    <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-white/50 hover:text-red-400 transition-all relative z-30"><Trash2 size={14} /></button>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}



          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* All-Time History */}
              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5">All-Time Stats</div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <GlassCard className="p-3 rounded-xl text-center">
                    <div className="text-[18px] font-bold font-display text-white/90">{allTimeStats.dailyLog.reduce((s, d) => s + d.sessions, 0)}</div>
                    <div className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">Total Sessions</div>
                  </GlassCard>
                  <GlassCard className="p-3 rounded-xl text-center">
                    <div className="text-[18px] font-bold font-display text-white/90">{Math.floor(allTimeStats.dailyLog.reduce((s, d) => s + d.focusMins, 0) / 60)}h {allTimeStats.dailyLog.reduce((s, d) => s + d.focusMins, 0) % 60}m</div>
                    <div className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">Total Focus</div>
                  </GlassCard>
                </div>
                {allTimeStats.dailyLog.length > 0 && (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {[...allTimeStats.dailyLog].reverse().map(day => {
                      const d = new Date(day.date + 'T00:00:00');
                      const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                      const hrs = Math.floor(day.focusMins / 60);
                      const mins = day.focusMins % 60;
                      return (
                        <GlassCard key={day.date} className="flex items-center justify-between px-3 py-2 rounded-xl">
                          <span className="text-[10px] text-white/70">{label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-white/50">{day.sessions} session{day.sessions !== 1 ? 's' : ''}</span>
                            <span className="text-[10px] font-medium text-white/80">{hrs > 0 ? `${hrs}h ` : ''}{mins}m</span>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                )}
                {allTimeStats.dailyLog.length === 0 && (
                  <div className="text-center text-[10px] text-white/30 py-4">No sessions recorded yet</div>
                )}
              </div>


              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5"> Accent Color</div>
                <div className="grid grid-cols-4 gap-2">
                  {ACCENT_COLORS.map(c => (
                    <button 
                      key={c.color}
                      onClick={() => setAccentColor(c.color)}
                      className={`h-10 rounded-xl border-2 transition-all flex items-center justify-center ${accentColor === c.color ? 'border-white' : 'border-transparent hover:border-white/20'}`}
                      style={{ backgroundColor: c.color }}
                    >
                      {accentColor === c.color && <Check size={16} className="text-black/60" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2.5">Timer Config</div>
                <div className="space-y-4">
                  {[
                    { label: 'Focus Duration', key: 'focus' },
                    { label: 'Short Break', key: 'short' },
                    { label: 'Long Break', key: 'long' },
                    { label: 'Sessions until Long Break', key: 'sessions' }
                  ].map(item => (
                    <div key={item.key}>
                      <div className="flex justify-between text-[10px] text-white/70 mb-1.5">
                        <span>{item.label}</span>
                        <span>{(config as any)[item.key]} {item.key === 'sessions' ? '' : 'min'}</span>
                      </div>
                      <input 
                        type="range" 
                        min={item.key === 'sessions' ? "1" : "1"} 
                        max={item.key === 'sessions' ? "10" : "60"} 
                        value={(config as any)[item.key]} 
                        onChange={(e) => setConfig({ ...config, [item.key]: parseInt(e.target.value) })}
                        className="w-full h-1 accent-[#7c6fff]"
                        style={{ accentColor }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button 
                  onClick={() => {
                    localStorage.removeItem('focus_app_state');
                    window.location.reload();
                  }}
                  className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [activeTab, accentColor, ALL_SOUNDS, activeSounds, syncSound, ANIM_BGS, activeBg, VIDEO_BGS, STATIC_BGS, overlayOpacity, ytUrl, radioError, isRadioPlaying, isRadioMenuOpen, radioUrl, RADIO_STREAMS, spotifyUrl, musicVolume, tasks, config, sessionsDone, sessionHistory, allTimeStats]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#09090f] text-[#eeeef5] font-sans">
      {/* Global Music Player (Persistent) */}
      <div className="fixed bottom-4 right-4 z-[1000] pointer-events-none opacity-0 h-0 overflow-hidden">
        {ytUrl.startsWith('https://www.youtube.com/embed/') && (
          <iframe 
            id="globalYtPlayer"
            className="pointer-events-auto"
            src={`${ytUrl}${ytUrl.includes('?') ? '&' : '?'}enablejsapi=1`} 
            allow="autoplay; encrypted-media" 
          />
        )}
        {spotifyUrl.startsWith('https://open.spotify.com/embed/') && (
          <iframe className="pointer-events-auto" src={spotifyUrl} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
        )}
        <audio ref={localAudioRef} className="hidden" preload="metadata" onEnded={nextTrack} />
      </div>

      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        {/* YouTube Background Fix */}
        {bgType === 'video' && (
          <iframe
            key={activeBg}
            className="absolute top-1/2 left-1/2 w-[177.78vh] h-[100vh] min-w-full min-h-[56.25vw] -translate-x-1/2 -translate-y-1/2 border-none pointer-events-none opacity-100 transition-opacity duration-1000"
            src={getYTUrl(activeBg === 'custom-yt' ? customYtId : (VIDEO_BGS.find(v => v.id === activeBg)?.yt || ''))}
            allow="autoplay; encrypted-media; picture-in-picture"
            title="Background Video"
          />
        )}

        {bgType === 'local-video' && localVideoUrl && (
          <video
            key={localVideoUrl}
            src={localVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
          />
        )}

        {bgType === 'static' && (
          <div className="absolute inset-0 transition-all duration-1000" style={{ backgroundColor: STATIC_BGS.find(s => s.id === activeBg)?.color || '#09090f' }}>
            {STATIC_BGS.find(s => s.id === activeBg)?.img && (
              <img 
                src={STATIC_BGS.find(s => s.id === activeBg)?.img} 
                className="w-full h-full object-cover opacity-40" 
                alt="Background" 
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        )}

        
        {/* Glow Effect */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{ 
            opacity: 0.3,
            background: `radial-gradient(ellipse at 50% 50%, ${accentColor}26 0%, transparent 70%)` 
          }}
        />
        
        {/* Overlay */}
        <div 
          className="absolute inset-0 transition-colors duration-300"
          style={{ backgroundColor: `rgba(9, 9, 15, ${overlayOpacity / 100})` }}
        />

        {/* Scene Transition Overlay */}
        <motion.div 
          initial={false}
          animate={{ opacity: isSceneChanging ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-[#09090f] pointer-events-none z-10"
        />
      </div>



      {/* App UI */}
      <div className="relative z-10 h-full overflow-hidden">
        {/* Floating Sidebar Toggle (Top Right) */}
        {!isSidebarOpen && !showHubOverlay && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-4 right-4 z-[9999] w-12 h-12 flex items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/70 cursor-pointer"
          >
            <PanelRightOpen size={24} />
          </button>
        )}

        {/* Body */}
        <div className="flex overflow-hidden h-full">
          {/* Mobile Sidebar Backdrop */}
          {isMobile && isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-[190] backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className={`flex-1 flex flex-col items-center justify-center ${isMobile ? 'p-3 gap-4' : 'p-5 gap-8'} ${isMobile ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'}`}>
            {/* Mode Tabs */}
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              {(['focus', 'short', 'long'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    if (!isRunning) {
                      setMode(m);
                      const mins = m === 'focus' ? config.focus : m === 'short' ? config.short : config.long;
                      setTimeLeft(mins * 60);
                      setTotalTime(mins * 60);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === m ? 'bg-[#7c6fff] text-white' : 'text-white/70 hover:text-white'}`}
                  style={{ backgroundColor: mode === m ? accentColor : '' }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {/* Timer Ring */}
            <div className={`relative ${isMobile ? 'w-[180px] h-[180px]' : 'w-[220px] h-[220px]'} flex-shrink-0`}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                <circle 
                  cx="110" cy="110" r="100" fill="none" 
                  stroke={accentColor} strokeWidth="14" strokeLinecap="round" 
                  className="opacity-10 transition-all duration-1000"
                  style={{ strokeDasharray: 2 * Math.PI * 100, strokeDashoffset: dashOffset }}
                />
                <circle 
                  cx="110" cy="110" r="100" fill="none" 
                  stroke={accentColor} strokeWidth="5" strokeLinecap="round" 
                  className="transition-all duration-1000"
                  style={{ 
                    strokeDasharray: 2 * Math.PI * 100, 
                    strokeDashoffset: dashOffset,
                    filter: `drop-shadow(0 0 8px ${accentColor})`
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <div className={`font-display font-bold tracking-tighter leading-none text-white/90 ${isMobile ? 'text-[40px]' : 'text-[50px]'}`}>{formatTime(timeLeft)}</div>
                <div className="text-[11px] text-white/70 font-medium tracking-widest">{isRunning ? MODES[mode].label : 'READY'}</div>
              </div>
            </div>

            {/* Controls */}
            <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-2.5'}`}>
              <button onClick={resetTimer} className={`flex items-center justify-center rounded-full glass-card text-white/70 hover:text-white transition-all ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}><RotateCcw size={isMobile ? 14 : 16} /></button>
              <button onClick={() => setMode(mode)} className={`flex items-center justify-center rounded-full glass-card text-white/70 hover:text-white transition-all ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}><SkipBack size={isMobile ? 14 : 16} /></button>
              <button 
                onClick={toggleTimer} 
                className={`flex items-center justify-center rounded-full text-white shadow-lg transition-all hover:brightness-110 ${isMobile ? 'w-[50px] h-[50px] text-[18px]' : 'w-[60px] h-[60px] text-[22px]'}`}
                style={{ backgroundColor: accentColor, boxShadow: `0 0 28px ${accentColor}66` }}
              >
                {isRunning ? <Pause size={isMobile ? 20 : 24} fill="white" /> : <Play size={isMobile ? 20 : 24} fill="white" className="ml-1" />}
              </button>
              <button onClick={onTimerEnd} className={`flex items-center justify-center rounded-full glass-card text-white/70 hover:text-white transition-all ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}><SkipForward size={isMobile ? 14 : 16} /></button>
              <button onClick={() => {
                const order: Mode[] = ['focus', 'short', 'long'];
                const next = order[(order.indexOf(mode) + 1) % 3];
                setMode(next);
                const mins = next === 'focus' ? config.focus : next === 'short' ? config.short : config.long;
                setTimeLeft(mins * 60);
                setTotalTime(mins * 60);
              }} className={`flex items-center justify-center rounded-full glass-card text-white/70 hover:text-white transition-all ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}><RotateCcw size={isMobile ? 14 : 16} className="rotate-45" /></button>
            </div>

            {/* Session Dots */}
            <div className="flex gap-2">
              {Array.from({ length: config.sessions }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${i < (sessionsDone % config.sessions) ? 'bg-[#7c6fff]' : i === (sessionsDone % config.sessions) && isRunning ? 'bg-emerald-400 shadow-[0_0_6px_#4fffb0]' : 'bg-white/10'}`}
                  style={{ backgroundColor: i < (sessionsDone % config.sessions) ? accentColor : '' }}
                />
              ))}
            </div>

            {/* Stats */}
            <div className={`flex ${isMobile ? 'flex-col gap-2 max-w-[200px]' : 'flex-wrap justify-center gap-3'}`}>
              <GlassCard 
                className={`rounded-xl text-center transition-all ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}`}
                style={{ borderColor: `${accentColor}20` }}
              >
                <div className={`font-bold font-display ${isMobile ? 'text-base' : 'text-lg'}`}>🔥 {streak}</div>
                <div className="text-[10px] text-white/70">Day Streak</div>
              </GlassCard>
              <GlassCard 
                className={`rounded-xl text-center transition-all ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}`}
                style={{ borderColor: `${accentColor}20` }}
              >
                <div className={`font-bold font-display ${isMobile ? 'text-base' : 'text-lg'}`}>{sessionsDone}</div>
                <div className="text-[10px] text-white/70">Sessions</div>
              </GlassCard>
              <GlassCard 
                className={`rounded-xl text-center transition-all ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}`}
                style={{ borderColor: `${accentColor}20` }}
              >
                <div className={`font-bold font-display ${isMobile ? 'text-base' : 'text-lg'}`}>{Math.floor(focusMins / 3600)}h {Math.floor((focusMins % 3600) / 60)}m</div>
                <div className="text-[10px] text-white/70">Focus</div>
              </GlassCard>
              <GlassCard 
                className={`rounded-xl text-center transition-all ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}`}
                style={{ borderColor: `${accentColor}20` }}
              >
                <div className={`font-bold font-display ${isMobile ? 'text-base' : 'text-lg'}`}>{tasksDone}</div>
                <div className="text-[10px] text-white/70">Tasks ✓</div>
              </GlassCard>
            </div>

            {/* Quote */}
            <div className={`${isMobile ? 'max-w-[280px]' : 'max-w-[360px]'} text-center opacity-80`}>
              <p className={`text-white/70 italic leading-relaxed ${isMobile ? 'text-[12px]' : 'text-[13px]'}`}>"{quote[0]}"</p>
              <small className="text-[11px] text-white/50 block mt-1">— {quote[1]}</small>
            </div>
          </div>

          {/* Sidebar */}
          <motion.aside 
            initial={false}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            animate={{ 
              width: isSidebarOpen ? (isMobile ? '100vw' : 320) : 0,
              x: isSidebarOpen ? 0 : (isMobile ? '100%' : 20),
              opacity: isSidebarOpen ? 1 : 0
            }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed md:relative inset-y-0 right-0 z-[200] md:z-auto h-full border-l border-white/10 glass overflow-hidden group/sidebar w-full max-w-[320px] md:w-[320px]"
          >
            {/* Dynamic Cursor Highlight */}
            <div 
              className="absolute inset-0 pointer-events-none z-10 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle 150px at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.08), transparent 80%)`
              }}
            />
            
            <div className="w-full h-full relative z-20">
              {sidebarContent}
            </div>
          </motion.aside>
        </div>

        <audio 
          ref={localAudioRef} 
          onEnded={nextTrack} 
          onTimeUpdate={(e) => setLocalProgress(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setLocalDuration(e.currentTarget.duration)}
        />
        <AnimatePresence>
          {showBreakOverlay && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-[#09090f]/90 backdrop-blur-[28px] flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="text-[58px] animate-bounce">{MODES[breakType].emoji}</div>
              <div className="font-display text-[32px] font-bold">{MODES[breakType].title}</div>
              <div className="text-white/40 text-sm">Step away. Breathe. You earned it.</div>
              <div className="font-display text-[48px] font-bold text-emerald-400">{formatTime(timeLeft)}</div>
              <button 
                onClick={skipBreak}
                className="px-6 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all text-sm"
              >
                Skip break →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHubOverlay && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-[#09090f]/95 backdrop-blur-[20px] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <ExternalLink size={20} className="text-white/70" />
                  <div>
                    <div className="font-display text-lg font-bold text-white">IAL Study Hub</div>
                    <div className="text-[11px] text-white/40">Your personal revision hub</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowHubOverlay(false);
                    if (sidebarWasOpenBeforeHub) {
                      setIsSidebarOpen(true);
                    }
                  }}
                  className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 relative overflow-hidden">
                <iframe
                  src="/ial_study_hub.html"
                  className="absolute inset-0 w-full h-full"
                  title="IAL Study Hub"
                  allowFullScreen
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const TC = {
  all: '#7c6fff',
  urgent: '#ff5050',
  study: '#4fffb0',
  review: '#ffc850',
  misc: '#9696ff'
};
