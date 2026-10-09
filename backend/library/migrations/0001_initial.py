import django.core.validators
import django.db.models.deletion
import library.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="Book",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160, validators=[library.models.validate_nonempty], verbose_name="Название")),
                ("description", models.TextField(blank=True, max_length=2000, verbose_name="Описание")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создана")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Изменена")),
                ("author", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="books", to=settings.AUTH_USER_MODEL, verbose_name="Автор")),
            ],
            options={"verbose_name": "Книга", "verbose_name_plural": "Книги", "ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="Chapter",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("number", models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(9999)], verbose_name="Номер")),
                ("title", models.CharField(max_length=160, validators=[library.models.validate_nonempty], verbose_name="Название")),
                ("text", models.TextField(max_length=100000, validators=[library.models.validate_nonempty], verbose_name="Текст")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создана")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Изменена")),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chapters", to="library.book", verbose_name="Книга")),
            ],
            options={
                "verbose_name": "Глава", "verbose_name_plural": "Главы", "ordering": ["number", "id"],
                "constraints": [
                    models.UniqueConstraint(fields=("book", "number"), name="unique_chapter_number_per_book"),
                    models.CheckConstraint(condition=models.Q(("number__gte", 1), ("number__lte", 9999)), name="chapter_number_in_range"),
                ],
            },
        ),
    ]
