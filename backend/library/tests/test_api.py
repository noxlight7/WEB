from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, connection, transaction
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from library.models import Book, Chapter
from library.serializers import ChapterSerializer


class StaticDemoTests(SimpleTestCase):
    """SimpleTestCase запрещает доступ к БД, включая случайные запросы аутентификации."""

    def test_two_separate_static_handlers_without_database(self):
        client = APIClient()
        books = client.get("/api/v1/demo/books/")
        about = client.get("/api/v1/demo/about/")
        self.assertEqual(books.status_code, 200)
        self.assertEqual(about.status_code, 200)
        self.assertIsInstance(books.json(), list)
        self.assertIn("stage", about.json())
        self.assertEqual(client.head("/api/v1/demo/books/").content, b"")


class BookChapterTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(username="owner", password="OwnerTest2026!", first_name="Автор")
        cls.other = get_user_model().objects.create_user(username="other", password="OtherTest2026!")
        cls.book = Book.objects.create(title="Первая книга", description="Описание", author=cls.owner)
        cls.foreign_book = Book.objects.create(title="Чужая книга", description="", author=cls.other)
        cls.chapter = Chapter.objects.create(book=cls.book, number=2, title="Вторая", text="Текст второй главы.")

    def setUp(self):
        self.client = APIClient()

    def sign_in(self, user=None):
        self.client.force_login(user or self.owner)

    def test_postgresql_backend(self):
        self.assertEqual(connection.vendor, "postgresql")

    def test_public_book_list_has_author_counts_and_deterministic_order(self):
        with self.assertNumQueries(1):
            response = self.client.get("/api/v1/books/")
        self.assertEqual(response.status_code, 200)
        books = response.json()
        self.assertEqual([item["id"] for item in books], [self.foreign_book.id, self.book.id])
        self.assertEqual(books[1]["chapter_count"], 1)
        self.assertEqual(books[1]["author"], {"id": self.owner.id, "username": "owner", "display_name": "Автор"})
        self.assertNotIn("password", books[1]["author"])
        self.assertIn("T", books[1]["created_at"])

    def test_public_reads_and_head_return_correct_content(self):
        paths = ["/api/v1/books/", f"/api/v1/books/{self.book.id}/", f"/api/v1/books/{self.book.id}/chapters/", f"/api/v1/chapters/{self.chapter.id}/"]
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path)
                head = self.client.head(path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(head.status_code, 200)
                self.assertEqual(head.content, b"")
                self.assertEqual(head["Content-Type"], response["Content-Type"])

    def test_anonymous_cannot_create_or_mutate_or_view_mine(self):
        actions = [
            ("get", "/api/v1/books/?mine=1", None),
            ("post", "/api/v1/books/", {"title": "X", "description": ""}),
            ("put", f"/api/v1/books/{self.book.id}/", {"title": "X", "description": ""}),
            ("delete", f"/api/v1/books/{self.book.id}/", None),
            ("post", f"/api/v1/books/{self.book.id}/chapters/", {"number": 1, "title": "X", "text": "Y"}),
            ("put", f"/api/v1/chapters/{self.chapter.id}/", {"number": 1, "title": "X", "text": "Y"}),
            ("delete", f"/api/v1/chapters/{self.chapter.id}/", None),
        ]
        for method, path, body in actions:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, data=body, format="json")
                self.assertEqual(response.status_code, 403)
                self.assertIn("detail", response.json())

    def test_mine_returns_only_authenticated_authors_books(self):
        self.sign_in()
        response = self.client.get("/api/v1/books/?mine=1")
        self.assertEqual([book["id"] for book in response.json()], [self.book.id])

    def test_create_book_assigns_owner_and_persists_for_independent_client(self):
        self.sign_in()
        response = self.client.post("/api/v1/books/", {"title": "  Новая книга  ", "description": "  Рассказ  ", "author": self.other.id}, format="json")
        self.assertEqual(response.status_code, 201)
        saved = Book.objects.get(pk=response.json()["id"])
        self.assertEqual(saved.title, "Новая книга")
        self.assertEqual(saved.description, "Рассказ")
        self.assertEqual(saved.author, self.owner)
        reread = APIClient().get(f"/api/v1/books/{saved.id}/")
        self.assertEqual(reread.json()["title"], saved.title)
        self.assertEqual(response.json()["chapter_count"], 0)

    def test_book_put_requires_all_writable_fields_and_ignores_owner(self):
        self.sign_in()
        url = f"/api/v1/books/{self.book.id}/"
        for body, missing in [({"title": "Обновление"}, "description"), ({"description": "Новое описание"}, "title")]:
            response = self.client.put(url, body, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn(missing, response.json())
        response = self.client.put(url, {"title": "Обновление", "description": "", "author": self.other.id}, format="json")
        self.assertEqual(response.status_code, 200)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, "Обновление")
        self.assertEqual(self.book.author, self.owner)
        self.assertGreater(self.book.updated_at, self.book.created_at)

    def test_book_validates_empty_and_maximum_lengths(self):
        self.sign_in()
        for body, field in [
            ({"title": " \n ", "description": ""}, "title"),
            ({"title": "X" * 161, "description": ""}, "title"),
            ({"title": "X", "description": "X" * 2001}, "description"),
        ]:
            with self.subTest(field=field):
                response = self.client.post("/api/v1/books/", body, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json())

    def test_foreign_owner_cannot_mutate_books_or_chapters(self):
        self.sign_in(self.other)
        for method, path, body in [
            ("put", f"/api/v1/books/{self.book.id}/", {"title": "Захват", "description": ""}),
            ("delete", f"/api/v1/books/{self.book.id}/", None),
            ("post", f"/api/v1/books/{self.book.id}/chapters/", {"number": 1, "title": "X", "text": "Y"}),
            ("put", f"/api/v1/chapters/{self.chapter.id}/", {"number": 1, "title": "X", "text": "Y"}),
            ("delete", f"/api/v1/chapters/{self.chapter.id}/", None),
        ]:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, body, format="json")
                self.assertEqual(response.status_code, 403)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, "Первая книга")
        self.assertTrue(Chapter.objects.filter(pk=self.chapter.id).exists())

    def test_chapter_create_read_update_delete_and_parent_cannot_change(self):
        self.sign_in()
        response = self.client.post(f"/api/v1/books/{self.book.id}/chapters/", {"number": 1, "title": "  Начало  ", "text": "Первая строка.\n\nВторая строка.", "book": self.foreign_book.id}, format="json")
        self.assertEqual(response.status_code, 201)
        chapter_id = response.json()["id"]
        self.assertEqual(response.json()["book"], self.book.id)
        self.assertEqual(response.json()["title"], "Начало")
        self.assertEqual(Chapter.objects.get(pk=chapter_id).text, "Первая строка.\n\nВторая строка.")
        chapters = self.client.get(f"/api/v1/books/{self.book.id}/chapters/").json()
        self.assertEqual([chapter["number"] for chapter in chapters], [1, 2])
        self.assertEqual(self.client.get(f"/api/v1/books/{self.book.id}/").json()["chapter_count"], 2)
        response = self.client.put(f"/api/v1/chapters/{chapter_id}/", {"number": 3, "title": "Финал", "text": "Продолжение.", "book": self.foreign_book.id}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["book"], self.book.id)
        self.assertEqual(APIClient().get(f"/api/v1/chapters/{chapter_id}/").json()["number"], 3)
        response = self.client.delete(f"/api/v1/chapters/{chapter_id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        self.assertFalse(Chapter.objects.filter(pk=chapter_id).exists())
        self.assertEqual(self.client.get(f"/api/v1/books/{self.book.id}/").json()["chapter_count"], 1)

    def test_chapter_put_requires_every_writable_field(self):
        self.sign_in()
        full_body = {"number": 2, "title": "Новое название", "text": "Новый текст"}
        for field in full_body:
            body = {key: value for key, value in full_body.items() if key != field}
            response = self.client.put(f"/api/v1/chapters/{self.chapter.id}/", body, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn(field, response.json())

    def test_chapter_validates_number_title_text_and_duplicate_number(self):
        self.sign_in()
        for field, value in [("number", 0), ("number", -1), ("number", 10000), ("number", 1.5), ("number", 2), ("title", "  "), ("title", "X" * 161), ("text", "\n \n"), ("text", "X" * 100001)]:
            with self.subTest(field=field, value=str(value)[:20]):
                body = {"number": 1, "title": "Название", "text": "Текст", field: value}
                response = self.client.post(f"/api/v1/books/{self.book.id}/chapters/", body, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json())

    def test_duplicate_number_on_update_is_a_field_error(self):
        self.sign_in()
        first = Chapter.objects.create(book=self.book, number=1, title="Первая", text="Текст")
        response = self.client.put(f"/api/v1/chapters/{first.id}/", {"number": 2, "title": "Первая", "text": "Текст"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("number", response.json())
        first.refresh_from_db()
        self.assertEqual(first.number, 1)

    def test_database_uniqueness_race_becomes_clean_400_and_connection_recovers(self):
        self.sign_in()
        # Имитируем прохождение предварительной проверки уникальности обоими параллельными запросами.
        with patch.object(ChapterSerializer, "validate_number", return_value=2):
            response = self.client.post(f"/api/v1/books/{self.book.id}/chapters/", {"number": 2, "title": "Дубликат", "text": "Текст"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("number", response.json())
        self.assertEqual(Chapter.objects.filter(book=self.book, number=2).count(), 1)
        self.assertEqual(self.client.get("/api/v1/books/").status_code, 200)

    def test_database_constraints_and_model_whitespace_validation(self):
        for number in (0, 10000, 2):
            with self.subTest(number=number):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    Chapter.objects.create(book=self.book, number=number, title="Название", text="Текст")
        with self.assertRaises(DjangoValidationError):
            Book(title="   ", description="", author=self.owner).full_clean()
        with self.assertRaises(DjangoValidationError):
            Chapter(book=self.book, number=1, title="X", text=" \n ").full_clean()
        # Номера глав уникальны в пределах одной книги, а не всего каталога.
        Chapter.objects.create(book=self.foreign_book, number=2, title="Другая", text="Текст")

    def test_delete_book_cascades_to_chapters_and_returns_empty_204(self):
        self.sign_in()
        response = self.client.delete(f"/api/v1/books/{self.book.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        self.assertFalse(Book.objects.filter(pk=self.book.id).exists())
        self.assertFalse(Chapter.objects.filter(pk=self.chapter.id).exists())

    def test_unknown_objects_are_json_404_and_patch_is_405(self):
        for path in ["/api/v1/books/999999/", "/api/v1/books/999999/chapters/", "/api/v1/chapters/999999/"]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)
            self.assertIn("detail", response.json())
        self.sign_in()
        self.assertEqual(self.client.patch(f"/api/v1/books/{self.book.id}/", {"title": "X"}, format="json").status_code, 405)


class AuthCSRFTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="reader", password="ReaderTest2026!", first_name="Читатель")

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def token(self):
        response = self.client.get("/api/v1/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("csrftoken", self.client.cookies)
        return response.json()["csrfToken"]

    def post(self, path, body=None):
        return self.client.post(path, body or {}, format="json", HTTP_X_CSRFTOKEN=self.token())

    def test_me_anonymous_and_no_cache(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.json(), {"user": None})
        self.assertIn("no-store", response["Cache-Control"])

    def test_anonymous_login_register_logout_all_require_csrf(self):
        for path, body in [
            ("/api/v1/auth/login/", {"username": "reader", "password": "ReaderTest2026!"}),
            ("/api/v1/auth/register/", {"username": "new", "password": "NewReader2026!", "display_name": "Новый"}),
            ("/api/v1/auth/logout/", {}),
        ]:
            with self.subTest(path=path):
                response = self.client.post(path, body, format="json")
                self.assertEqual(response.status_code, 403)
                self.assertIn("detail", response.json())
        self.assertFalse(get_user_model().objects.filter(username="new").exists())

    def test_login_bad_token_and_untrusted_origin_are_denied(self):
        token = self.token()
        data = {"username": "reader", "password": "ReaderTest2026!"}
        response = self.client.post("/api/v1/auth/login/", data, format="json", HTTP_X_CSRFTOKEN="x" * 64)
        self.assertEqual(response.status_code, 403)
        response = self.client.post("/api/v1/auth/login/", data, format="json", HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN="https://untrusted.example")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get("/api/v1/auth/me/").json(), {"user": None})

    def test_login_session_and_authenticated_mutations_require_csrf(self):
        old_token = self.token()
        response = self.client.post("/api/v1/auth/login/", {"username": "reader", "password": "ReaderTest2026!"}, format="json", HTTP_X_CSRFTOKEN=old_token)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["display_name"], "Читатель")
        self.assertEqual(self.client.get("/api/v1/auth/me/").json(), response.json())
        self.assertIn("sessionid", self.client.cookies)
        response = self.client.post("/api/v1/books/", {"title": "Без токена", "description": ""}, format="json")
        self.assertEqual(response.status_code, 403)
        response = self.client.post("/api/v1/books/", {"title": "Старый токен", "description": ""}, format="json", HTTP_X_CSRFTOKEN=old_token)
        self.assertEqual(response.status_code, 403)
        response = self.post("/api/v1/books/", {"title": "С токеном", "description": ""})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["author"]["id"], self.user.id)

    def test_bad_credentials_return_identical_generic_error(self):
        wrong_password = self.post("/api/v1/auth/login/", {"username": "reader", "password": "incorrect"})
        wrong_username = self.post("/api/v1/auth/login/", {"username": "unknown", "password": "incorrect"})
        self.assertEqual(wrong_password.status_code, 400)
        self.assertEqual(wrong_username.status_code, 400)
        self.assertEqual(wrong_password.json(), wrong_username.json())
        self.assertEqual(wrong_password.json()["detail"], "Неверное имя пользователя или пароль.")

    def test_logout_is_csrf_protected_invalidates_session_and_is_empty(self):
        self.post("/api/v1/auth/login/", {"username": "reader", "password": "ReaderTest2026!"})
        self.assertEqual(self.client.post("/api/v1/auth/logout/", {}, format="json").status_code, 403)
        response = self.post("/api/v1/auth/logout/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        self.assertEqual(self.client.get("/api/v1/auth/me/").json(), {"user": None})
        self.assertEqual(self.post("/api/v1/books/", {"title": "X", "description": ""}).status_code, 403)

    def test_register_validates_hashes_password_and_logs_in(self):
        response = self.post("/api/v1/auth/register/", {"username": "new_reader", "password": "FreshStory2026!", "display_name": "  Новый читатель  "})
        self.assertEqual(response.status_code, 201)
        user = get_user_model().objects.get(username="new_reader")
        self.assertTrue(user.check_password("FreshStory2026!"))
        self.assertNotEqual(user.password, "FreshStory2026!")
        self.assertEqual(user.first_name, "Новый читатель")
        self.assertEqual(self.client.get("/api/v1/auth/me/").json(), response.json())
        self.assertNotIn("password", response.json()["user"])

    def test_registration_reports_missing_duplicate_and_weak_fields(self):
        for body, field in [
            ({"username": "reader", "password": "FreshStory2026!", "display_name": "Новый"}, "username"),
            ({"username": "new", "password": "123", "display_name": "Новый"}, "password"),
            ({"username": "new", "password": "FreshStory2026!", "display_name": "  "}, "display_name"),
            ({"username": "bad name", "password": "FreshStory2026!", "display_name": "Новый"}, "username"),
        ]:
            with self.subTest(field=field):
                response = self.post("/api/v1/auth/register/", body)
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json())
        self.assertEqual(get_user_model().objects.count(), 1)
