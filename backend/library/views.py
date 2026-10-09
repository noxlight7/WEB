from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.cache import never_cache
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Book, Chapter
from .serializers import BookSerializer, ChapterSerializer, LoginSerializer, RegisterSerializer, UserSerializer


def csrf_failure(request, reason=""):
    return JsonResponse({"detail": "Проверка CSRF не пройдена. Обновите страницу и повторите действие."}, status=403)


def require_login(request):
    if not request.user.is_authenticated:
        raise PermissionDenied("Для этого действия войдите в аккаунт.")


def require_owner(request, book):
    require_login(request)
    if book.author_id != request.user.id:
        raise PermissionDenied("Изменять книгу и её главы может только автор.")


def books_queryset():
    # Одним SQL-запросом загружаем авторов и число глав для всего каталога.
    return (
        Book.objects.select_related("author")
        .annotate(chapter_count=Count("chapters"))
        .order_by("-created_at", "-id")
    )


@method_decorator(never_cache, name="dispatch")
class CSRFView(APIView):
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


@method_decorator(never_cache, name="dispatch")
class MeView(APIView):
    def get(self, request):
        return Response({"user": UserSerializer(request.user).data if request.user.is_authenticated else None})


# SessionAuthentication в DRF проверяет CSRF только после успешной аутентификации.
# Декоратор метода dispatch защищает также анонимные запросы входа и регистрации.
@method_decorator(csrf_protect, name="dispatch")
@method_decorator(never_cache, name="dispatch")
class AuthView(APIView):
    pass


class RegisterView(AuthView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = serializer.save()
        except IntegrityError as error:
            raise ValidationError({"username": ["Это имя пользователя уже занято."]}) from error
        login(request, user)
        return Response({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(AuthView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, **serializer.validated_data)
        if user is None:
            raise ValidationError({"detail": "Неверное имя пользователя или пароль."})
        login(request, user)
        return Response({"user": UserSerializer(user).data})


class LogoutView(AuthView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BookListView(APIView):
    def get(self, request):
        books = books_queryset()
        if request.query_params.get("mine") == "1":
            require_login(request)
            books = books.filter(author=request.user)
        return Response(BookSerializer(books, many=True).data)

    def post(self, request):
        require_login(request)
        serializer = BookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BookDetailView(APIView):
    def get(self, request, book_id):
        book = get_object_or_404(books_queryset(), pk=book_id)
        return Response(BookSerializer(book).data)

    def put(self, request, book_id):
        book = get_object_or_404(books_queryset(), pk=book_id)
        require_owner(request, book)
        serializer = BookSerializer(book, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, book_id):
        book = get_object_or_404(Book, pk=book_id)
        require_owner(request, book)
        book.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def save_chapter(serializer, **kwargs):
    # Параллельный запрос может занять тот же номер после проверки данных.
    # Перехватываем ошибку вне atomic, чтобы откат завершился до следующих запросов.
    try:
        with transaction.atomic():
            serializer.save(**kwargs)
    except IntegrityError as error:
        raise ValidationError({"number": ["Не удалось сохранить главу. Проверьте, что её номер свободен, а книга существует."]}) from error


class ChapterListView(APIView):
    def get(self, request, book_id):
        book = get_object_or_404(Book, pk=book_id)
        return Response(ChapterSerializer(book.chapters.all(), many=True).data)

    def post(self, request, book_id):
        book = get_object_or_404(Book, pk=book_id)
        require_owner(request, book)
        serializer = ChapterSerializer(data=request.data, context={"book": book})
        serializer.is_valid(raise_exception=True)
        save_chapter(serializer, book=book)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChapterDetailView(APIView):
    def get(self, request, chapter_id):
        chapter = get_object_or_404(Chapter, pk=chapter_id)
        return Response(ChapterSerializer(chapter).data)

    def put(self, request, chapter_id):
        chapter = get_object_or_404(Chapter.objects.select_related("book"), pk=chapter_id)
        require_owner(request, chapter.book)
        serializer = ChapterSerializer(chapter, data=request.data)
        serializer.is_valid(raise_exception=True)
        save_chapter(serializer)
        return Response(serializer.data)

    def delete(self, request, chapter_id):
        chapter = get_object_or_404(Chapter.objects.select_related("book"), pk=chapter_id)
        require_owner(request, chapter.book)
        chapter.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DemoBooksView(APIView):
    authentication_classes = []

    def get(self, request):
        return Response([
            {"id": 1, "title": "Дом у тихой воды", "author": "Анна Ветрова"},
            {"id": 2, "title": "Письма из сентября", "author": "Михаил Лист"},
        ])


class DemoAboutView(APIView):
    authentication_classes = []

    def get(self, request):
        return Response({"name": "Переплёт", "description": "Небольшое место для больших историй.", "stage": "ЛР3: статические ответы Django", "version": 1})
