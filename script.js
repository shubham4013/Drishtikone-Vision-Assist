const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const output = document.getElementById("output");

const snapshotBtn = document.getElementById("snapshotBtn");
const voiceBtn = document.getElementById("voiceBtn");
const manualDetectBtn = document.getElementById("manualDetectBtn");
const startAutoDetectBtn = document.getElementById("startAutoDetectBtn");
const stopAutoDetectBtn = document.getElementById("stopAutoDetectBtn");

let autoDetectInterval = null;

// Start webcam
startBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    console.log("✅ Webcam started");
  } catch (error) {
    alert("Could not access the webcam. Please allow camera permissions.");
    console.error(error);
  }
});

// One-time detection
async function runDetectionOnce() {
  if (video.readyState < 2) {
    console.log("Video not ready yet for detection");
    return;
  }

  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg"));
  const formData = new FormData();
  formData.append("image", blob, "frame.jpg");

  output.innerText = "Detecting...";

  try {
    const res = await fetch("http://127.0.0.1:5000/detect", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    narrateDetection(data);
  } catch (err) {
    console.error("Detection failed:", err);
    output.innerText = "Error during detection.";
  }
}

// Narration logic
function narrateDetection(data) {
  const frameWidth = video.videoWidth;

  if (!data.detections || data.detections.length === 0) {
    output.innerText = "Kuch bhi nahi mila.";
    const utteranceNone = new SpeechSynthesisUtterance("Kuch bhi nahi mila.");
    utteranceNone.lang = "hi-IN";
    speechSynthesis.speak(utteranceNone);
    return;
  }

  let hindiObjects = data.detections
    .map((d) => {
      const [x1, y1, x2, y2] = d.box;
      const centerX = (x1 + x2) / 2;
      const width = x2 - x1;

      let direction = "aage";
      if (centerX < frameWidth * 0.33) direction = "left mein";
      else if (centerX > frameWidth * 0.66) direction = "right mein";

      let proximity = "door";
      if (width > frameWidth * 0.25) proximity = "nazdeek";

      let label = d.label;
      switch (label) {
        case "person":
          label = "vyakti";
          break;
        case "car":
          label = "gaadi";
          break;
        case "bottle":
          label = "botal";
          break;
        case "chair":
          label = "kursi";
          break;
        case "cell phone":
          label = "mobile phone";
          break;
        case "dog":
          label = "kutta";
          break;
        case "cat":
          label = "billi";
          break;
        default:
          label = d.label;
      }

      return `ek ${label} ${direction}, ${proximity}`;
    })
    .join(", ");

  const hindiSentence = `Aapke saamne ${hindiObjects} hai.`;

  output.innerText = hindiSentence;

  const utterance = new SpeechSynthesisUtterance(hindiSentence);
  utterance.lang = "hi-IN";
  speechSynthesis.speak(utterance);
}

// Auto detection loop
function startAutoDetect() {
  if (autoDetectInterval) {
    console.log("Auto detect already running");
    return;
  }
  console.log("Starting auto detect");
  runDetectionOnce();
  autoDetectInterval = setInterval(runDetectionOnce, 15000); // Every 15 seconds
}

function stopAutoDetect() {
  if (!autoDetectInterval) {
    console.log("Auto detect not running");
    return;
  }
  clearInterval(autoDetectInterval);
  autoDetectInterval = null;
  console.log("Auto detect stopped");
}

// Snapshot
function takeSnapshot() {
  if (video.readyState < 2) {
    alert("Video not ready for snapshot");
    return;
  }

  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const link = document.createElement("a");
  canvas.toBlob((blob) => {
    link.href = URL.createObjectURL(blob);
    link.download = "snapshot.jpg";
    link.click();
  }, "image/jpeg");
}

// Voice command input
let recognition;
let isListening = false;

voiceBtn.addEventListener("click", () => {
  if (isListening) {
    recognition.stop();
    isListening = false;
    voiceBtn.innerText = "🎤 Start Voice Command";
    console.log("Voice recognition stopped manually");
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "hi-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;

  recognition.onstart = () => {
    isListening = true;
    voiceBtn.innerText = "🛑 Stop Voice Command";
    console.log("🎤 Voice recognition started");
  };

  recognition.onresult = (event) => {
    let transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim()
        .replace(/[.,!?]/g, ""); // remove punctuation
    
    console.log("Voice input:", transcript);
    output.innerText = `Aapne kaha: "${transcript}"`;

    // Snapshot
    if (
        transcript.includes("tasveer lo") || 
        transcript.includes("tasvir lo") ||
        transcript.includes("तस्वीर लो") ||
        transcript.includes("Capture") ||
        transcript.includes("Snapshot") ||
        transcript.includes("तस्वीर")
    ) {
        takeSnapshot();
    }

    // Emergency
    else if (
        transcript.includes("madad chahiye") || 
        transcript.includes("madad karo") || 
        transcript.includes("मदद चाहिए")
    ) {
        alert("🚨 Madad bulayi gayi!");
    }

    // One-time detect
    else if (
      
        transcript.includes("detect") ||
        transcript.includes("kya hai") ||
        transcript.includes("aage kya hai") ||
        transcript.includes("क्या है") ||
        transcript.includes("डिटेक्ट") ||
        transcript.includes("आगे क्या है")
    ) {
        runDetectionOnce();
    }

    // Stop auto detect
    else if (
        transcript.includes("band karo") || 
        transcript.includes("stop") ||
        transcript.includes("स्टॉप") ||
        transcript.includes("बंद करो")
    ) {
        stopAutoDetect();
        recognition.stop();
    }

    // Start auto detect
    else if (
        transcript.includes("chalu karo") || 
        transcript.includes("start") || 
        transcript.includes("चालू करो") ||
        transcript.includes("स्टार्ट") ||
        transcript.includes("Auto Detect")
    ) {
        startAutoDetect();
    }
};


  recognition.onerror = (e) => {
    console.error("Voice command error:", e.error);
    output.innerText = "Voice command failed.";
  };

  recognition.onend = () => {
    console.log("Voice recognition ended");
    if (isListening) {
      recognition.start(); // restart automatically if still in listening mode
    }
  };

  recognition.start();
});

// Button click bindings with preventDefault
snapshotBtn.addEventListener("click", (e) => {
  e.preventDefault();
  takeSnapshot();
});
manualDetectBtn.addEventListener("click", (e) => {
  e.preventDefault();
  runDetectionOnce();
});
startAutoDetectBtn.addEventListener("click", (e) => {
  e.preventDefault();
  startAutoDetect();
});
stopAutoDetectBtn.addEventListener("click", (e) => {
  e.preventDefault();
  stopAutoDetect();
});
