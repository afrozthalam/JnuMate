import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
from app import app, get_db

client = app.test_client()

print("=== 1. Testing Auth Send OTP for Admin Detection ===")
res = client.post("/api/auth/send-otp", json={"r_id": "admin"})
print("Status:", res.status_code)
data = res.get_json()
print("Response:", data)
assert res.status_code == 200
assert data.get("is_admin") is True
print("PASS: Admin detected from regular login endpoint!")

print("\n=== 2. Testing Admin Login with Standard Password ===")
res = client.post("/api/admin/login", json={"username": "admin", "password": "hehenewpassword@123"})
print("Status:", res.status_code)
data = res.get_json()
print("Response:", data)
assert res.status_code == 200
assert data.get("success") is True
print("PASS: Admin login successful!")

print("\n=== 3. Testing Admin Status ===")
res = client.get("/api/admin/status")
data = res.get_json()
print("Admin Status:", data)
assert data.get("authenticated") is True
print("PASS: Admin session authenticated!")

print("\n=== 4. Testing Admin Teams Listing ===")
res = client.get("/api/admin/teams")
data = res.get_json()
print("Teams count:", len(data.get("teams", [])))
assert data.get("success") is True
teams = data.get("teams", [])
print("PASS: Admin teams endpoint works!")

print("\n=== 5. Testing Admin Users Listing ===")
res = client.get("/api/admin/users")
data = res.get_json()
print("Users response:", data)
print("Users count:", len(data.get("users", [])))
assert data.get("success") is True
users = data.get("users", [])
print("PASS: Admin users endpoint works!")

# If there is at least one team, test team messaging, updating and user activity
team_id = teams[0]["id"] if teams else 1
print(f"\n=== 6. Testing Team Chat Message Posting on Team #{team_id} ===")
msg_res = client.post(f"/api/teams/{team_id}/messages", json={
    "r_id": "R44456",
    "message": "Automated verification message from test suite!"
})
print("Message post status:", msg_res.status_code)
msg_data = msg_res.get_json()
print("Message post response:", msg_data)
assert msg_res.status_code == 200
assert msg_data.get("success") is True
print("PASS: Team message posted successfully without any errors!")

print("\n=== 7. Testing Admin User Activity Drill-Down for R44456 ===")
act_res = client.get("/api/admin/users/R44456/activity")
act_data = act_res.get_json()
print("Activity response keys:", list(act_data.keys()))
assert act_data.get("success") is True
assert "student" in act_data
assert "activity" in act_data
act = act_data["activity"]
print("Teams led:", len(act.get("teams_led", [])))
print("Teams joined:", len(act.get("teams_joined", [])))
print("Join requests:", len(act.get("join_requests_sent", [])))
print("Chat messages:", len(act.get("chat_messages", [])))
print("OTP log:", len(act.get("otp_log", [])))
print("PASS: Admin user activity drill-down works!")

print("\n=== 8. Testing Admin Team Update ===")
if teams:
    target_team = teams[0]
    update_res = client.put(f"/api/admin/teams/{target_team['id']}", json={
        "name": target_team["name"] + " (Verified)",
        "hackathon_type": target_team["hackathon_type"],
        "team_size": target_team["team_size"],
        "problem_statement": "Updated problem statement for testing",
        "tags": "AI, ML, Python"
    })
    print("Update status:", update_res.status_code)
    update_data = update_res.get_json()
    print("Update response:", update_data)
    assert update_res.status_code == 200
    assert update_data.get("success") is True
    print("PASS: Admin team update works!")

print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")
