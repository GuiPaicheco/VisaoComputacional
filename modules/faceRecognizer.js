import * as faceapi from 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm.js';

let videoEl = null;
let canvasEl = null;
let ctx = null;
let animationFrameId = null;
let isRunning = false;

// Estado do Reconhecedor
let faceMatcher = null;
let registeredUsers = [];
let registrationState = {
  isRegistering: false,
  name: '',
  realAge: 0,
  collectedSamples: []
};

// Callbacks para comunicar com o app.js (Interface UI)
let onUserListChangedCallback = null;
let onRegistrationProgressCallback = null;

// Inicializa o Módulo
export async function initFaceRecognizer(video, canvas, onUserListChanged, onRegistrationProgress) {
  videoEl = video;
  canvasEl = canvas;
  ctx = canvasEl.getContext('2d');
  
  onUserListChangedCallback = onUserListChanged;
  onRegistrationProgressCallback = onRegistrationProgress;
  
  // Carrega a base local de usuários
  loadUsersFromStorage();
  
  // Carrega modelos
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
  ]);
  
  // Constrói o classificador de rostos (FaceMatcher) com os usuários salvos
  buildFaceMatcher();
}

// Iniciar Rastreamento
export function startFaceRecognizer() {
  if (isRunning) return;
  isRunning = true;
  resizeCanvas();
  predictionLoop();
}

// Parar Rastreamento
export function stopFaceRecognizer() {
  isRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  clearCanvas();
  resetRegistration();
}

// Configurar o modo de registro de usuário
export function startUserRegistration(name, realAge) {
  registrationState = {
    isRegistering: true,
    name: name,
    realAge: parseInt(realAge),
    collectedSamples: []
  };
  
  if (onRegistrationProgressCallback) {
    onRegistrationProgressCallback("Amostra (0/3)", "Aguardando posicionamento do rosto...");
  }
}

// Cancelar/Resetar cadastro
function resetRegistration() {
  registrationState = {
    isRegistering: false,
    name: '',
    realAge: 0,
    collectedSamples: []
  };
}

// Resgata usuários do LocalStorage
function loadUsersFromStorage() {
  try {
    const raw = localStorage.getItem('visionhub_registered_users');
    if (raw) {
      registeredUsers = JSON.parse(raw);
    } else {
      registeredUsers = [];
    }
  } catch (err) {
    console.error("Erro ao ler LocalStorage:", err);
    registeredUsers = [];
  }
}

// Salva usuários no LocalStorage
function saveUsersToStorage() {
  try {
    localStorage.setItem('visionhub_registered_users', JSON.stringify(registeredUsers));
  } catch (err) {
    console.error("Erro ao salvar no LocalStorage:", err);
  }
}

// Reconstrói o matcher facial com os descritores cadastrados
function buildFaceMatcher() {
  if (registeredUsers.length === 0) {
    faceMatcher = null;
    return;
  }
  
  const labeledDescriptors = registeredUsers.map(user => {
    // Transforma os arrays normais serializados de volta em Float32Arrays
    const descArrays = user.descriptors.map(arr => new Float32Array(arr));
    return new faceapi.LabeledFaceDescriptors(user.name, descArrays);
  });
  
  // Limiar de tolerância de 0.6 para identificação
  faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
}

// Retorna lista de usuários
export function getRegisteredUsers() {
  return registeredUsers;
}

// Exclui um usuário do sistema
export function deleteUser(name) {
  registeredUsers = registeredUsers.filter(u => u.name !== name);
  saveUsersToStorage();
  buildFaceMatcher();
  
  if (onUserListChangedCallback) {
    onUserListChangedCallback(registeredUsers);
  }
}

// Redimensiona o canvas
function resizeCanvas() {
  if (videoEl && canvasEl) {
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;
  }
}

// Limpa o canvas
function clearCanvas() {
  if (ctx && canvasEl) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }
}

// Loop recursivo de IA
async function predictionLoop() {
  if (!isRunning) return;
  
  if (videoEl && videoEl.readyState === 4) {
    try {
      if (canvasEl.width !== videoEl.videoWidth) {
        resizeCanvas();
      }

      // Detecção facial com landmarks, descritores (embeddings) e idade
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      const detections = await faceapi.detectAllFaces(videoEl, options)
        .withFaceLandmarks()
        .withAgeAndGender()
        .withFaceDescriptors();

      clearCanvas();

      if (detections && detections.length > 0) {
        // Roda a identificação de cada rosto na tela
        detections.forEach(detection => {
          processDetection(detection);
        });
      }
    } catch (err) {
      console.error("Erro no processamento do Reconhecedor Facial:", err);
    }
  }
  
  animationFrameId = requestAnimationFrame(predictionLoop);
}

// Processa uma face detectada
function processDetection(detection) {
  const { box } = detection.detection;
  const descriptor = detection.descriptor;
  const predictedAge = detection.age;
  
  let label = "Desconhecido";
  let refinedAge = null;
  let isMatched = false;
  let color = "#ff007f"; // Rosa neon por padrão para desconhecidos
  
  // 1. Processo de Registro (Captura amostras)
  if (registrationState.isRegistering) {
    color = "#ffeb3b"; // Amarelo neon para registro
    label = "Registrando...";
    
    // Captura amostras se o rosto estiver bem posicionado
    if (registrationState.collectedSamples.length < 3) {
      // Converte o Float32Array em array normal para poder salvar no JSON
      const descriptorArray = Array.from(descriptor);
      registrationState.collectedSamples.push(descriptorArray);
      
      const count = registrationState.collectedSamples.length;
      if (onRegistrationProgressCallback) {
        onRegistrationProgressCallback(`Capturando (${count}/3)`, "Mantenha o rosto parado olhando para a câmera...");
      }
      
      // Conclui o cadastro se capturou 3 amostras válidas
      if (count === 3) {
        finalizeRegistration();
      }
    }
  } 
  // 2. Processo de Reconhecimento
  else if (faceMatcher) {
    const match = faceMatcher.findBestMatch(descriptor);
    if (match.label !== 'unknown') {
      isMatched = true;
      color = "#39ff14"; // Verde neon para conhecidos
      label = match.label;
      
      // Localiza o usuário no banco para atualizar o refinamento da idade
      const user = registeredUsers.find(u => u.name === label);
      if (user) {
        // Inicializa array de idades se não existir
        if (!user.predictedAges) {
          user.predictedAges = [];
        }
        
        // Adiciona a idade prevista e mantém o histórico com no máximo 50 leituras
        user.predictedAges.push(predictedAge);
        if (user.predictedAges.length > 50) {
          user.predictedAges.shift();
        }
        
        // Calcula a média das previsões
        const avgAge = user.predictedAges.reduce((a, b) => a + b, 0) / user.predictedAges.length;
        refinedAge = Math.round(avgAge);
        
        // Atualiza a média no usuário e salva no storage a cada segundo (Throttled)
        user.refinedAge = refinedAge;
        saveUsersToStorage();
        
        if (onUserListChangedCallback) {
          onUserListChangedCallback(registeredUsers);
        }
      }
    }
  }

  // 3. Desenhar a Borda Facial Neon na tela
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  
  // Desenha canto arredondados / caixa estilosa
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.shadowBlur = 0;
  
  // Desenha o Rótulo (Texto flutuante com nome, idade real e idade estimada pela IA)
  ctx.fillStyle = color;
  ctx.font = "bold 14px 'Outfit', sans-serif";
  
  let displayText = label;
  if (isMatched && refinedAge) {
    const user = registeredUsers.find(u => u.name === label);
    displayText = `${label} | Idade: ${user.realAge} anos (IA Média: ${refinedAge}a)`;
  } else if (!isMatched && !registrationState.isRegistering) {
    displayText = `${label} | IA: ${Math.round(predictedAge)}a`;
  }
  
  ctx.fillText(displayText, box.x, box.y - 8);
  ctx.restore();
}

// Finaliza o cadastro de uma pessoa
function finalizeRegistration() {
  const newUser = {
    name: registrationState.name,
    realAge: registrationState.realAge,
    descriptors: registrationState.collectedSamples,
    predictedAges: [],
    refinedAge: null
  };
  
  // Remove duplicados com o mesmo nome para substituição
  registeredUsers = registeredUsers.filter(u => u.name !== newUser.name);
  registeredUsers.push(newUser);
  
  saveUsersToStorage();
  buildFaceMatcher();
  
  const savedName = registrationState.name;
  resetRegistration();
  
  if (onRegistrationProgressCallback) {
    onRegistrationProgressCallback("Cadastro Concluído! 🎉", `Rosto de ${savedName} registrado com sucesso.`);
  }
  
  if (onUserListChangedCallback) {
    onUserListChangedCallback(registeredUsers);
  }
}
