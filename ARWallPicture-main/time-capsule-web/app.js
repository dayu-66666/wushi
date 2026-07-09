const screens = [...document.querySelectorAll(".screen")];
const goButtons = [...document.querySelectorAll("[data-go]")];
const uploadInput = document.querySelector("#uploadInput");
const cameraUploadInput = document.querySelector("#cameraUploadInput");
const nativeCameraInput = document.querySelector("#nativeCameraInput");
const captureButton = document.querySelector("#captureButton");
const cameraVideo = document.querySelector("#cameraVideo");
const cameraFallback = document.querySelector("#cameraFallback");
const selectedPhoto = document.querySelector("#selectedPhoto");
const processingPhoto = document.querySelector("#processingPhoto");
const beforeImage = document.querySelector("#beforeImage");
const afterImage = document.querySelector("#afterImage");
const afterWrap = document.querySelector("#afterWrap");
const compareRange = document.querySelector("#compareRange");
const roomTypeList = document.querySelector("#roomTypeList");
const styleList = document.querySelector("#styleList");
const startGenerate = document.querySelector("#startGenerate");
const processList = document.querySelector("#processList");
const progressBar = document.querySelector("#progressBar");
const resultTitle = document.querySelector("#resultTitle");
const schemeTabs = document.querySelector("#schemeTabs");
const furnitureList = document.querySelector("#furnitureList");
const regenerateButton = document.querySelector("#regenerateButton");
const saveButton = document.querySelector("#saveButton");
const toast = document.querySelector("#toast");
const toggleGuide = document.querySelector("#toggleGuide");
const guideFrame = document.querySelector(".guide-frame");

const fallbackBefore = "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=900&q=80";

const roomTypes = ["客厅", "卧室", "餐厅", "书房", "儿童房", "厨房"];

const styles = [
  {
    id: "modern",
    name: "现代简约",
    desc: "利落线条，中性色，适合大多数户型",
    swatch: "linear-gradient(135deg, #d8d7d2, #2f766f)",
    result: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "cream",
    name: "奶油风",
    desc: "柔和米白，圆润家具，温暖亲和",
    swatch: "linear-gradient(135deg, #f3eadc, #c99f73)",
    result: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "wood",
    name: "原木风",
    desc: "自然木色，轻松耐看，适合家庭居住",
    swatch: "linear-gradient(135deg, #e7d2b2, #7b5a3a)",
    result: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "nordic",
    name: "北欧风",
    desc: "明亮干净，低饱和配色，小户型友好",
    swatch: "linear-gradient(135deg, #e8eef0, #8aa0a8)",
    result: "https://images.unsplash.com/photo-1616137422495-1e9e46e2aa77?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "luxury",
    name: "轻奢风",
    desc: "金属细节，石材质感，更强调品质感",
    swatch: "linear-gradient(135deg, #e8dcc9, #9a784f)",
    result: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "wabi",
    name: "侘寂风",
    desc: "低调肌理，留白空间，氛围更安静",
    swatch: "linear-gradient(135deg, #d6d0c4, #82796c)",
    result: "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "vintage",
    name: "中古风",
    desc: "复古木作，皮革和暖色灯光",
    swatch: "linear-gradient(135deg, #c77f55, #3b332d)",
    result: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "italian",
    name: "意式极简",
    desc: "大体块家具，克制高级，适合改善型住宅",
    swatch: "linear-gradient(135deg, #c9c5bb, #2b3036)",
    result: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80"
  }
];

const schemes = [
  {
    name: "方案 A",
    suffix: "均衡",
    furniture: [["模块沙发", "米白布艺"], ["圆形茶几", "浅胡桃木"], ["地毯", "低饱和几何纹"], ["落地灯", "暖白光"]]
  },
  {
    name: "方案 B",
    suffix: "收纳",
    furniture: [["三人沙发", "细腿款"], ["电视柜", "整墙低柜"], ["边几", "可移动"], ["装饰画", "大尺寸抽象"]]
  },
  {
    name: "方案 C",
    suffix: "会客",
    furniture: [["L 型沙发", "围合布局"], ["组合茶几", "高低错落"], ["单椅", "强调色"], ["绿植", "角落补景"]]
  }
];

let currentScreen = "home";
let selectedRoom = roomTypes[0];
let selectedStyle = styles[0];
let selectedSchemeIndex = 0;
let selectedPhotoUrl = fallbackBefore;
let cameraStream = null;
let toastTimer = null;

renderChoices();
wireEvents();

function wireEvents() {
  goButtons.forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.go));
  });

  [uploadInput, cameraUploadInput, nativeCameraInput].forEach((input) => {
    input.addEventListener("change", () => handleImageFile(input.files?.[0]));
  });

  captureButton.addEventListener("click", captureFromCamera);
  startGenerate.addEventListener("click", runMockGeneration);
  regenerateButton.addEventListener("click", runMockGeneration);
  saveButton.addEventListener("click", () => showToast("已保存到方案库（Mock）"));
  compareRange.addEventListener("input", updateCompare);
  toggleGuide.addEventListener("click", () => guideFrame.classList.toggle("is-hidden"));
}

function showScreen(name) {
  currentScreen = name;
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });

  if (name === "capture") {
    startCamera();
  } else {
    stopCamera();
  }
}

function renderChoices() {
  roomTypeList.innerHTML = roomTypes.map((room) => `
    <button class="choice-pill ${room === selectedRoom ? "active" : ""}" type="button" data-room="${room}">
      ${room}
    </button>
  `).join("");

  styleList.innerHTML = styles.map((style) => `
    <button class="style-card ${style.id === selectedStyle.id ? "active" : ""}" type="button" data-style="${style.id}">
      <span class="style-swatch" style="--swatch: ${style.swatch}"></span>
      <span>
        <strong>${style.name}</strong>
        <span>${style.desc}</span>
      </span>
      <em aria-hidden="true"></em>
    </button>
  `).join("");

  roomTypeList.querySelectorAll("[data-room]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRoom = button.dataset.room;
      renderChoices();
    });
  });

  styleList.querySelectorAll("[data-style]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedStyle = styles.find((style) => style.id === button.dataset.style) || styles[0];
      renderChoices();
    });
  });
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia || cameraStream) return;

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    cameraVideo.srcObject = cameraStream;
    cameraVideo.style.display = "block";
    cameraFallback.style.display = "none";
  } catch {
    cameraVideo.style.display = "none";
    cameraFallback.style.display = "block";
    showToast("浏览器未开放摄像头，当前使用参考画面演示");
  }
}

function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
}

function captureFromCamera() {
  if (!cameraStream || !cameraVideo.videoWidth) {
    selectedPhotoUrl = fallbackBefore;
    syncPhotoPreview();
    showScreen("confirm");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
  selectedPhotoUrl = canvas.toDataURL("image/jpeg", 0.9);
  syncPhotoPreview();
  showScreen("confirm");
}

function handleImageFile(file) {
  if (!file) return;
  if (selectedPhotoUrl.startsWith("blob:")) URL.revokeObjectURL(selectedPhotoUrl);
  selectedPhotoUrl = URL.createObjectURL(file);
  syncPhotoPreview();
  showScreen("confirm");
}

function syncPhotoPreview() {
  selectedPhoto.src = selectedPhotoUrl;
  processingPhoto.src = selectedPhotoUrl;
  beforeImage.src = selectedPhotoUrl;
}

async function runMockGeneration() {
  showScreen("processing");
  progressBar.style.width = "0";
  [...processList.children].forEach((item) => {
    item.classList.remove("active", "done");
  });

  for (let index = 0; index < processList.children.length; index += 1) {
    const item = processList.children[index];
    item.classList.add("active");
    progressBar.style.width = `${(index / processList.children.length) * 100}%`;
    await wait(720);
    item.classList.remove("active");
    item.classList.add("done");
  }

  progressBar.style.width = "100%";
  await wait(260);
  selectedSchemeIndex = 0;
  renderResult();
  showScreen("result");
}

function renderResult() {
  const scheme = schemes[selectedSchemeIndex];
  resultTitle.textContent = `${selectedStyle.name} · ${scheme.suffix}`;
  afterImage.src = selectedStyle.result;
  updateCompare();

  schemeTabs.innerHTML = schemes.map((item, index) => `
    <button class="${index === selectedSchemeIndex ? "active" : ""}" type="button" data-scheme="${index}">
      ${item.name}
    </button>
  `).join("");

  schemeTabs.querySelectorAll("[data-scheme]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSchemeIndex = Number(button.dataset.scheme);
      renderResult();
    });
  });

  furnitureList.innerHTML = scheme.furniture.map(([name, desc]) => `
    <li><span>${name}</span><strong>${desc}</strong></li>
  `).join("");
}

function updateCompare() {
  afterWrap.style.width = `${compareRange.value}%`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
