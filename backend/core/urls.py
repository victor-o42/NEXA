from django.urls import path
from .views import (
    HeartbeatView, ScanStreamView, DeleteUserView, UserProfileView,
    LoginEventView, LoginHistoryView, AdminMetricsView, AdminUserQuotaView,
    ScanHistoryView
)

urlpatterns = [
    path('heartbeat/', HeartbeatView.as_view(), name='heartbeat'),
    path('scan/stream/', ScanStreamView.as_view(), name='scan-stream'),
    path('user/delete/', DeleteUserView.as_view(), name='delete-user'),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('user/profile/update/', UserProfileView.as_view(), name='user-profile-update'),
    path('user/login-event/', LoginEventView.as_view(), name='user-login-event'),
    path('user/login-history/', LoginHistoryView.as_view(), name='user-login-history'),
    path('user/scan-history/', ScanHistoryView.as_view(), name='user-scan-history'),
    path('admin/metrics/', AdminMetricsView.as_view(), name='admin-metrics'),
    path('admin/user/<str:email>/quota/', AdminUserQuotaView.as_view(), name='admin-user-quota'),
]
