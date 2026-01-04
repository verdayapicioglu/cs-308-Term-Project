from django.contrib import admin
from .models import SupportAgent, Conversation, Message, Attachment


@admin.register(SupportAgent)
class SupportAgentAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_available', 'active_conversations_count', 'created_at']
    list_filter = ['is_available', 'created_at']
    search_fields = ['user__username', 'user__email']


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'agent', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['customer__username', 'customer__email', 'agent__username', 'guest_session_id']
    readonly_fields = ['created_at', 'updated_at', 'closed_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'is_from_agent', 'message_type', 'created_at']
    list_filter = ['message_type', 'is_from_agent', 'created_at']
    search_fields = ['content', 'sender__username']
    readonly_fields = ['created_at']


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'message', 'file_type', 'file_size', 'uploaded_at']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['file_name']
    readonly_fields = ['uploaded_at']
