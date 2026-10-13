---
title: Diabetic Retinopathy Detection
emoji: 👁️
colorFrom: blue
colorTo: green
sdk: gradio
sdk_version: 4.44.0
python_version: "3.10"
app_file: app.py
pinned: false
license: apache-2.0
short_description: AI-powered diabetic retinopathy detection using ResNet-50.
---

# Diabetic Retinopathy Detection

This application uses a trained ResNet-50 model to detect diabetic retinopathy from retinal fundus images.

## How to use:
1. Upload a retinal fundus image
2. Click submit to get the AI prediction
3. View the confidence scores for each class

The model can classify images as:
- Patient has Diabetic Retinopathy
- Patient does not have Diabetic Retinopathy
