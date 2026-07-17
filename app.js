import { initFaceAnalyzer, startFaceAnalyzer, stopFaceAnalyzer, setFaceFilter } from './modules/faceAnalyzer.js';
import { initAirPaint, startAirPaint, stopAirPaint, setPaintColor, setBrushSize, setContinuousPaint, clearPaintCanvas, savePaintCanvas, undoPaintCanvas, togglePaintEraser } from './modules/airPaint.js';
import { initAirSynth, startAirSynth, stopAirSynth, setSynthWaveType, setSynthScale, setSynthDelay } from './modules/airSynth.js';
import { initFaceRecognizer, startFaceRecognizer, stopFaceRecognizer, startUserRegistration, getRegisteredUsers, deleteUser } from './modules/faceRecognizer.js';

// Elementos do DOM
const webcam = document.getElementById('webcam');
const overlayCanvas = document.getElementById('overlayCanvas');
const paintCanvas = document.getElementById('paintCanvas');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingTitle = document.getElementById('loading-title');
const loadingProgress = document.getElementById('loading-progress');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const toggleCameraBtn = document.getElementById('toggle-camera-btn');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// Estado Global da Aplicação
let currentTab = 'face';
let cameraStream = null;
let isCameraOn = false;

// Estado de Inicialização dos Módulos
const modulesInitialized = {
  face: false,
  paint: false,
  synth: false,
  recognizer: false
};

// Configurações das abas (Títulos e Legendas)
const tabMetadata = {
  face: {
    title: "Espelho Inteligente",
    subtitle: "Análise de emoção, idade e mapeamento facial em tempo real."
  },
  paint: {
    title: "Pintura Aérea",
    subtitle: "Pinte no espaço usando gestos com o seu dedo indicador."
  },
  synth: {
    title: "Sintetizador por Gestos",
    subtitle: "Crie notas musicais e controle efeitos movendo as mãos no ar."
  },
  recognizer: {
    title: "Gestão de Pessoas",
    subtitle: "Cadastre e reconheça pessoas em tempo real com calibração inteligente de idade."
  }
};

// Inicialização Principal
async function init() {
  setupNavigation();
  setupCameraControls();
  setupFaceControls();
  setupPaintControls();
  setupSynthControls();
  setupRecognizerControls();
  
  // Liga a webcam inicialmente
  const cameraStarted = await startCamera();
  if (cameraStarted) {
    // Carrega o primeiro módulo padrão (Face Analyzer)
    await switchTab('face');
  }
}

// Iniciar Câmera
async function startCamera() {
  showLoading("Iniciando Câmera", "Acessando dispositivo de vídeo...");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });
    
    webcam.srcObject = stream;
    cameraStream = stream;
    isCameraOn = true;
    
    // Atualiza botões e indicadores
    toggleCameraBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span>Desligar Câmera</span>
    `;
    statusDot.className = 'status-dot green';
    statusText.innerText = 'Webcam ativa';
    
    // Aguarda o vídeo carregar metadados antes de resolver
    await new Promise((resolve) => {
      webcam.onloadedmetadata = () => {
        webcam.play();
        resolve();
      };
    });
    
    hideLoading();
    return true;
  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
    showLoading(
      "Erro na Webcam", 
      "Não foi possível acessar a webcam. Certifique-se de dar permissões de câmera a este site.", 
      true
    );
    statusDot.className = 'status-dot red';
    statusText.innerText = 'Erro na câmera';
    return false;
  }
}

// Parar Câmera
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    webcam.srcObject = null;
    cameraStream = null;
  }
  isCameraOn = false;
  toggleCameraBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
    <span>Ligar Câmera</span>
  `;
  statusDot.className = 'status-dot red';
  statusText.innerText = 'Câmera desligada';
  
  // Para qualquer loop de IA ativo
  stopActiveModule(currentTab);
}

// Gerenciamento da Tela de Carregamento
function showLoading(title, progressText, isError = false) {
  loadingOverlay.style.display = 'flex';
  loadingOverlay.style.opacity = '1';
  loadingTitle.innerText = title;
  loadingProgress.innerText = progressText;
  
  const spinner = document.querySelector('.glow-spinner');
  if (isError) {
    spinner.style.borderTopColor = 'var(--accent-pink)';
    spinner.style.animation = 'none';
  } else {
    spinner.style.borderTopColor = 'var(--accent-cyan)';
    spinner.style.animation = 'spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite';
  }
}

function hideLoading() {
  loadingOverlay.style.opacity = '0';
  setTimeout(() => {
    loadingOverlay.style.display = 'none';
  }, 500);
}

// Configurar Troca de Abas (Navegação)
function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', async () => {
      const tabName = item.getAttribute('data-tab');
      if (tabName !== currentTab) {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `tab-content-${tabName}`) {
            content.classList.add('active');
          }
        });
        
        await switchTab(tabName);
      }
    });
  });
}

// Transição de Abas e Inicialização de Módulos
async function switchTab(tabName) {
  // Para o módulo anterior
  stopActiveModule(currentTab);
  
  currentTab = tabName;
  
  // Atualiza cabeçalho da página
  pageTitle.innerText = tabMetadata[tabName].title;
  pageSubtitle.innerText = tabMetadata[tabName].subtitle;
  
  // Configura visibilidade do canvas de pintura e espelhamento
  const viewportContainer = document.querySelector('.viewport-container');
  if (tabName === 'paint') {
    paintCanvas.style.display = 'block';
  } else {
    paintCanvas.style.display = 'none';
  }
  
  if (viewportContainer) {
    if (tabName === 'recognizer') {
      viewportContainer.classList.add('no-mirror');
    } else {
      viewportContainer.classList.remove('no-mirror');
    }
  }
  
  if (!isCameraOn) {
    showLoading("Câmera Desligada", "Por favor, ligue a câmera para executar este módulo.");
    return;
  }

  // Inicializa o módulo se for a primeira vez
  if (!modulesInitialized[tabName]) {
    showLoading("Carregando Modelos de IA", "Obtendo arquivos de pesos dos servidores...");
    try {
      if (tabName === 'face') {
        await initFaceAnalyzer(webcam, overlayCanvas);
      } else if (tabName === 'paint') {
        await initAirPaint(webcam, overlayCanvas, paintCanvas);
      } else if (tabName === 'synth') {
        await initAirSynth(webcam, overlayCanvas);
      } else if (tabName === 'recognizer') {
        await initFaceRecognizer(webcam, overlayCanvas, onUserListChanged, onRegistrationProgress);
      }
      modulesInitialized[tabName] = true;
    } catch (error) {
      console.error(`Erro ao carregar módulo ${tabName}:`, error);
      showLoading("Erro de Conexão", `Falha ao carregar modelos para ${tabMetadata[tabName].title}. Verifique sua internet.`, true);
      return;
    }
  }
  
  hideLoading();
  
  if (tabName === 'recognizer') {
    onUserListChanged(getRegisteredUsers());
  }
  
  // Inicia a execução do módulo selecionado
  startActiveModule(tabName);
}

function startActiveModule(tabName) {
  if (tabName === 'face') {
    startFaceAnalyzer();
  } else if (tabName === 'paint') {
    startAirPaint();
  } else if (tabName === 'synth') {
    startAirSynth();
  } else if (tabName === 'recognizer') {
    startFaceRecognizer();
  }
}

function stopActiveModule(tabName) {
  if (tabName === 'face') {
    stopFaceAnalyzer();
  } else if (tabName === 'paint') {
    stopAirPaint();
  } else if (tabName === 'synth') {
    stopAirSynth();
  } else if (tabName === 'recognizer') {
    stopFaceRecognizer();
  }
}

// Configurar Controle da Câmera
function setupCameraControls() {
  toggleCameraBtn.addEventListener('click', () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera().then(started => {
        if (started) {
          startActiveModule(currentTab);
        }
      });
    }
  });
}

// Configurar Controles do Espelho Inteligente (AR)
function setupFaceControls() {
  const filterBtns = document.querySelectorAll('.ar-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filterName = btn.getAttribute('data-filter');
      setFaceFilter(filterName);
    });
  });
}

// Configurar Controles do Air Paint
function setupPaintControls() {
  // Seletor de Cores
  const colorBtns = document.querySelectorAll('.color-btn');
  const customColorTrigger = document.getElementById('custom-color-trigger');
  const customColorInput = document.getElementById('paint-color-input');
  
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const color = btn.getAttribute('data-color');
      setPaintColor(color);
    });
  });
  
  customColorTrigger.addEventListener('click', () => {
    customColorInput.click();
  });
  
  customColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    customColorTrigger.style.background = color;
    colorBtns.forEach(b => b.classList.remove('active'));
    customColorTrigger.classList.add('active');
    setPaintColor(color);
  });
  
  // Slider do Tamanho
  const brushSlider = document.getElementById('brush-size');
  const brushVal = document.getElementById('brush-size-val');
  brushSlider.addEventListener('input', (e) => {
    const size = e.target.value;
    brushVal.innerText = `${size}px`;
    setBrushSize(parseInt(size));
  });
  
  // Toggle de Pintura Contínua
  const continuousToggle = document.getElementById('continuous-paint-toggle');
  continuousToggle.addEventListener('change', (e) => {
    setContinuousPaint(e.target.checked);
  });
  
  // Botão Borracha
  const eraserToggleBtn = document.getElementById('eraser-toggle-btn');
  eraserToggleBtn.addEventListener('click', () => {
    const isEraser = togglePaintEraser();
    eraserToggleBtn.classList.toggle('active', isEraser);
  });

  // Botões de Ação
  document.getElementById('undo-canvas-btn').addEventListener('click', undoPaintCanvas);
  document.getElementById('clear-canvas-btn').addEventListener('click', clearPaintCanvas);
  document.getElementById('save-canvas-btn').addEventListener('click', savePaintCanvas);
}

// Configurar Controles do Air Synth
function setupSynthControls() {
  // Seletores de Forma de Onda
  const waveBtns = document.querySelectorAll('.wave-btn');
  waveBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      waveBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const waveType = btn.getAttribute('data-wave');
      setSynthWaveType(waveType);
    });
  });

  // Seletores de Escala
  const scaleBtns = document.querySelectorAll('.scale-btn');
  scaleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scaleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const scaleName = btn.getAttribute('data-scale');
      setSynthScale(scaleName);
    });
  });

  // Slider de Delay (Eco)
  const delaySlider = document.getElementById('delay-time');
  const delayVal = document.getElementById('delay-val');
  delaySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (val === 0) {
      delayVal.innerText = "Sem Eco";
    } else {
      delayVal.innerText = `${(val / 100).toFixed(2)}s`;
    }
    setSynthDelay(val / 100);
  });
}

// Renderiza a tabela de pessoas cadastradas na interface
function onUserListChanged(users) {
  const tableBody = document.getElementById('registered-users-table-body');
  if (!tableBody) return;
  
  if (users.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-table-text">Nenhuma pessoa cadastrada.</td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = users.map(user => {
    const refinedAgeDisplay = user.refinedAge 
      ? `<strong>${user.refinedAge} anos</strong>` 
      : '<span style="color: var(--text-muted); font-style: italic;">Aguardando...</span>';
      
    return `
      <tr>
        <td>${user.name}</td>
        <td>${user.realAge} anos</td>
        <td>${refinedAgeDisplay}</td>
        <td>
          <button class="btn-delete-user" data-name="${user.name}">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Atualiza o banner de progresso do cadastro/scanner
function onRegistrationProgress(title, desc) {
  const statusText = document.getElementById('recognizer-status-text');
  const statusEmoji = document.getElementById('rec-status-emoji');
  const statusCard = document.getElementById('recognizer-status-card');
  
  if (!statusText) return;
  
  statusText.innerText = `${title}: ${desc}`;
  
  if (title.includes("Concluído")) {
    if (statusEmoji) statusEmoji.innerText = "🎉";
    if (statusCard) {
      statusCard.style.borderColor = 'var(--accent-green)';
      statusCard.style.background = 'rgba(57, 255, 20, 0.08)';
    }
    // Restaura o scanner após 4 segundos
    setTimeout(() => {
      if (statusEmoji) statusEmoji.innerText = "🔍";
      if (statusText) statusText.innerText = "Escaneando...";
      if (statusCard) {
        statusCard.style.borderColor = 'rgba(0, 240, 255, 0.15)';
        statusCard.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.07), rgba(255, 0, 79, 0.07))';
      }
    }, 4000);
  } else if (title.includes("Capturando")) {
    if (statusEmoji) statusEmoji.innerText = "📸";
    if (statusCard) {
      statusCard.style.borderColor = 'var(--accent-yellow)';
      statusCard.style.background = 'rgba(255, 235, 59, 0.08)';
    }
  }
}

// Configurar Controles do Gerenciador de Pessoas
function setupRecognizerControls() {
  const form = document.getElementById('register-face-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('register-name');
      const ageInput = document.getElementById('register-age');
      
      if (nameInput && ageInput) {
        const name = nameInput.value.trim();
        const age = ageInput.value;
        
        startUserRegistration(name, age);
        form.reset();
      }
    });
  }
  
  // Delegação de cliques para botões de exclusão na tabela
  const tableBody = document.getElementById('registered-users-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete-user')) {
        const name = e.target.getAttribute('data-name');
        if (confirm(`Tem certeza que deseja excluir o cadastro de "${name}"?`)) {
          deleteUser(name);
        }
      }
    });
  }
}

// Inicializa a aplicação ao carregar
window.addEventListener('DOMContentLoaded', init);
