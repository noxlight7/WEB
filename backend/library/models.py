from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


def validate_nonempty(value):
    if not value.strip():
        raise ValidationError("Поле не может состоять только из пробелов.")


class Book(models.Model):
    title = models.CharField("Название", max_length=160, validators=[validate_nonempty])
    description = models.TextField("Описание", max_length=2000, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="books", verbose_name="Автор")
    created_at = models.DateTimeField("Создана", auto_now_add=True)
    updated_at = models.DateTimeField("Изменена", auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Книга"
        verbose_name_plural = "Книги"

    def clean(self):
        super().clean()
        self.title = self.title.strip()
        self.description = self.description.strip()

    def __str__(self):
        return self.title


class Chapter(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="chapters", verbose_name="Книга")
    number = models.PositiveIntegerField("Номер", validators=[MinValueValidator(1), MaxValueValidator(9999)])
    title = models.CharField("Название", max_length=160, validators=[validate_nonempty])
    text = models.TextField("Текст", max_length=100000, validators=[validate_nonempty])
    created_at = models.DateTimeField("Создана", auto_now_add=True)
    updated_at = models.DateTimeField("Изменена", auto_now=True)

    class Meta:
        ordering = ["number", "id"]
        verbose_name = "Глава"
        verbose_name_plural = "Главы"
        constraints = [
            models.UniqueConstraint(fields=["book", "number"], name="unique_chapter_number_per_book"),
            models.CheckConstraint(condition=models.Q(number__gte=1, number__lte=9999), name="chapter_number_in_range"),
        ]

    def clean(self):
        super().clean()
        self.title = self.title.strip()

    def __str__(self):
        return f"{self.number}. {self.title}"
