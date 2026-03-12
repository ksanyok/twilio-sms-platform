import requests

ACCOUNT_SID = "AC20b8b8e9f1c3dad7910b4d32d8c6c672"
AUTH_TOKEN = "cb26edca7d49ea222123f61462b6866c"
auth = (ACCOUNT_SID, AUTH_TOKEN)

PHONE_SID = "PNe389d5e2552fe96178a544325db72ce2"
OLD_MS_SID = "MG9884053997bcd3b9c9ac054def6e9680"
NEW_MS_SID = "MG48c7bd2baa8c738b9a19c910fea22903"
WEBHOOK_BASE = "https://twiliosmstest.vibeadd.com"

# Step 1: Fix SMS Webhook URL on the phone number
print("=" * 70)
print("STEP 1: Update phone number webhook URLs")
print("=" * 70)
r = requests.post(
    f"https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/IncomingPhoneNumbers/{PHONE_SID}.json",
    auth=auth,
    data={
        "SmsUrl": f"{WEBHOOK_BASE}/api/webhooks/twilio/inbound",
        "SmsMethod": "POST",
        "StatusCallback": f"{WEBHOOK_BASE}/api/webhooks/twilio/status",
        "StatusCallbackMethod": "POST",
    }
)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    pn = r.json()
    print(f"  SMS URL: {pn.get('sms_url')}")
    print(f"  Status callback: {pn.get('status_callback')}")
    print("  OK!")
else:
    print(f"  ERROR: {r.text[:300]}")

# Step 2: Remove phone from old messaging service
print()
print("=" * 70)
print("STEP 2: Remove phone from SCL Outbound Engine")
print("=" * 70)
r = requests.delete(
    f"https://messaging.twilio.com/v1/Services/{OLD_MS_SID}/PhoneNumbers/{PHONE_SID}",
    auth=auth
)
print(f"  Status: {r.status_code}")
if r.status_code == 204:
    print("  Removed OK!")
elif r.status_code == 404:
    print("  Already not in this service")
else:
    print(f"  Response: {r.text[:300]}")

# Step 3: Add phone to correct messaging service (Low Volume Mixed with A2P campaign)
print()
print("=" * 70)
print("STEP 3: Add phone to Low Volume Mixed (A2P verified)")
print("=" * 70)
r = requests.post(
    f"https://messaging.twilio.com/v1/Services/{NEW_MS_SID}/PhoneNumbers",
    auth=auth,
    data={"PhoneNumberSid": PHONE_SID}
)
print(f"  Status: {r.status_code}")
if r.status_code in (200, 201):
    data = r.json()
    print(f"  Phone: {data.get('phone_number')}")
    print(f"  Service SID: {data.get('service_sid')}")
    print("  Added OK!")
else:
    print(f"  Response: {r.text[:300]}")

# Step 4: Configure Messaging Service webhooks
print()
print("=" * 70)
print("STEP 4: Configure Messaging Service webhooks")
print("=" * 70)
r = requests.post(
    f"https://messaging.twilio.com/v1/Services/{NEW_MS_SID}",
    auth=auth,
    data={
        "InboundRequestUrl": f"{WEBHOOK_BASE}/api/webhooks/twilio/inbound",
        "InboundMethod": "POST",
        "StatusCallback": f"{WEBHOOK_BASE}/api/webhooks/twilio/status",
        "UseInboundWebhookOnNumber": "false",
    }
)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    ms = r.json()
    print(f"  Inbound URL: {ms.get('inbound_request_url')}")
    print(f"  Status callback: {ms.get('status_callback')}")
    print(f"  Use inbound webhook on number: {ms.get('use_inbound_webhook_on_number')}")
    print("  OK!")
else:
    print(f"  ERROR: {r.text[:300]}")

# Step 5: Save MessagingServiceSid to platform settings
print()
print("=" * 70)
print("STEP 5: Save MessagingServiceSid to platform settings")
print("=" * 70)
r = requests.put(
    f"{WEBHOOK_BASE}/api/settings/settings",
    json={
        "settings": {
            "twilioMessagingServiceSid": NEW_MS_SID
        }
    },
    headers={
        "Content-Type": "application/json",
        "Cookie": "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    }
)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    print(f"  Response: {r.text[:200]}")
else:
    print(f"  Error: {r.text[:300]}")

print()
print("=" * 70)
print("ALL STEPS COMPLETE")
print("=" * 70)
