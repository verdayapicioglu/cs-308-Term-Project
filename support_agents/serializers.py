from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, Message, Attachment, SupportAgent


class AttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ['id', 'file', 'file_url', 'file_type', 'file_name', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class MessageSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'is_from_agent', 'message_type', 
                  'content', 'attachments', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj):
        if obj.is_from_agent:
            # Agent message - show agent username or "Support Agent"
            return obj.sender.username if obj.sender else "Support Agent"
        else:
            # Customer message - show customer username or "Guest"
            return obj.sender.username if obj.sender else "Guest"
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        return ret


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'customer', 'customer_name', 'agent', 'agent_name', 'status', 
                  'guest_session_id', 'messages', 'unread_count', 'created_at', 'updated_at', 'closed_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'closed_at']

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.username
        return "Guest"

    def get_agent_name(self, obj):
        if obj.agent:
            return obj.agent.username
        return None

    def get_unread_count(self, obj):
        # This can be customized based on read/unread tracking
        return 0


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation lists"""
    customer_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'customer', 'customer_name', 'agent', 'agent_name', 'status', 
                  'last_message', 'message_count', 'created_at', 'updated_at']

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.username
        return "Guest"

    def get_agent_name(self, obj):
        if obj.agent:
            return obj.agent.username
        return None

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'content': last_msg.content[:100] if last_msg.content else '',
                'created_at': last_msg.created_at,
                'is_from_agent': last_msg.is_from_agent
            }
        return None

    def get_message_count(self, obj):
        return obj.messages.count()


class CustomerDetailsSerializer(serializers.Serializer):
    """Serializer for customer details shown to agents"""
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    orders = serializers.ListField()
    cart_items = serializers.ListField()
    wishlist_items = serializers.ListField()
    order_count = serializers.IntegerField()
    cart_item_count = serializers.IntegerField()
    wishlist_item_count = serializers.IntegerField()

