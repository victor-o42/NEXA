import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexa_backend.settings')
django.setup()

from django.contrib.auth.models import User

try:
    user = User.objects.get(email='mbanugovictoro42@gmail.com')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"Successfully elevated user {user.username} ({user.email}) to superuser and staff.")
except User.DoesNotExist:
    print("Error: A user with the email 'mbanugovictoro42@gmail.com' was not found in the database.")
    print("Current users:")
    for u in User.objects.all():
        print(f" - {u.email} (Username: {u.username})")
