# 🌌 VisionHub

> Um portal interativo de Criatividade Computacional por Visão, rodando inteiramente no navegador com Inteligência Artificial local na GPU/CPU.

O **VisionHub** é uma aplicação web portátil, leve e de alta performance que demonstra o uso de modelos de visão computacional (detecção facial e rastreamento de mãos) para interações digitais inovadoras, sem a necessidade de processamento em servidores externos ou chaves de API.

---

## 🚀 Módulos do Sistema

### 1. 👤 Espelho Inteligente (Análise Facial)
Uma interface de espelho digital que analisa características do rosto do usuário em tempo real.
* **Malha Facial:** Renderização cibernética e responsiva de 68 pontos fiduciais do rosto.
* **Detecção de Emoções:** Classifica e exibe a distribuição de 7 emoções (Feliz, Triste, Surpreso, Bravo, Medo, Nojo, Neutro) com barras de progresso dinâmicas.
* **Idade e Gênero:** Estimativa em tempo real com probabilidade de acerto.

### 2. 🎨 Pintura Aérea (Air Canvas)
Um quadro virtual interativo que permite ao usuário pintar no ar.
* **Rastreamento de Mão:** Usa a câmera para identificar as juntas e a ponta dos dedos.
* **Gesto de Pinça:** Una o polegar ao indicador para começar a desenhar. Afaste os dedos para mover o cursor de pintura sem deixar traços.
* **Personalização:** Opções para alterar a cor e o tamanho do pincel.
* **Exportação:** Botão para salvar sua arte diretamente no computador como uma imagem PNG em alta definição sobre fundo escuro.

### 3. 🎵 Sintetizador por Gestos (Air Synth)
Um instrumento musical aéreo inspirado no Theremin.
* **Síntese Web Audio:** Geração de ondas sonoras em tempo real diretamente no navegador (apoia ondas senoidais, triangulares, dente de serra e quadradas).
* **Mapeamento Espacial:**
  * **Eixo X (Movimento Lateral):** Controla o tom da nota (frequência de 120Hz a 1200Hz em escala logarítmica para maior harmonia).
  * **Eixo Y (Movimento Vertical):** Controla o ganho de volume (mão no topo = som alto; mão abaixo = silêncio).
* **Osciloscópio Neon:** Exibe um visualizador de onda em tempo real reagindo às modificações do som gerado.

---

## 🛠️ Tecnologias Utilizadas

A aplicação foi desenvolvida sob o conceito de **máxima portabilidade**, usando tecnologias web nativas para dispensar compiladores ou etapas de build adicionais:

* **Estrutura:** HTML5 Semântico.
* **Estilização:** CSS3 Vanilla (Design System Dark com acentos neon e efeito *Glassmorphism*).
* **Lógica:** JavaScript Moderno (ES6) modularizado.
* **Modelos de IA (via CDN):**
  * [@vladmandic/face-api](https://github.com/vladmandic/face-api) (Modelos de landmarks, expressões e idade/gênero).
  * [Google MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) (Rastreamento de mão e detecção de landmarks).
* **Áudio:** Web Audio API nativa.

---

## 💻 Como Rodar o Projeto Localmente

Como o projeto utiliza importações modernas de módulos JavaScript (`import/export`) e consome modelos via requisições assíncronas do CDN, o navegador impede o funcionamento direto por clique duplo no arquivo `index.html` devido às políticas de segurança de arquivos locais (`CORS`). É necessário servir os arquivos através de um servidor local.

### Usando o Node.js (http-server / live-server)
Se você tem o Node instalado, rode no terminal dentro da pasta do projeto:
```bash
npx http-server
```
Depois, abra no navegador: `http://localhost:8080`

### Usando o VS Code (Live Server)
1. Instale a extensão **Live Server**.
2. Clique com o botão direito no `index.html`.
3. Escolha **"Open with Live Server"**.

### Usando Python
Se preferir usar o Python, rode no terminal:
```bash
python -m http.server 8000
```
Depois, acesse no navegador: `http://localhost:8000`

---

## 🌐 Planejamento de Hospedagem

Por ser uma aplicação totalmente estática e cliente-side (todo o processamento é feito no computador de quem acessa), a hospedagem é simples, rápida e gratuita.

### Opção 1: GitHub Pages (Recomendado e Nativo)
Como o código já estará versionado no GitHub, você pode usar o GitHub Pages para hospedar seu site de forma direta:
1. Vá até as **Settings** (Configurações) do seu repositório no GitHub.
2. Na barra lateral esquerda, clique em **Pages**.
3. Na seção *Build and deployment*, altere a origem para **Deploy from a branch**.
4. Selecione a branch `main` (ou `master`) e a pasta `/ (root)`.
5. Clique em **Save**. Em menos de 2 minutos, o GitHub fornecerá o link público do seu site!

### Opção 2: Vercel / Netlify
Para deploy instantâneo a cada `git push` com links de pré-visualização:
1. Conecte sua conta do GitHub na [Vercel](https://vercel.com).
2. Clique em **"Add New Project"** e selecione o repositório `VisaoComputacional`.
3. Mantenha as configurações padrão (Framework Preset: *Other*, Build Command: *vazio*, Output Directory: *vazio*).
4. Clique em **Deploy**. A Vercel gerará um subdomínio `.vercel.app` de carregamento ultra-rápido.
