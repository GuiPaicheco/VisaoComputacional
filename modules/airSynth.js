import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

let videoEl = null;
let overlayCanvasEl = null;
let overlayCtx = null;
let handLandmarker = null;
let animationFrameId = null;
let isRunning = false;

// Audio Context & Nodes
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let analyserNode = null;
let delayNode = null;
let feedbackNode = null;
let isAudioInitialized = false;

// Configurações do Sintetizador
let waveType = 'sine';
let activeScale = 'free';
let activeDelayTime = 0;
const minFreq = 120;  // Grave (Hz)
const maxFreq = 1200; // Agudo (Hz)
const maxVolume = 0.15; // Volume de segurança para não distorcer

// Frequências para alinhamento musical (Escalas de Dó Maior nas oitavas 3, 4, 5 e 6)
const PENTATONIC_SCALE = [
  130.81, 146.83, 164.81, 196.00, 220.00, // Oitava 3 (C3-A3)
  261.63, 293.66, 329.63, 392.00, 440.00, // Oitava 4 (C4-A4)
  523.25, 587.33, 659.25, 783.99, 880.00, // Oitava 5 (C5-A5)
  1046.50, 1174.66, 1318.51               // Oitava 6 (C6-E6)
];

const MAJOR_SCALE = [
  130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, // Oitava 3 (C3-B3)
  261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, // Oitava 4 (C4-B4)
  523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, // Oitava 5 (C5-B5)
  1046.50, 1174.66, 1318.51                               // Oitava 6 (C6-E6)
];

// Elementos de UI específicos do Synth
let freqDisplay = null;
let volDisplay = null;
let visualizerCanvas = null;
let visualizerCtx = null;
let visualizerFrameId = null;

// Inicialização das dependências
export async function initAirSynth(video, overlayCanvas) {
  videoEl = video;
  overlayCanvasEl = overlayCanvas;
  overlayCtx = overlayCanvasEl.getContext('2d');
  
  // Captura elementos de feedback do DOM
  freqDisplay = document.getElementById('synth-freq');
  volDisplay = document.getElementById('synth-volume');
  visualizerCanvas = document.getElementById('synthVisualizer');
  
  if (visualizerCanvas) {
    visualizerCtx = visualizerCanvas.getContext('2d');
    resizeVisualizer();
  }

  // Inicializa o rastreador de mão do MediaPipe
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
}

// Inicia a síntese e a detecção de gestos
export function startAirSynth() {
  if (isRunning) return;
  isRunning = true;
  
  // Tenta iniciar a API de áudio (espera o gesto para emitir som)
  initAudio();
  
  resizeOverlay();
  resizeVisualizer();
  
  // Inicia loops de predição e renderização da onda sonora
  predictionLoop();
  visualizerLoop();
}

// Para a síntese e limpa os osciladores
export function stopAirSynth() {
  isRunning = false;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  if (visualizerFrameId) {
    cancelAnimationFrame(visualizerFrameId);
    visualizerFrameId = null;
  }
  
  // Silencia o sintetizador suavemente
  silenceSynth();
  
  clearOverlayCanvas();
}

// Inicializa a Web Audio API
function initAudio() {
  if (isAudioInitialized) {
    // Se já estiver inicializado, apenas garante que o context está rodando
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return;
  }
  
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Cria oscilador, controle de ganho, analisador, delay e feedback
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    analyserNode = audioCtx.createAnalyser();
    delayNode = audioCtx.createDelay(1.0); // Máximo delay de 1.0s
    feedbackNode = audioCtx.createGain();
    
    // Configura tamanho do analisador (FFT) para o osciloscópio
    analyserNode.fftSize = 512;
    
    // Configurações iniciais do Delay
    delayNode.delayTime.setValueAtTime(activeDelayTime, audioCtx.currentTime);
    feedbackNode.gain.setValueAtTime(activeDelayTime > 0 ? 0.45 : 0, audioCtx.currentTime);
    
    // Conexões de áudio:
    // 1. Sinal Seco (Direct path)
    oscillator.connect(gainNode);
    gainNode.connect(analyserNode);
    
    // 2. Loop de Feedback de Delay (Echo loop)
    gainNode.connect(delayNode);
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);
    
    // 3. Conecta o sinal molhado (wet delay) no Analisador
    delayNode.connect(analyserNode);
    
    // 4. Analisador para a Saída Física
    analyserNode.connect(audioCtx.destination);
    
    // Configuração inicial do oscilador
    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    
    // Inicia zerado (mudo)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    
    // Inicia o oscilador em segundo plano
    oscillator.start(0);
    isAudioInitialized = true;
    console.log("Web Audio API inicializada com sucesso!");
  } catch (e) {
    console.error("Falha ao inicializar Web Audio API:", e);
  }
}

// Silenciar sintetizador com rampa suave para evitar ruídos de estalo (clicks)
function silenceSynth() {
  if (gainNode && audioCtx) {
    gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.03);
  }
  if (freqDisplay && volDisplay) {
    freqDisplay.innerText = "0 Hz";
    volDisplay.innerText = "0%";
  }
}

// Configura o tipo de onda
export function setSynthWaveType(type) {
  waveType = type;
  if (oscillator) {
    oscillator.type = type;
  }
}

// Redimensionamento dos canvases
function resizeOverlay() {
  if (videoEl && overlayCanvasEl) {
    overlayCanvasEl.width = videoEl.videoWidth || 640;
    overlayCanvasEl.height = videoEl.videoHeight || 480;
  }
}

function resizeVisualizer() {
  if (visualizerCanvas) {
    visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth || 300;
    visualizerCanvas.height = visualizerCanvas.parentElement.clientHeight || 120;
  }
}

// Loop recursivo de detecção da mão
async function predictionLoop() {
  if (!isRunning) return;
  
  if (videoEl && videoEl.readyState === 4 && handLandmarker) {
    try {
      if (overlayCanvasEl.width !== videoEl.videoWidth) {
        resizeOverlay();
      }

      const startTimeMs = performance.now();
      const results = await handLandmarker.detectForVideo(videoEl, startTimeMs);

      clearOverlayCanvas();

      if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Desenha a mão neon na tela
        drawSynthHandSkeleton(landmarks);
        
        // Processa as frequências e som
        processSynth(landmarks);
      } else {
        // Sem mão na tela = silêncio
        silenceSynth();
      }
    } catch (err) {
      console.error("Erro na predição do Synth:", err);
    }
  }
  
  animationFrameId = requestAnimationFrame(predictionLoop);
}

// Limpar canvas
function clearOverlayCanvas() {
  if (overlayCtx && overlayCanvasEl) {
    overlayCtx.clearRect(0, 0, overlayCanvasEl.width, overlayCanvasEl.height);
  }
}

// Processa a posição da mão para modular frequência e volume
function processSynth(landmarks) {
  // Ponto 8 = Ponta do indicador (cursor principal)
  // Ponto 9 = Centro da mão (ponto médio estável)
  const indexTip = landmarks[8];
  
  const width = overlayCanvasEl.width;
  const height = overlayCanvasEl.height;
  
  const pixelX = indexTip.x * width;
  const pixelY = indexTip.y * height;

  // 1. Mapeamento de Frequência (Eixo X)
  // Como o feed está espelhado fisicamente na tela, mapeamos (1 - x) para que a direita do usuário seja mais aguda
  const controlX = Math.max(0, Math.min(1, 1 - indexTip.x));
  
  // Escala Logarítmica para Frequência (soará muito mais musical)
  let frequency = minFreq * Math.pow(maxFreq / minFreq, controlX);
  
  // Alinhamento com escalas musicais se ativado
  if (activeScale === 'pentatonic') {
    frequency = snapToScale(frequency, PENTATONIC_SCALE);
  } else if (activeScale === 'major') {
    frequency = snapToScale(frequency, MAJOR_SCALE);
  }
  
  // 2. Mapeamento de Volume (Eixo Y)
  // Y = 0 é o topo da tela, Y = 1 é a base. Queremos maior volume no topo, então (1 - y)
  const controlY = Math.max(0, Math.min(1, 1 - indexTip.y));
  const targetGain = controlY * maxVolume;

  // Atualiza as propriedades de áudio suavemente para evitar estalos
  if (audioCtx && oscillator && gainNode) {
    // Se o áudio foi pausado por segurança do browser, tenta resumir
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Rampa suave
    oscillator.frequency.setTargetAtTime(frequency, audioCtx.currentTime, 0.04);
    gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.03);
  }

  // Atualiza a tela com os valores musicais em tempo real
  if (freqDisplay && volDisplay) {
    freqDisplay.innerText = `${Math.round(frequency)} Hz`;
    volDisplay.innerText = `${Math.round(controlY * 100)}%`;
  }

  // Desenha um cursor brilhante na ponta do indicador (com círculos concentrícos pulsando por volume)
  overlayCtx.beginPath();
  overlayCtx.arc(pixelX, pixelY, 8 + (controlY * 12), 0, 2 * Math.PI);
  overlayCtx.fillStyle = 'rgba(0, 240, 255, 0.2)';
  overlayCtx.strokeStyle = 'var(--accent-cyan)';
  overlayCtx.lineWidth = 2;
  overlayCtx.shadowColor = 'var(--accent-cyan)';
  overlayCtx.shadowBlur = 15;
  overlayCtx.fill();
  overlayCtx.stroke();
  overlayCtx.shadowBlur = 0;
}

// Desenha o esqueleto da mão com foco em neon ciano (Synth Theme)
function drawSynthHandSkeleton(landmarks) {
  const width = overlayCanvasEl.width;
  const height = overlayCanvasEl.height;

  // Linhas do esqueleto
  overlayCtx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  overlayCtx.lineWidth = 2;
  
  // Conexões simplificadas para desenhar
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Polegar
    [0, 5], [5, 6], [6, 7], [7, 8], // Indicador
    [9, 10], [10, 11], [11, 12],     // Médio
    [13, 14], [14, 15], [15, 16],    // Anelar
    [0, 17], [17, 18], [18, 19], [19, 20], // Mínimo
    [5, 9], [9, 13], [13, 17] // Palma
  ];

  connections.forEach(([start, end]) => {
    const pt1 = landmarks[start];
    const pt2 = landmarks[end];
    overlayCtx.beginPath();
    overlayCtx.moveTo(pt1.x * width, pt1.y * height);
    overlayCtx.lineTo(pt2.x * width, pt2.y * height);
    overlayCtx.stroke();
  });

  // Pontos das articulações
  for (let i = 0; i < landmarks.length; i++) {
    const x = landmarks[i].x * width;
    const y = landmarks[i].y * height;
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, i === 8 ? 6 : 3, 0, 2 * Math.PI);
    overlayCtx.fillStyle = i === 8 ? 'var(--accent-pink)' : 'var(--accent-cyan)';
    overlayCtx.fill();
  }
}

// Loop do Osciloscópio de Áudio (Visualizer)
function visualizerLoop() {
  if (!isRunning) return;
  
  if (visualizerCanvas && visualizerCtx && analyserNode) {
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    
    // Garante tamanho correto se o container mudar
    if (visualizerCanvas.width !== visualizerCanvas.parentElement.clientWidth) {
      resizeVisualizer();
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Pega os dados de tempo da onda
    analyserNode.getByteTimeDomainData(dataArray);
    
    // Limpa fundo do osciloscópio
    visualizerCtx.fillStyle = '#05070a';
    visualizerCtx.fillRect(0, 0, width, height);
    
    // Desenha linha central pontilhada guia
    visualizerCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    visualizerCtx.lineWidth = 1;
    visualizerCtx.beginPath();
    visualizerCtx.moveTo(0, height / 2);
    visualizerCtx.lineTo(width, height / 2);
    visualizerCtx.stroke();

    // Desenha a onda neon
    visualizerCtx.lineWidth = 2;
    visualizerCtx.strokeStyle = 'var(--accent-cyan)';
    visualizerCtx.shadowColor = 'var(--accent-cyan)';
    visualizerCtx.shadowBlur = 6;
    visualizerCtx.beginPath();
    
    const sliceWidth = width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // Normalizado
      const y = (v * height) / 2;
      
      if (i === 0) {
        visualizerCtx.moveTo(x, y);
      } else {
        visualizerCtx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    visualizerCtx.lineTo(width, height / 2);
    visualizerCtx.stroke();
    visualizerCtx.shadowBlur = 0; // Desativa sombra
  } else {
    // Se o áudio não estiver inicializado ou desativado, desenha uma linha flat
    if (visualizerCanvas && visualizerCtx) {
      const width = visualizerCanvas.width;
      const height = visualizerCanvas.height;
      visualizerCtx.fillStyle = '#05070a';
      visualizerCtx.fillRect(0, 0, width, height);
      visualizerCtx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      visualizerCtx.lineWidth = 2;
      visualizerCtx.beginPath();
      visualizerCtx.moveTo(0, height / 2);
      visualizerCtx.lineTo(width, height / 2);
      visualizerCtx.stroke();
    }
  }
  
  visualizerFrameId = requestAnimationFrame(visualizerLoop);
}

// Configurar a escala musical externamente
export function setSynthScale(scaleName) {
  activeScale = scaleName;
}

// Configurar o tempo de eco (delay) externamente
export function setSynthDelay(time) {
  activeDelayTime = time;
  if (delayNode && feedbackNode && audioCtx) {
    // Rampa suave para a nova linha de retardo
    delayNode.delayTime.setTargetAtTime(time, audioCtx.currentTime, 0.15);
    
    // Regula feedback (quanto maior o delay, mais repetitivo, mas limitado a 45% para não distorcer)
    const feedbackGain = time > 0 ? 0.45 : 0;
    feedbackNode.gain.setTargetAtTime(feedbackGain, audioCtx.currentTime, 0.1);
  }
}

// Função auxiliar para aproximar frequência à nota mais próxima da escala
function snapToScale(freq, scaleArray) {
  return scaleArray.reduce((prev, curr) => 
    Math.abs(curr - freq) < Math.abs(prev - freq) ? curr : prev
  );
}
