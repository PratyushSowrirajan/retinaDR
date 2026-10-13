import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import gradio as gr
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import base64
import io
import numpy as np

# Load model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

import torchvision.models as models
model = models.resnet50(weights=None)
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, 2)

model.load_state_dict(torch.load("resnet50_trained.pth", map_location=device))
model.to(device)
model.eval()

# Preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

class_labels = ["Patient has Diabetic Retinopathy", 
                "Patient does not have Diabetic Retinopathy"]

# Prediction function for Gradio
def predict_gradio(image):
    image = image.convert("RGB")
    image = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.softmax(outputs, dim=1)
        _, predicted = torch.max(outputs, 1)
        result = class_labels[predicted.item()]
    return {class_labels[0]: float(probabilities[0][0]),
            class_labels[1]: float(probabilities[0][1])}

# Prediction function for Flask API
def predict_flask(image):
    try:
        image = image.convert("RGB")
        image = transform(image).unsqueeze(0).to(device)
        with torch.no_grad():
            outputs = model(image)
            probabilities = torch.softmax(outputs, dim=1)
            _, predicted = torch.max(outputs, 1)
            result = class_labels[predicted.item()]
            confidence = float(probabilities[0][predicted.item()])
        
        return {
            "prediction": result,
            "confidence": confidence,
            "probabilities": {
                class_labels[0]: float(probabilities[0][0]),
                class_labels[1]: float(probabilities[0][1])
            },
            "status": "success"
        }
    except Exception as e:
        return {
            "error": str(e),
            "status": "error"
        }

# Flask app for API
flask_app = Flask(__name__)
CORS(flask_app)  # Enable CORS for all routes

@flask_app.route('/api/predict', methods=['POST'])
def api_predict():
    try:
        # Handle different input formats
        if 'file' in request.files:
            # File upload
            file = request.files['file']
            image = Image.open(file.stream)
        elif request.json and 'image' in request.json:
            # Base64 image
            image_data = request.json['image']
            if image_data.startswith('data:image'):
                # Remove data URL prefix
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        else:
            return jsonify({"error": "No image provided"}), 400
        
        result = predict_flask(image)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e), "status": "error"}), 500

@flask_app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "message": "DR Detection API is running"})

# Gradio interface
demo = gr.Interface(
    fn=predict_gradio,
    inputs=gr.Image(type="pil"),
    outputs=gr.Label(),
    title="Diabetic Retinopathy Detection",
    description="Upload a retinal image to check if the patient has Diabetic Retinopathy. Also available via API at /api/predict"
)

# Function to run Flask in a separate thread
def run_flask():
    flask_app.run(host="0.0.0.0", port=7861, debug=False)

if __name__ == "__main__":
    # Start Flask API in background thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    print("Starting Diabetic Retinopathy Detection System...")
    print("Gradio Interface: Available on main port")
    print("Flask API: Running on port 7861")
    print("API Endpoints:")
    print("  - POST /api/predict (for predictions)")
    print("  - GET /api/health (for health check)")
    
    # Start Gradio interface
    demo.launch(server_name="0.0.0.0", server_port=7860, share=False)
