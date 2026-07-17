import * as faceapi from 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm.js';

let videoEl = null;
let canvasEl = null;
let ctx = null;
let animationFrameId = null;
let isRunning = false;

// Dicionário de tradução e emojis para as emoções
const emotionMap = {
  neutral: { name: 'Neutro', emoji: '😐' },
  happy: { name: 'Feliz', emoji: '😊' },
  sad: { name: 'Triste', emoji: '😢' },
  angry: { name: 'Bravo', emoji: '😠' },
  fearful: { name: 'Medo', emoji: '😨' },
  disgusted: { name: 'Nojo', emoji: '🤢' },
  surprised: { name: 'Surpreso', emoji: '😲' }
};

// Dicionário de tradução para gênero
const genderMap = {
  male: 'Masculino',
  female: 'Feminino'
};

// Inicialização dos modelos
export async function initFaceAnalyzer(video, canvas) {
  videoEl = video;
  canvasEl = canvas;
  ctx = canvasEl.getContext('2d');
  
  // Caminho remoto para carregar os pesos dos modelos do CDN
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  
  // Carrega os modelos necessários
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
  ]);
}

// Inicia o loop de predição
export function startFaceAnalyzer() {
  if (isRunning) return;
  isRunning = true;
  
  // Sincroniza dimensões do canvas com o vídeo
  resizeCanvas();
  
  // Inicia loop
  predictionLoop();
}

// Para o loop e limpa o canvas
export function stopFaceAnalyzer() {
  isRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  clearCanvas();
}

// Redimensionar canvas para corresponder ao vídeo
function resizeCanvas() {
  if (videoEl && canvasEl) {
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;
  }
}

// Loop recursivo de detecção
async function predictionLoop() {
  if (!isRunning) return;
  
  if (videoEl && videoEl.readyState === 4) {
    try {
      // Ajusta o tamanho se o vídeo mudou
      if (canvasEl.width !== videoEl.videoWidth) {
        resizeCanvas();
      }

      // Detecção usando Tiny Face Detector (otimizado para performance em navegadores)
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      const detections = await faceapi.detectAllFaces(videoEl, options)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      clearCanvas();

      if (detections && detections.length > 0) {
        // Renderiza elementos visuais personalizados e estatísticas para a primeira pessoa detectada
        const detection = detections[0];
        drawCustomLandmarks(detection);
        updateFaceMetrics(detection);
      } else {
        resetMetricsUI();
      }
    } catch (err) {
      console.error("Erro no processamento de detecção facial:", err);
    }
  }
  
  animationFrameId = requestAnimationFrame(predictionLoop);
}

// Limpar canvas de sobreposição
function clearCanvas() {
  if (ctx && canvasEl) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }
}

// Desenhar a malha facial com visual cyberpunk/neon personalizado
function drawCustomLandmarks(detection) {
  const { box } = detection.detection;
  const landmarks = detection.landmarks;
  const positions = landmarks.positions;

  // 1. Desenha a Caixa de Detecção
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 10;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Reset do efeito de brilho para os pontos menores
  ctx.shadowBlur = 0;

  // 2. Desenhar Conexões da Malha Facial (Pontos Importantes)
  ctx.lineWidth = 1;
  
  // Jaw Outline (Mandíbula) - Pontos 0 a 16
  drawPath(positions.slice(0, 17), false, 'rgba(0, 240, 255, 0.4)');
  // Eyebrows (Sobrancelhas) - Esquerda 17-21, Direita 22-26
  drawPath(positions.slice(17, 22), false, 'rgba(255, 0, 127, 0.5)');
  drawPath(positions.slice(22, 27), false, 'rgba(255, 0, 127, 0.5)');
  // Nose Bridge (Nariz) - Pontos 27 a 30, Base 30 a 35
  drawPath(positions.slice(27, 31), false, 'rgba(57, 255, 20, 0.5)');
  drawPath(positions.slice(30, 36), true, 'rgba(57, 255, 20, 0.5)');
  // Left Eye (Olho Esquerdo) - Pontos 36 a 41
  drawPath(positions.slice(36, 42), true, 'rgba(0, 240, 255, 0.6)');
  // Right Eye (Olho Direito) - Pontos 42 a 47
  drawPath(positions.slice(42, 48), true, 'rgba(0, 240, 255, 0.6)');
  // Lips (Lábios) - Externo 48-59, Interno 60-67
  drawPath(positions.slice(48, 60), true, 'rgba(ff, eb, 3b, 0.6)');
  drawPath(positions.slice(60, 68), true, 'rgba(ff, eb, 3b, 0.6)');

  // 3. Desenha Pontos Individuais
  ctx.fillStyle = '#ff007f';
  for (let i = 0; i < positions.length; i++) {
    ctx.beginPath();
    ctx.arc(positions[i].x, positions[i].y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Auxiliar para desenhar caminhos interligados
function drawPath(points, closePath = false, color = 'white') {
  if (points.length === 0) return;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (closePath) {
    ctx.closePath();
  }
  ctx.stroke();
}

// Atualizar Elementos de Interface do Dashboard
function updateFaceMetrics(detection) {
  // 1. Gênero e Idade
  const age = Math.round(detection.age);
  const gender = detection.gender;
  const genderConf = Math.round(detection.genderProbability * 100);
  
  document.getElementById('estimated-age').innerText = `${age} anos`;
  document.getElementById('estimated-gender').innerText = `${genderMap[gender] || gender} (${genderConf}%)`;

  // 2. Expressões / Emoções
  const expressions = detection.expressions;
  let dominantEmotion = 'neutral';
  let maxScore = 0;

  // Encontra a emoção dominante e atualiza as barras de progresso na tela
  Object.keys(expressions).forEach(emotion => {
    const score = expressions[emotion];
    const percentage = Math.round(score * 100);
    
    // Atualiza a barra de progresso no DOM
    const bar = document.getElementById(`bar-${emotion}`);
    const label = document.getElementById(`val-${emotion}`);
    if (bar && label) {
      bar.style.width = `${percentage}%`;
      label.innerText = `${percentage}%`;
    }

    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion;
    }
  });

  // Atualiza Destaque de Emoção Dominante
  const emojiEl = document.getElementById('emotion-emoji');
  const textEl = document.getElementById('dominant-emotion');
  
  if (emojiEl && textEl) {
    const mapped = emotionMap[dominantEmotion] || { name: dominantEmotion, emoji: '👤' };
    emojiEl.innerText = mapped.emoji;
    textEl.innerText = `${mapped.name} (${Math.round(maxScore * 100)}%)`;
  }
}

// Resetar UI quando ninguém estiver na câmera
function resetMetricsUI() {
  document.getElementById('estimated-age').innerText = '--';
  document.getElementById('estimated-gender').innerText = '--';
  document.getElementById('dominant-emotion').innerText = 'Procurando rosto...';
  document.getElementById('emotion-emoji').innerText = '👤';
  
  const emotions = ['happy', 'sad', 'surprised', 'angry', 'fearful', 'neutral'];
  emotions.forEach(emotion => {
    const bar = document.getElementById(`bar-${emotion}`);
    const label = document.getElementById(`val-${emotion}`);
    if (bar && label) {
      bar.style.width = `0%`;
      label.innerText = `0%`;
    }
  });
}
