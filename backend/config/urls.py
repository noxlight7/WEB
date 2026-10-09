from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("library.urls")),
]

# В этом небольшом локальном окружении Django отдаёт только собранную статику админки.
# Страницы приложения и их ресурсы отдаёт контейнер клиентской части.
if settings.DEBUG:
    urlpatterns += [re_path(r"^static/(?P<path>.*)$", serve, {"document_root": settings.STATIC_ROOT})]
