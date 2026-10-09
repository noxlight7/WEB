from django.urls import path
from . import views

urlpatterns = [
    path("auth/csrf/", views.CSRFView.as_view(), name="auth-csrf"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("books/", views.BookListView.as_view(), name="book-list"),
    path("books/<int:book_id>/", views.BookDetailView.as_view(), name="book-detail"),
    path("books/<int:book_id>/chapters/", views.ChapterListView.as_view(), name="chapter-list"),
    path("chapters/<int:chapter_id>/", views.ChapterDetailView.as_view(), name="chapter-detail"),
    path("demo/books/", views.DemoBooksView.as_view(), name="demo-books"),
    path("demo/about/", views.DemoAboutView.as_view(), name="demo-about"),
]
