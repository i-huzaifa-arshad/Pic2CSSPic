const imageInput = document.getElementById("imageInput");
const sourcePreview = document.getElementById("sourcePreview");
const gridSizeInput = document.getElementById("gridSize");
const gridSizeValue = document.getElementById("gridSizeValue");
const pixelSizeInput = document.getElementById("pixelSize");
const pixelSizeValue = document.getElementById("pixelSizeValue");
const convertBtn = document.getElementById("convertBtn");
const cssPixelArt = document.getElementById("cssPixelArt");
const cssCode = document.getElementById("cssCode");
const copyBtn = document.getElementById("copyBtn");
const statusText = document.getElementById("statusText");

const canvas = document.createElement("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });

let loadedImage = null;

function updateStatus(message) {
  statusText.textContent = message;
}

function updateRangeLabels() {
  gridSizeValue.textContent = gridSizeInput.value;
  pixelSizeValue.textContent = pixelSizeInput.value;
}

function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    img.src = url;
  });
}

function getAverageColor(data, startX, startY, blockWidth, blockHeight, imageWidth) {
  let r = 0;
  let g = 0;
  let b = 0;
  let sampleCount = 0;

  for (let y = 0; y < blockHeight; y += 1) {
    for (let x = 0; x < blockWidth; x += 1) {
      const px = startX + x;
      const py = startY + y;
      const i = (py * imageWidth + px) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      sampleCount += 1;
    }
  }

  return `rgb(${Math.round(r / sampleCount)} ${Math.round(g / sampleCount)} ${Math.round(
    b / sampleCount
  )})`;
}

function generateCSSPixelArt() {
  if (!loadedImage || !context) {
    return;
  }

  const columns = Number(gridSizeInput.value);
  const pixelSize = Number(pixelSizeInput.value);
  const ratio = loadedImage.naturalHeight / loadedImage.naturalWidth;
  const rows = Math.max(1, Math.round(columns * ratio));

  canvas.width = loadedImage.naturalWidth;
  canvas.height = loadedImage.naturalHeight;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(loadedImage, 0, 0);

  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const blockWidth = Math.max(1, Math.floor(canvas.width / columns));
  const blockHeight = Math.max(1, Math.floor(canvas.height / rows));

  const shadows = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const startX = Math.min(col * blockWidth, canvas.width - blockWidth);
      const startY = Math.min(row * blockHeight, canvas.height - blockHeight);
      const color = getAverageColor(data, startX, startY, blockWidth, blockHeight, canvas.width);
      shadows.push(`${col * pixelSize}px ${row * pixelSize}px ${color}`);
    }
  }

  const width = columns * pixelSize;
  const height = rows * pixelSize;
  const css = `.css-pixel-art {
  width: ${pixelSize}px;
  height: ${pixelSize}px;
  box-shadow:
    ${shadows.join(",\n    ")};
}

.css-pixel-art-wrap {
  width: ${width}px;
  height: ${height}px;
}`;

  cssPixelArt.className = "css-pixel-art";
  cssPixelArt.style.setProperty("--pixel-size", `${pixelSize}px`);
  cssPixelArt.style.boxShadow = shadows.join(",");
  cssPixelArt.parentElement.style.width = `${Math.max(width + 32, 260)}px`;
  cssPixelArt.parentElement.style.height = `${Math.max(height + 32, 260)}px`;

  cssCode.value = css;
  copyBtn.disabled = false;
  updateStatus("CSS art generated. Copy the CSS and reuse anywhere.");
}

imageInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  updateStatus("Loading image...");
  try {
    loadedImage = await loadFileAsImage(file);
    sourcePreview.src = loadedImage.src;
    convertBtn.disabled = false;
    generateCSSPixelArt();
  } catch (_error) {
    updateStatus("Could not open that image. Try another file.");
  }
});

gridSizeInput.addEventListener("input", () => {
  updateRangeLabels();
  generateCSSPixelArt();
});

pixelSizeInput.addEventListener("input", () => {
  updateRangeLabels();
  generateCSSPixelArt();
});

convertBtn.addEventListener("click", generateCSSPixelArt);

copyBtn.addEventListener("click", async () => {
  if (!cssCode.value) {
    return;
  }

  try {
    if (window.electronAPI?.copyText) {
      await window.electronAPI.copyText(cssCode.value);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cssCode.value);
    } else {
      cssCode.select();
      document.execCommand("copy");
    }

    const oldText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    updateStatus("CSS copied to clipboard.");
    setTimeout(() => {
      copyBtn.textContent = oldText;
    }, 1200);
  } catch (_error) {
    updateStatus("Clipboard copy failed. Copy manually from the text box.");
  }
});

updateRangeLabels();
updateStatus("Upload an image to start.");
