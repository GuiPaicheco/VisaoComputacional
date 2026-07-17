import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

let videoEl = null;
let overlayCanvasEl = null;
let overlayCtx = null;
let paintCanvasEl = null;
let paintCtx = null;

let handLandmarker = null;
let animationFrameId = null;
let isRunning = false;

// Estado da Pintura
let paintColor = "#ff007f";
let brushSize = 8;
let continuousPaint = false;
let prevPoint = null; // { x, y } para ligar os traços anteriores
let isEraser = false;
let undoHistory = [];
const maxHistorySteps = 20;
let rainbowHue = 0;
let wasPainting = false;

// Estruturas para desenhar o esqueleto da mão
const HAND_CONNECTIONS = [
  // Polegar
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Indicador
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Médio
  [9, 10], [10, 11], [11, 12],
  // Anelar
  [13, 14], [14, 15], [15, 16],
  // Mínimo
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palma / Metacarpo
  [5, 9], [9, 13], [13, 17]
];

// Inicialização do MediaPipe Hands
export async function initAirPaint(video, overlayCanvas, paintCanvas) {
  videoEl = video;
  overlayCanvasEl = overlayCanvas;
  overlayCtx = overlayCanvasEl.getContext('2d');
  
  paintCanvasEl = paintCanvas;
  paintCtx = paintCanvasEl.getContext('2d');
  
  // Limpa o canvas de pintura
  clearPaintCanvas();

  // Resolve arquivos WASM do CDN do MediaPipe
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  // Inicializa o detector de mãos
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
}

// Inicia o Loop de Desenho
export function startAirPaint() {
  if (isRunning) return;
  isRunning = true;
  
  resizeCanvases();
  prevPoint = null;
  predictionLoop();
}

// Para o Loop e limpa o Canvas de Sobreposição (Mantém o desenho)
export function stopAirPaint() {
  isRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  clearOverlayCanvas();
  prevPoint = null;
}

// Redimensionar os Canvases
function resizeCanvases() {
  if (videoEl) {
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;

    overlayCanvasEl.width = width;
    overlayCanvasEl.height = height;

    // Preserva o conteúdo do desenho ao redimensionar se já houver imagem
    if (paintCanvasEl.width !== width) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = paintCanvasEl.width;
      tempCanvas.height = paintCanvasEl.height;
      tempCanvas.getContext('2d').drawImage(paintCanvasEl, 0, 0);

      paintCanvasEl.width = width;
      paintCanvasEl.height = height;
      paintCtx.drawImage(tempCanvas, 0, 0, width, height);
    }
  }
}

// Loop recursivo de rastreamento
async function predictionLoop() {
  if (!isRunning) return;
  
  if (videoEl && videoEl.readyState === 4 && handLandmarker) {
    try {
      if (overlayCanvasEl.width !== videoEl.videoWidth) {
        resizeCanvases();
      }

      const startTimeMs = performance.now();
      const results = await handLandmarker.detectForVideo(videoEl, startTimeMs);

      clearOverlayCanvas();

      if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0]; // Primeira mão
        
        // Desenha a malha da mão com visual Cyberpunk
        drawHandSkeleton(landmarks);
        
        // Processa o desenho no Canvas Virtual
        processDrawing(landmarks);
      } else {
        // Se a mão sumiu da tela, reseta o ponto anterior para não cruzar linhas
        prevPoint = null;
      }
    } catch (err) {
      console.error("Erro no processamento da mão (AirPaint):", err);
    }
  }
  
  animationFrameId = requestAnimationFrame(predictionLoop);
}

// Limpar tela superior (esqueleto)
function clearOverlayCanvas() {
  if (overlayCtx && overlayCanvasEl) {
    overlayCtx.clearRect(0, 0, overlayCanvasEl.width, overlayCanvasEl.height);
  }
}

// Limpar tela de desenho
export function clearPaintCanvas() {
  if (paintCtx && paintCanvasEl) {
    paintCtx.clearRect(0, 0, paintCanvasEl.width, paintCanvasEl.height);
    prevPoint = null;
  }
}

// Exportar Canvas de Pintura como PNG
export function savePaintCanvas() {
  if (!paintCanvasEl) return;
  
  // Cria um canvas temporário para salvar com fundo preto (já que na tela ele fica transparente sobre o vídeo)
  const saveCanvas = document.createElement('canvas');
  saveCanvas.width = paintCanvasEl.width;
  saveCanvas.height = paintCanvasEl.height;
  const saveCtx = saveCanvas.getContext('2d');
  
  // Fundo escuro premium
  saveCtx.fillStyle = '#0a0d16';
  saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);
  
  // Desenha a pintura por cima. Como a pintura está espelhada para o usuário (transform: scaleX(-1)),
  // salvamos ela na orientação correta ou espelhada? Geralmente as pessoas preferem a imagem correta.
  // Vamos desenhar a imagem espelhada de volta para salvar exatamente como o usuário a vê.
  saveCtx.translate(saveCanvas.width, 0);
  saveCtx.scale(-1, 1);
  saveCtx.drawImage(paintCanvasEl, 0, 0);
  
  // Cria link de download
  const image = saveCanvas.toDataURL("image/png");
  const link = document.createElement('a');
  link.download = `VisionHub-AirPaint-${Date.now()}.png`;
  link.href = image;
  link.click();
}

// Configurar variáveis de pintura externamente
export function setPaintColor(color) {
  paintColor = color;
}

export function setBrushSize(size) {
  brushSize = size;
}

export function setContinuousPaint(val) {
  continuousPaint = val;
  prevPoint = null;
}

export function togglePaintEraser() {
  isEraser = !isEraser;
  return isEraser;
}

function saveToHistory() {
  if (!paintCtx || !paintCanvasEl) return;
  const imgData = paintCtx.getImageData(0, 0, paintCanvasEl.width, paintCanvasEl.height);
  undoHistory.push(imgData);
  if (undoHistory.length > maxHistorySteps) {
    undoHistory.shift();
  }
}

export function undoPaintCanvas() {
  if (undoHistory.length === 0) return;
  const lastState = undoHistory.pop();
  paintCtx.clearRect(0, 0, paintCanvasEl.width, paintCanvasEl.height);
  paintCtx.putImageData(lastState, 0, 0);
  prevPoint = null;
}

// Raciocínio de Desenho
function processDrawing(landmarks) {
  // Ponto 8 = Ponta do dedo indicador
  // Ponto 4 = Ponta do polegar
  // Ponto 0 = Pulso
  // Ponto 5 = Base do indicador
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const wrist = landmarks[0];
  const indexBase = landmarks[5];

  // Coordenadas em pixels da ponta do indicador (invertido na renderização, mas aqui calculamos cru)
  const x = indexTip.x * paintCanvasEl.width;
  const y = indexTip.y * paintCanvasEl.height;
  
  // Condição para desenhar
  let shouldPaint = false;
  
  if (continuousPaint) {
    shouldPaint = true;
  } else {
    // Escala invariante para profundidade: distância entre polegar e indicador dividida pelo tamanho da mão (pulso à base do indicador)
    const handScale = Math.hypot(wrist.x - indexBase.x, wrist.y - indexBase.y);
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    
    // Proporção menor que 0.15 é considerada pinça (gesto de desenho)
    if (pinchDist / handScale < 0.15) {
      shouldPaint = true;
    }
  }

  // Resolve cor ativa (Arco-íris ou cor estática)
  let activeColor = paintColor;
  if (paintColor === 'rainbow' && !isEraser) {
    rainbowHue = (rainbowHue + 2) % 360;
    activeColor = `hsl(${rainbowHue}, 100%, 50%)`;
  }

  if (shouldPaint) {
    // Salva o estado atual na pilha de histórico no início de um novo traço
    if (!wasPainting) {
      saveToHistory();
      wasPainting = true;
    }

    if (prevPoint) {
      // Configura operação de composição de desenho (borracha ou pintura normal)
      if (isEraser) {
        paintCtx.globalCompositeOperation = 'destination-out';
        paintCtx.strokeStyle = 'rgba(0,0,0,1)'; // Cor irrelevante, apaga
        paintCtx.shadowBlur = 0;
      } else {
        paintCtx.globalCompositeOperation = 'source-over';
        paintCtx.strokeStyle = activeColor;
        paintCtx.shadowColor = activeColor;
        paintCtx.shadowBlur = brushSize / 2;
      }

      paintCtx.beginPath();
      paintCtx.lineWidth = brushSize;
      paintCtx.lineCap = 'round';
      paintCtx.lineJoin = 'round';
      
      paintCtx.moveTo(prevPoint.x, prevPoint.y);
      paintCtx.lineTo(x, y);
      paintCtx.stroke();
      
      paintCtx.shadowBlur = 0;
    }
    prevPoint = { x, y };
  } else {
    prevPoint = null;
    wasPainting = false;
  }

  // Configura a operação de composição de volta ao padrão
  paintCtx.globalCompositeOperation = 'source-over';

  // Desenha um cursor indicador brilhante no canvas de sobreposição (holograma)
  overlayCtx.beginPath();
  overlayCtx.arc(x, y, shouldPaint ? brushSize / 2 + 5 : 8, 0, 2 * Math.PI);
  
  if (isEraser) {
    overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    overlayCtx.strokeStyle = '#ff007f';
    overlayCtx.lineWidth = 1.5;
    overlayCtx.setLineDash([4, 4]); // Borda tracejada para borracha
    overlayCtx.stroke();
  } else {
    overlayCtx.fillStyle = shouldPaint ? activeColor : 'rgba(255, 255, 255, 0.3)';
    overlayCtx.strokeStyle = shouldPaint ? '#ffffff' : activeColor;
    overlayCtx.lineWidth = 2;
    overlayCtx.shadowColor = activeColor;
    overlayCtx.shadowBlur = 10;
    overlayCtx.setLineDash([]); // Linha contínua
    overlayCtx.fill();
    overlayCtx.stroke();
    overlayCtx.shadowBlur = 0;
  }
  
  overlayCtx.setLineDash([]); // Limpa pontilhado para os próximos desenhos do esqueleto
}

// Desenhar o Esqueleto da Mão no Canvas de Sobreposição (Holográfico)
function drawHandSkeleton(landmarks) {
  const width = overlayCanvasEl.width;
  const height = overlayCanvasEl.height;

  // 1. Desenha as conexões (linhas de neon)
  overlayCtx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  overlayCtx.lineWidth = 2;
  overlayCtx.shadowColor = 'rgba(0, 240, 255, 0.5)';
  overlayCtx.shadowBlur = 4;

  HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    const pt1 = landmarks[startIdx];
    const pt2 = landmarks[endIdx];

    overlayCtx.beginPath();
    overlayCtx.moveTo(pt1.x * width, pt1.y * height);
    overlayCtx.lineTo(pt2.x * width, pt2.y * height);
    overlayCtx.stroke();
  });

  overlayCtx.shadowBlur = 0;

  // 2. Desenha as juntas (pontos verdes/pink)
  for (let i = 0; i < landmarks.length; i++) {
    const x = landmarks[i].x * width;
    const y = landmarks[i].y * height;
    
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 4, 0, 2 * Math.PI);
    
    // Pontas dos dedos em rosa, juntas em azul/verde
    if ([4, 8, 12, 16, 20].includes(i)) {
      overlayCtx.fillStyle = '#ff007f';
      overlayCtx.shadowColor = '#ff007f';
      overlayCtx.shadowBlur = 6;
    } else {
      overlayCtx.fillStyle = '#39ff14';
      overlayCtx.shadowColor = '#39ff14';
      overlayCtx.shadowBlur = 4;
    }
    
    overlayCtx.fill();
    overlayCtx.shadowBlur = 0;
  }
}
