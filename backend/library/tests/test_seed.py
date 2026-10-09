from io import StringIO
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from library.demo_data import DEMO_PASSWORD
from library.models import Book, Chapter


class DemoSeedTests(TestCase):
    def seed(self):
        call_command("seed_demo", stdout=StringIO())

    def test_seed_is_repeatable_and_preserves_edited_and_deleted_content(self):
        self.seed()
        self.assertEqual(get_user_model().objects.count(), 2)
        self.assertEqual(Book.objects.count(), 6)
        self.assertEqual(Chapter.objects.count(), 14)
        author = get_user_model().objects.get(username="author")
        self.assertTrue(author.check_password(DEMO_PASSWORD))
        book = Book.objects.filter(author=author).first()
        book.title = "Моё новое название"
        book.save()
        chapter = book.chapters.first()
        chapter.text = "Моя новая редакция."
        chapter.save()
        book.chapters.exclude(pk=chapter.pk).delete()
        author.set_password("ChangedPassword2026!")
        author.first_name = "Другое имя"
        author.save()
        counts = (Book.objects.count(), Chapter.objects.count())
        self.seed()
        self.assertEqual((Book.objects.count(), Chapter.objects.count()), counts)
        book.refresh_from_db()
        chapter.refresh_from_db()
        author.refresh_from_db()
        self.assertEqual(book.title, "Моё новое название")
        self.assertEqual(chapter.text, "Моя новая редакция.")
        self.assertEqual(author.first_name, "Другое имя")
        self.assertTrue(author.check_password("ChangedPassword2026!"))
        self.assertFalse(author.check_password(DEMO_PASSWORD))

    def test_existing_account_is_not_taken_over_or_given_demo_content(self):
        author = get_user_model().objects.create_user(username="author", password="ExistingAccount2026!", first_name="Настоящий автор")
        self.seed()
        author.refresh_from_db()
        self.assertEqual(author.first_name, "Настоящий автор")
        self.assertTrue(author.check_password("ExistingAccount2026!"))
        self.assertEqual(author.books.count(), 0)
        self.assertEqual(Book.objects.count(), 3)
