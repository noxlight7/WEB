from django.contrib import admin
from django.db import models
from django.forms import Textarea
from .models import Book, Chapter


class ChapterInline(admin.TabularInline):
    model = Chapter
    fields = ("number", "title", "text")
    formfield_overrides = {models.TextField: {"widget": Textarea(attrs={"rows": 3, "cols": 45})}}
    extra = 0
    show_change_link = True


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "created_at", "updated_at")
    list_filter = ("author",)
    search_fields = ("title", "description", "author__username")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ChapterInline]


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("title", "book", "number", "updated_at")
    list_filter = ("book",)
    search_fields = ("title", "text", "book__title")
    readonly_fields = ("created_at", "updated_at")
