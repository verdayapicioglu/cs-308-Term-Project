import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Conversation, Message, Attachment, SupportAgent


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.conversation_group_name = f'conversation_{self.conversation_id}'
        self.user = self.scope.get('user')

        # Join conversation room
        await self.channel_layer.group_add(
            self.conversation_group_name,
            self.channel_name
        )

        # If user is an agent, also join the agents group for notifications
        if self.user and self.user.is_authenticated:
            is_agent = await self.is_support_agent(self.user)
            if is_agent:
                await self.channel_layer.group_add(
                    'agents',
                    self.channel_name
                )

        await self.accept()

        # Don't send conversation history automatically
        # Frontend will handle message display, and we don't want to show old messages after logout
        # History will be sent only when explicitly requested

    async def disconnect(self, close_code):
        # Leave conversation room
        await self.channel_layer.group_discard(
            self.conversation_group_name,
            self.channel_name
        )

        # Leave agents group if agent
        if self.user and self.user.is_authenticated:
            is_agent = await self.is_support_agent(self.user)
            if is_agent:
                await self.channel_layer.group_discard(
                    'agents',
                    self.channel_name
                )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'message':
                # Handle text message
                content = data.get('content', '')
                print(f"[DEBUG receive] Received message: content={content[:50]}, conversation_id={self.conversation_id}, user={self.user.username if (self.user and self.user.is_authenticated) else 'Guest'}")
                if content:
                    message = await self.create_message(content)
                    if message:
                        print(f"[DEBUG receive] Message created: id={message.id}")
                        message_dict = await self.message_to_dict(message)
                        # Broadcast message to conversation group
                        await self.channel_layer.group_send(
                            self.conversation_group_name,
                            {
                                'type': 'chat_message',
                                'message': message_dict
                            }
                        )
                    else:
                        print(f"[DEBUG receive] ERROR: create_message returned None!")
            elif message_type == 'typing':
                # Handle typing indicator
                await self.channel_layer.group_send(
                    self.conversation_group_name,
                    {
                        'type': 'typing_indicator',
                        'user': self.user.username if self.user.is_authenticated else 'Guest',
                        'is_typing': data.get('is_typing', False)
                    }
                )

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            print(f"ERROR in receive: {e}")
            import traceback
            traceback.print_exc()

    async def chat_message(self, event):
        """Receive message from conversation group"""
        message_data = event.get('message', {})
        await self.send(text_data=json.dumps({
            'type': 'message',
            'data': message_data
        }))

    async def typing_indicator(self, event):
        """Receive typing indicator"""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user': event['user'],
            'is_typing': event['is_typing']
        }))

    async def new_message(self, event):
        """Receive new message notification"""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'data': event['message']
        }))

    async def agent_joined(self, event):
        """Notify when agent joins conversation"""
        await self.send(text_data=json.dumps({
            'type': 'agent_joined',
            'agent_name': event['agent_name']
        }))

    async def new_conversation(self, event):
        """Notify agents about new conversation"""
        await self.send(text_data=json.dumps({
            'type': 'new_conversation',
            'conversation_id': event['conversation_id']
        }))

    @database_sync_to_async
    def is_support_agent(self, user):
        """Check if user is a support agent"""
        return user.is_staff or SupportAgent.objects.filter(user=user).exists()

    @database_sync_to_async
    def get_conversation(self):
        """Get conversation object"""
        try:
            return Conversation.objects.get(id=self.conversation_id)
        except Conversation.DoesNotExist:
            return None

    async def create_message(self, content):
        """Create a new message"""
        try:
            conversation = await self.get_conversation()
            if not conversation:
                return None

            # Check if user is the assigned agent for this conversation
            is_from_agent = False
            if self.user and self.user.is_authenticated:
                # Get fresh conversation with agent relationship
                conversation_with_agent = await self._get_conversation_with_agent(conversation.id)
                if conversation_with_agent and conversation_with_agent.get('agent_id'):
                    if conversation_with_agent['agent_id'] == self.user.id:
                        is_from_agent = True

            # CRITICAL: Use conversation's customer field, not self.user
            # If conversation.customer is None (guest conversation), user_id should be None
            # This ensures logout users sending messages are treated as guests
            conversation_with_customer = await self._get_conversation_with_customer(conversation.id)
            
            if conversation_with_customer and conversation_with_customer.get('customer_id'):
                user_id = conversation_with_customer['customer_id']
            else:
                # Guest conversation - no user_id
                user_id = None
            
            message = await self._create_message_sync(conversation.id, user_id, is_from_agent, content)
            return message
        except Exception as e:
            print(f"Error creating message: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @database_sync_to_async
    def _get_conversation_with_agent(self, conversation_id):
        """Get conversation with agent ID"""
        try:
            conversation = Conversation.objects.select_related('agent').get(id=conversation_id)
            return {
                'id': conversation.id,
                'agent_id': conversation.agent.id if conversation.agent else None
            }
        except Conversation.DoesNotExist:
            return None
    
    @database_sync_to_async
    def _get_conversation_with_customer(self, conversation_id):
        """Get conversation with customer ID"""
        try:
            conversation = Conversation.objects.select_related('customer').get(id=conversation_id)
            return {
                'id': conversation.id,
                'customer_id': conversation.customer.id if conversation.customer else None
            }
        except Conversation.DoesNotExist:
            return None
    
    @database_sync_to_async
    def _create_message_sync(self, conversation_id, user_id, is_from_agent, content):
        """Synchronous helper to create message"""
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            sender = None
            if user_id:
                try:
                    sender = User.objects.get(id=user_id)
                    print(f"[DEBUG _create_message_sync] Found sender: {sender.username}")
                except User.DoesNotExist:
                    print(f"[DEBUG _create_message_sync] User {user_id} not found!")
                    pass
            
            print(f"[DEBUG _create_message_sync] Creating message: conv_id={conversation_id}, user_id={user_id}, is_from_agent={is_from_agent}, content={content[:50]}")
            message = Message.objects.create(
                conversation=conversation,
                sender=sender,
                is_from_agent=is_from_agent,
                message_type='text',
                content=content
            )
            print(f"[DEBUG _create_message_sync] Message created successfully: id={message.id}")
            # Update conversation's updated_at timestamp
            from django.utils import timezone
            conversation.updated_at = timezone.now()
            conversation.save(update_fields=['updated_at'])
            print(f"[DEBUG _create_message_sync] Conversation updated_at set to {conversation.updated_at}")
            return message
        except Exception as e:
            print(f"[DEBUG _create_message_sync] EXCEPTION: {e}")
            import traceback
            traceback.print_exc()
            raise

    @database_sync_to_async
    def message_to_dict(self, message):
        """Convert message to dictionary"""
        # CRITICAL: sender_name should match is_from_agent
        # If is_from_agent is True, it's an agent message
        # If is_from_agent is False, it's a customer message
        if message.is_from_agent:
            # Agent message - use username or "Support Agent"
            sender_name = message.sender.username if message.sender else 'Support Agent'
        else:
            # Customer message - use username or "Guest"
            sender_name = message.sender.username if message.sender else 'Guest'
        
        result = {
            'id': message.id,
            'conversation': message.conversation.id,
            'sender': message.sender.id if message.sender else None,
            'sender_name': sender_name,
            'is_from_agent': bool(message.is_from_agent),  # Ensure boolean
            'message_type': message.message_type,
            'content': message.content,
            'created_at': message.created_at.isoformat(),
            'attachments': []
        }
        return result

    async def get_conversation_messages(self):
        """Get all messages for conversation"""
        try:
            conversation = await self.get_conversation()
            if not conversation:
                return []
            messages = await self._get_messages_sync(conversation)
            # Convert messages to dict
            message_dicts = []
            for msg in messages:
                msg_dict = await self.message_to_dict(msg)
                message_dicts.append(msg_dict)
            return message_dicts
        except Exception as e:
            print(f"Error getting messages: {e}")
            return []

    @database_sync_to_async
    def _get_messages_sync(self, conversation):
        """Synchronous helper to get messages"""
        return list(Message.objects.filter(conversation=conversation).order_by('created_at'))

    async def send_conversation_history(self):
        """Send conversation history on connect"""
        messages = await self.get_conversation_messages()
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))

