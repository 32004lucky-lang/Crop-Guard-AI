import sys
import subprocess
from pathlib import Path
import os
import shutil
import webbrowser
import threading
import time

# Resolve paths
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# 1. Check/Install dependencies from requirements.txt automatically
try:
    import flask
    import flask_cors
    import dotenv
    import PIL
except ImportError:
    print("Required packages are missing. Attempting to install them from requirements.txt...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("Packages installed successfully!")
    except Exception as e:
        print(f"Warning: Failed to install packages automatically: {e}")
        print("Please ensure your virtual environment is active and run: pip install -r requirements.txt")

# 2. Copy .env.example to .env if not exists
env_file = BASE_DIR / ".env"
env_example = BASE_DIR / ".env.example"
if not env_file.exists() and env_example.exists():
    try:
        shutil.copy(env_example, env_file)
        print("Created .env file from .env.example")
    except Exception as e:
        print(f"Warning: Could not create .env file: {e}")

# 3. Ensure DB exists and is seeded
db_path = BASE_DIR / "instance" / "cropguard.db"
if not db_path.exists() or db_path.stat().st_size < 5000:
    print("Database not found or unseeded. Seeding database...")
    try:
        subprocess.run([sys.executable, "scripts/seed.py"], check=True)
        print("Database seeded successfully.")
    except Exception as e:
        print(f"Warning: Database seeding failed: {e}")

# 4. Import the Flask application
try:
    from backend.app import app
except Exception as e:
    print(f"Critical Error importing backend app: {e}")
    sys.exit(1)

# 5. Open browser automatically
def open_browser():
    time.sleep(1.5)
    url = f"http://127.0.0.1:{os.getenv('PORT', 8000)}"
    print(f"\n=======================================================")
    print(f" CropGuard AI Server is up! Opening web interface...")
    print(f" URL: {url}")
    print(f"=======================================================\n")
    webbrowser.open(url)

if __name__ == "__main__":
    # Start browser in a daemon thread so it doesn't block startup
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run the application
    port = int(os.getenv("PORT", 8000))
    app.run(debug=True, host="0.0.0.0", port=port)
