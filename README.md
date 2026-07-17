# 🌌 VisionHub

> Um portal interativo de Criatividade Computacional por Visão, rodando inteiramente no navegador com Inteligência Artificial local na GPU/CPU.

O **VisionHub** é uma aplicação web portátil, leve e de alta performance que demonstra o uso de modelos de visão computacional (detecção facial e rastreamento de mãos) para interações digitais inovadoras, sem a necessidade de processamento em servidores externos ou chaves de API.

---

## 🚀 Módulos do Sistema

### 1. 👤 Espelho Inteligente + Filtros AR
Uma interface de espelho digital que analisa características do rosto do usuário e projeta filtros interativos em tempo real.
* **Malha Facial:** Renderização cibernética de 68 pontos fiduciais do rosto.
* **Detecção de Emoções:** Classifica e exibe a distribuição de 7 emoções com barras de progresso dinâmicas.
* **Idade e Gênero:** Estimativa com probabilidade de acerto.
* **Filtros de Realidade Aumentada (AR):**
  * **Visor Cyberpunk:** Retângulo neon ciano semi-transparente sobre os olhos, com scanlines, marcador lateral e texto digital HUD.
  * **Chifres Neon:** Dois chifres magenta de neon brilhante posicionados e rotacionados automaticamente acima das sobrancelhas.
  * **Nariz de Palhaço Interativo:** Nariz vermelho com efeito "honk" de ondas sonoras que cresce e pisca quando o usuário abre a boca.
  * **Bigode Cyber:** Um bigode neon amarelo desenhado sobre o lábio superior que se inclina conforme a rotação do rosto.

### 2. 🎨 Pintura Aérea (Air Canvas)
Um quadro virtual interativo avançado que permite ao usuário pintar no ar com gestos.
* **Rastreamento de Mão:** Rastreia e projeta o esqueleto da mão (21 pontos) em neon ciano e rosa.
* **Gesto de Pinça:** Una o polegar ao indicador para desenhar. Afaste os dedos para mover o cursor (como um cursor normal).
* **Modo Borracha:** Apaga traços desenhados utilizando o dedo indicador (representado por um cursor tracejado).
* **Pincel Arco-Íris:** Modo de cor dinâmica que varia continuamente ao longo do espectro HSL enquanto desenha.
* **Desfazer (Undo):** Histórico interno de 20 passos que permite remover o último traço desenhado.
* **Exportação:** Salva sua arte diretamente no computador como arquivo PNG de alta definição sobre um fundo escuro premium.

### 3. 🎵 Sintetizador por Gestos (Air Synth)
Um instrumento musical aéreo inspirado no Theremin com suporte harmônico e efeitos.
* **Síntese Web Audio:** Geração de ondas senoidais, triangulares, dente de serra e quadradas diretamente no browser.
* **Controle Aéreo:** Movimento X modula a nota (120Hz a 1200Hz) e o movimento Y modula o volume (ganho).
* **Modo de Notas (Escalas):** 
  * **Livre:** Modo Theremin clássico sem afinação.
  * **Pentatônica (Dó):** Trava a frequência nas notas da escala Pentatônica Maior de Dó, garantindo que qualquer melodia saia harmoniosa.
  * **Maior (Dó):** Trava a frequência nas notas da escala Maior diatônica de Dó.
* **Efeito Delay (Eco):** Nó de atraso conectado na Web Audio API que gera ecologias de som reguláveis com feedback de 45%.
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
