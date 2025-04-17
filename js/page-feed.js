// ---------- Referências aos elementos do DOM ----------
const uploadInput     = document.getElementById('upload');
const outputContainer = document.getElementById('outputContainer');
const downloadAllBtn  = document.getElementById('downloadAll');

// ---------- Função principal de renderização ----------
/**
 * Cria um card com canvas redimensionado e botão de download.
 *
 * @param {Object} params
 * @param {number} params.width             largura do canvas
 * @param {number} params.height            altura do canvas
 * @param {HTMLImageElement} params.image   imagem carregada
 * @param {string} params.fileName          nome original do arquivo
 * @param {'f'|'s'} params.suffix           'f' para Feed, 's' para Story
 * @param {number|null} params.imageOnTopWidth   largura fixa da imagem nítida (opcional)
 * @param {number|null} params.imageOnTopHeight  altura fixa da imagem nítida (opcional)
 * @returns {HTMLElement}                   card montado
 */
function renderCanvas({ width, height, image, fileName, suffix, imageOnTopWidth = null, imageOnTopHeight = null }) {
  const card = document.createElement('div');
  card.className = 'card';

  // Título atualizado para Feed 1080×1350 ou Story 1080×1920
  const title = document.createElement('h3');
  title.textContent = suffix === 'f'
    ? 'Feed (1080×1350)'
    : 'Story (1080×1920)';
  card.appendChild(title);

  // Cria e configura o canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // ===== Fundo com blur =====
  const aspectRatio = image.width / image.height;
  let bgWidth  = width;
  let bgHeight = bgWidth / aspectRatio;
  let bgX = 0;
  let bgY = (height - bgHeight) / 2;
  if (bgHeight < height) {
    bgHeight = height;
    bgWidth  = bgHeight * aspectRatio;
    bgX = (width - bgWidth) / 2;
    bgY = 0;
  }
  ctx.save();
  ctx.filter = 'blur(25px)';
  ctx.drawImage(image, bgX, bgY, bgWidth, bgHeight);
  ctx.restore();

  // ===== Imagem nítida por cima =====
  const fgAspect = image.width / image.height;
  let drawW = imageOnTopWidth || width;
  let drawH = drawW / fgAspect;
  if (imageOnTopHeight) {
    drawH = imageOnTopHeight;
    drawW = drawH * fgAspect;
  }
  const posX = (width - drawW) / 2;
  const posY = (height - drawH) / 2;
  ctx.drawImage(image, posX, posY, drawW, drawH);

  card.appendChild(canvas);

  // Botão de download individual
  const btn = document.createElement('button');
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  btn.textContent = `Baixar ${suffix === 'f' ? 'Feed' : 'Story'}`;
  btn.onclick = () => {
    const link = document.createElement('a');
    link.download = `${baseName}${suffix}.jpg`;
    link.href = canvas.toDataURL('image/jpeg');
    link.click();
  };
  card.appendChild(btn);

  return card;
}

// ---------- Evento: seleção de arquivos ----------
uploadInput.addEventListener('change', async () => {
  outputContainer.innerHTML = '';

  // Valida apenas JPEG/PNG e ordena alfabeticamente
  const files = Array.from(uploadInput.files)
    .filter(f => ['image/jpeg','image/png'].includes(f.type))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));

  // Carrega as imagens em paralelo
  const imagesData = await Promise.all(files.map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => resolve({ fileName: file.name, image: img });
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  })));

  // Renderiza Feed e Story para cada imagem
  imagesData.forEach(({ fileName, image }) => {
    // Feed agora 1080×1350
    outputContainer.appendChild(
      renderCanvas({ width: 1080, height: 1350, image, fileName, suffix: 'f', imageOnTopHeight: 1350 })
    );
    // Story permanece 1080×1920
    outputContainer.appendChild(
      renderCanvas({ width: 1080, height: 1920, image, fileName, suffix: 's', imageOnTopWidth: 1080 })
    );
  });
});

// ---------- Evento: baixar todas as imagens ===========
downloadAllBtn.addEventListener('click', async () => {
  if (uploadInput.files.length === 0) {
    alert('Nenhuma imagem selecionada. Faça upload antes de baixar.');
    return;
  }

  const zip = new JSZip();
  const canvases = document.querySelectorAll('canvas');

  // Mostra spinner
  const buttonIcon = downloadAllBtn.querySelector('svg');
  downloadAllBtn.innerHTML = '<div class="spinner"></div>';
  downloadAllBtn.disabled = true;

  // Empacota cada canvas
  canvases.forEach((canvas, idx) => {
    const data = canvas.toDataURL('image/jpeg').split(',')[1];
    const suffix = idx % 2 === 0 ? 'f' : 's';
    const fileIndex = Math.floor(idx / 2);
    const originalName = uploadInput.files[fileIndex].name.replace(/\.[^/.]+$/, '');
    zip.file(`${originalName}${suffix}.jpg`, data, { base64: true });
  });

  // Gera e dispara download do ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'imagens.zip';
  link.click();

  // Restaura botão
  setTimeout(() => {
    downloadAllBtn.innerHTML = '';
    downloadAllBtn.appendChild(buttonIcon);
    downloadAllBtn.append(' Baixar todos');
    downloadAllBtn.disabled = false;
  }, 1000);
});
