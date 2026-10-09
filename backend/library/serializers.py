from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Book, Chapter

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "display_name")

    def get_display_name(self, user):
        return user.first_name or user.username


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)
    display_name = serializers.CharField(max_length=150)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Это имя пользователя уже занято.")
        return value

    def validate(self, attrs):
        user = User(username=attrs["username"], first_name=attrs["display_name"])
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)}) from error
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            first_name=validated_data["display_name"],
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)


class BookSerializer(serializers.ModelSerializer):
    title = serializers.CharField(max_length=160)
    description = serializers.CharField(max_length=2000, allow_blank=True, required=True)
    author = UserSerializer(read_only=True)
    chapter_count = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ("id", "title", "description", "author", "chapter_count", "created_at", "updated_at")
        read_only_fields = ("id", "author", "chapter_count", "created_at", "updated_at")

    def get_chapter_count(self, book):
        if hasattr(book, "chapter_count"):
            return book.chapter_count
        return book.chapters.count()


class ChapterSerializer(serializers.ModelSerializer):
    number = serializers.IntegerField(min_value=1, max_value=9999)
    title = serializers.CharField(max_length=160)
    text = serializers.CharField(max_length=100000, trim_whitespace=False)

    class Meta:
        model = Chapter
        fields = ("id", "book", "number", "title", "text", "created_at", "updated_at")
        read_only_fields = ("id", "book", "created_at", "updated_at")
        # Книгу берём из URL или существующего объекта, а не из присланного JSON.
        validators = []

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Добавьте текст главы.")
        return value

    def validate_number(self, value):
        book = self.instance.book if self.instance else self.context["book"]
        chapters = Chapter.objects.filter(book=book, number=value)
        if self.instance:
            chapters = chapters.exclude(pk=self.instance.pk)
        if chapters.exists():
            raise serializers.ValidationError("В этой книге уже есть глава с таким номером.")
        return value
