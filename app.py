from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load YOLOv8 model
model = YOLO("yolov8n.pt")  # You can use yolov8s.pt, etc. for better accuracy

@app.route("/detect", methods=["POST"])
def detect():
    file = request.files['image']
    img_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)

    results = model(img)[0]
    detections = []
    
    for box in results.boxes:
        cls_id = int(box.cls[0])
        label = model.names[cls_id]
        conf = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        detections.append({
            "label": label,
            "confidence": round(conf, 2),
            "box": [x1, y1, x2, y2]
        })

    return jsonify({"detections": detections})

if __name__ == "__main__":
    app.run(debug=True)
