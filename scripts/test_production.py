#!/usr/bin/env python3
"""Production API test for SMS Platform"""
import urllib.request, json, ssl

ctx = ssl.create_default_context()
BASE = "https://twiliosmstest.vibeadd.com"

def api(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            raw = r.read()
            try:
                return r.status, json.loads(raw)
            except:
                return r.status, raw.decode()[:200]
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except:
            return e.code, raw.decode()[:200] if raw else "empty"
    except Exception as e:
        return 0, str(e)

# Login
s, d = api("POST", "/api/auth/login", {"email": "admin@twiliosms.demo", "password": "r9ghGm7zCtcCFyNj"})
token = d.get("token", "")
print(f"1. Login: {s} - {'OK' if token else 'FAIL'}")

# All endpoints (using actual routes from the codebase)
tests = [
    ("GET", "/api/health", "Health", False),
    ("GET", "/api/dashboard/stats", "Dashboard stats", True),
    ("GET", "/api/dashboard/diagnostics", "Dashboard diagnostics", True),
    ("GET", "/api/campaigns?page=1&limit=5", "Campaigns list", True),
    ("GET", "/api/leads?page=1&limit=5", "Leads list", True),
    ("GET", "/api/inbox?page=1&limit=5", "Inbox conversations", True),
    ("GET", "/api/pipeline/stages", "Pipeline stages", True),
    ("GET", "/api/numbers", "Numbers list", True),
    ("GET", "/api/numbers/assignments", "Number assignments", True),
    ("GET", "/api/numbers/pools", "Number pools", True),
    ("GET", "/api/settings/settings", "Settings", True),
    ("GET", "/api/automation/rules", "Automation rules", True),
    ("GET", "/api/analytics/overview?period=7d", "Analytics overview", True),
    ("GET", "/api/analytics/campaigns", "Analytics campaigns", True),
    ("GET", "/api/auth/me", "Auth me (profile)", True),
    ("GET", "/api/auth/users", "Auth users list", True),
    ("GET", "/api/socket.io/?EIO=4&transport=polling", "Socket.IO handshake", False),
]

ok_count = 0
fail_count = 0
for method, path, name, auth in tests:
    use_token = token if auth else None
    s, d = api(method, path, token=use_token)
    is_ok = 200 <= s < 300
    status = "OK" if is_ok else f"FAIL({s})"
    if is_ok:
        ok_count += 1
    else:
        fail_count += 1
    detail = ""
    if isinstance(d, dict):
        if "total" in d: detail = f"total={d['total']}"
        elif "overview" in d: detail = f"has overview"
        elif "status" in d: detail = f"status={d['status']}"
        elif "error" in d: detail = f"error={d['error']}"
        elif "conversations" in d: detail = f"conversations={d['conversations'] if isinstance(d['conversations'],int) else len(d['conversations'])}"
        elif "numbers" in d: detail = f"numbers={d['numbers'] if isinstance(d['numbers'],int) else len(d['numbers'])}"
        elif "stages" in d: detail = f"stages={d['stages'] if isinstance(d['stages'],int) else len(d['stages'])}"
        elif "rules" in d: detail = f"rules={d['rules'] if isinstance(d['rules'],int) else len(d['rules'])}"
        else: detail = f"keys={list(d.keys())[:6]}"
    elif isinstance(d, list):
        detail = f"items={len(d)}"
    elif isinstance(d, str):
        detail = d[:80]
    print(f"  {name}: {status} - {detail}")

print(f"\n=== RESULTS: {ok_count}/{ok_count+fail_count} API endpoints OK, {fail_count} failed ===")
