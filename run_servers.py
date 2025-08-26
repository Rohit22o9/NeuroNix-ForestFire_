
import subprocess
import sys
import time
import threading

def run_main_server():
    """Run the main web server for frontend"""
    try:
        subprocess.run([sys.executable, 'main_server.py'], check=True)
    except KeyboardInterrupt:
        print("Main web server stopped")
    except Exception as e:
        print(f"Error running main server: {e}")

def run_ml_api():
    """Run the ML API server"""
    try:
        subprocess.run([sys.executable, 'ml_api.py'], check=True)
    except KeyboardInterrupt:
        print("ML API server stopped")
    except Exception as e:
        print(f"Error running ML API: {e}")

def run_alert_system():
    """Run the Alert System server"""
    try:
        subprocess.run([sys.executable, 'alert_system.py'], check=True)
    except KeyboardInterrupt:
        print("Alert System server stopped")
    except Exception as e:
        print(f"Error running Alert System: {e}")

def main():
    print("🚀 Starting NeuroNix Forest Fire Prediction System...")
    print("🌐 Main Dashboard will run on port 5000")
    print("📡 ML API will run on port 5001")
    print("📱 Alert System will run on port 5002")
    print("\nPress Ctrl+C to stop all servers\n")
    
    # Start main web server in a separate thread
    main_thread = threading.Thread(target=run_main_server, daemon=True)
    main_thread.start()
    
    # Wait a moment before starting other services
    time.sleep(2)
    
    # Start ML API in a separate thread
    ml_thread = threading.Thread(target=run_ml_api, daemon=True)
    ml_thread.start()
    
    # Wait a moment before starting alert system
    time.sleep(2)
    
    # Start Alert System in a separate thread
    alert_thread = threading.Thread(target=run_alert_system, daemon=True)
    alert_thread.start()
    
    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down all servers...")
        sys.exit(0)

if __name__ == '__main__':
    main()
