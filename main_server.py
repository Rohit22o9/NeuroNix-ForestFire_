
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='.')
CORS(app)

@app.route('/')
def index():
    """Serve the main dashboard"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files (CSS, JS, etc.)"""
    return send_from_directory('.', filename)

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'NeuroNix Forest Fire Prediction System',
        'services': {
            'main_dashboard': 'running',
            'ml_api': 'port 5001',
            'alert_system': 'port 5002'
        }
    })

if __name__ == '__main__':
    print("🌐 Starting NeuroNix Main Dashboard on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
