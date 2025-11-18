import requests, time

BASE_URL = "http://127.0.0.1:8000"

def check_server():
    try:
        r = requests.get(f"{BASE_URL}/docs", timeout=5)
        if r.status_code == 200:
            print("✅ Server is up and serving /docs")
            return True
    except Exception as e:
        print("❌ Cannot reach backend:", e)
    return False

def run_pipeline():
    payload = {
        "protein_name": "APOE",
        "query": "What is the role of APOE in aging?",
        "batch_size": 5,   # very small test
        "top_k": 5
    }
    print("🚀 Triggering /index/run_all ...")
    try:
        resp = requests.post(f"{BASE_URL}/index/run_all", json=payload, timeout=600)
        print("✅ Pipeline completed:")
        print(resp.json())
    except requests.exceptions.ReadTimeout:
        print("⚠️ Still running (long task, no streaming). Check backend logs.")
    except Exception as e:
        print("❌ Error running pipeline:", e)

def run_smaller_steps():
    print("🧪 Step 1: Harvest")
    try:
        resp = requests.post(f"{BASE_URL}/harvest/APOE", params={"limit": 5}, timeout=120)
        print("✅ Harvest response:", resp.json())
    except Exception as e:
        print("❌ Harvest failed:", e)
        return
    time.sleep(2)
    
    print("🧪 Step 2: Index small batch")
    try:
        resp = requests.post(f"{BASE_URL}/index/faiss_batch", json={"limit": 10, "offset": 0}, timeout=300)
        print("✅ Index batch response:", resp.json())
    except Exception as e:
        print("❌ Index batch failed:", e)

if __name__ == "__main__":
    print("=== Developer-style verification ===")
    if not check_server():
        exit()
    # choose one:
    # run_smaller_steps()  # to test individual endpoints
    run_pipeline()         # to test full orchestration
