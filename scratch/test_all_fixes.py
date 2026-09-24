import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
from app import app

client = app.test_client()

print("--- TEST 1: Admin Login, Status & Logout ---")
login_res = client.post("/api/admin/login", json={"username": "admin", "password": "hehenewpassword@123"})
print("Admin login status:", login_res.status_code, login_res.get_json())
assert login_res.status_code == 200 and login_res.get_json().get("success")

status_res = client.get("/api/admin/status")
print("Admin status:", status_res.status_code, status_res.get_json())
assert status_res.get_json().get("authenticated") is True

logout_res = client.post("/api/admin/logout")
print("Admin logout status:", logout_res.status_code, logout_res.get_json())
assert logout_res.get_json().get("success") is True

status_after = client.get("/api/admin/status")
print("Admin status after logout:", status_after.status_code, status_after.get_json())
assert status_after.get_json().get("authenticated") is False

print("\n--- TEST 2: Team Messages ---")
msg_res = client.get("/api/teams/1/messages?r_id=R44456")
data = msg_res.get_json()
print("Messages status:", msg_res.status_code, "Count:", len(data.get("messages", [])))
assert msg_res.status_code == 200 and data.get("success") is True

post_res = client.post("/api/teams/1/messages", json={"message": "Automated verification message", "r_id": "R44456"})
pdata = post_res.get_json()
print("Post message status:", post_res.status_code, "Success:", pdata.get("success"))
assert post_res.status_code == 200 and pdata.get("success") is True

print("\n--- TEST 3: PYQ Smart Tokenized Search ---")
test_queries = ["python 2025", "discrete math", "dbms", "cyber", "ai", "machine learning"]
for q in test_queries:
    res = client.get(f"/api/pyqs?q={q}")
    p_data = res.get_json()
    count = p_data.get("total", 0)
    print(f"Query '{q}' -> found {count} results")
    assert res.status_code == 200
    assert count > 0, f"Expected papers for '{q}' but got 0"

print("\nALL BACKEND TESTS PASSED PERFECTLY!")
