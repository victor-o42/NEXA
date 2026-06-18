import jwt

secret = "sb_secret_1QaXwVmplHNr7niuJB1LcA_gMEKBK3v"
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnemJxZHhtZWl0Y3VwZ3RoZXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTAxMjQsImV4cCI6MjA5MzQyNjEyNH0.HW7L9kVIwWy2_4bsZ0-Lyuhr1EkAm2kcNpnHp87D8g8"

try:
    decoded = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
    print("Success:", decoded)
except Exception as e:
    print("Error:", e)
