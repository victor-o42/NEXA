import os
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
from .models import UserProfile
from supabase import create_client

class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Validates Supabase JWTs attached to the Authorization header using the official SDK.
    Dynamically creates/fetches the local Django User and UserProfile.
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        token = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        else:
            token = request.GET.get('token')
            
        if not token:
            return None
        
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            raise AuthenticationFailed("Backend configuration error: SUPABASE_URL or SUPABASE_KEY not found.")

        try:
            supabase = create_client(supabase_url, supabase_key)
            user_response = supabase.auth.get_user(token)
            
            if not user_response or not user_response.user:
                raise AuthenticationFailed("Invalid authentication token.")
                
            user_obj = user_response.user
            user_uuid = user_obj.id
            email = user_obj.email
            user_metadata = user_obj.user_metadata or {}
            
        except Exception as e:
            print(f"Supabase Auth Error: {e}")
            raise AuthenticationFailed("Invalid or expired authentication token.")

        if not user_uuid:
            raise AuthenticationFailed("Token is missing user identification.")

        # Ensure Django User exists
        user, created = User.objects.get_or_create(
            username=user_uuid,
            defaults={'email': email}
        )

        # Update email if it changed
        if user.email != email:
            user.email = email
            user.save()

        # Ensure UserProfile exists
        profile, profile_created = UserProfile.objects.get_or_create(user=user)

        # Auto-sync admin role from Supabase user metadata / app metadata if set
        app_meta = getattr(user_obj, 'app_metadata', {}) or {}
        is_admin_flag = (
            user_metadata.get('is_admin') is True or 
            app_meta.get('is_admin') is True or 
            app_meta.get('role') == 'admin'
        )
        if is_admin_flag and not profile.is_admin:
            profile.is_admin = True
            profile.save(update_fields=['is_admin'])

        # Sync profile names if we just created the profile OR if they are missing
        # This handles Google OAuth 'given_name'/'family_name' and custom 'first_name'/'last_name'
        if profile_created or (not profile.first_name and not profile.last_name):
            first_name = user_metadata.get('first_name') or user_metadata.get('given_name') or ''
            last_name = user_metadata.get('last_name') or user_metadata.get('family_name') or ''
            
            # Save if there is data
            if first_name or last_name:
                profile.first_name = first_name
                profile.last_name = last_name
                profile.save()

        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer'
