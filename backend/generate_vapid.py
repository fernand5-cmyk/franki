"""
Run once to generate VAPID keys for Web Push notifications.
Add the output to your backend/.env file.

Usage:  python3 generate_vapid.py
"""
from py_vapid import Vapid
import base64

v = Vapid()
v.generate_keys()

# Export private key as base64
private_pem = v.private_pem()
private_b64 = base64.urlsafe_b64encode(private_pem).decode().rstrip("=")

# Export public key as base64url (applicationServerKey for browser)
public_key = v.public_key
public_bytes = public_key.public_bytes(
    encoding=__import__('cryptography.hazmat.primitives.serialization', fromlist=['Encoding']).Encoding.X962,
    format=__import__('cryptography.hazmat.primitives.serialization', fromlist=['PublicFormat']).PublicFormat.UncompressedPoint
)
public_b64 = base64.urlsafe_b64encode(public_bytes).decode().rstrip("=")

print("Add these to backend/.env:\n")
print(f"VAPID_PRIVATE_KEY={private_b64}")
print(f"VAPID_PUBLIC_KEY={public_b64}")
print(f"VAPID_CLAIMS_EMAIL=admin@franki.app")
print()
print("Add this to frontend/src/push.js:")
print(f"export const VAPID_PUBLIC_KEY = '{public_b64}'")
