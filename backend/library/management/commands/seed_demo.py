from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from library.demo_data import DEMO_AUTHORS, DEMO_BOOKS, DEMO_PASSWORD
from library.models import Book, Chapter


class Command(BaseCommand):
    help = "Добавить двух демоавторов и шесть книг; существующие аккаунты и данные не изменяются."

    @transaction.atomic
    def handle(self, *args, **options):
        # Демоданные добавляем только новому аккаунту. Поиск книги по названию
        # создал бы её заново после переименования; проверка нового аккаунта
        # сохраняет правки и намеренные удаления при последующих запусках.
        authors = {}
        created_users = set()
        for username, display_name in DEMO_AUTHORS.items():
            user, created = get_user_model().objects.get_or_create(
                username=username, defaults={"first_name": display_name},
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save(update_fields=["password"])
                created_users.add(username)
            authors[username] = user

        count = 0
        # Каталог с новыми книгами в начале сохраняет порядок демонстрационного списка.
        for item in reversed(DEMO_BOOKS):
            if item["author"] not in created_users:
                continue
            book = Book.objects.create(
                title=item["title"], description=item["description"], author=authors[item["author"]],
            )
            Chapter.objects.bulk_create([
                Chapter(book=book, number=number, title=title, text=text)
                for number, (title, text) in enumerate(item["chapters"], start=1)
            ])
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Добавлено книг: {count}. Существующие аккаунты и их данные сохранены."))
