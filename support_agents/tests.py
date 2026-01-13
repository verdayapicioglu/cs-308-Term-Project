from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Conversation, Message, SupportAgent, Attachment
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile


class SupportAgentsOriginalFeaturesTestCase(TestCase):
    """Test cases for Support Agents original features (before new additions)"""
    
    def setUp(self):
        """Set up test data"""
        # Create regular user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create another regular user
        self.user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123'
        )
        
        # Create staff/admin user (support agent)
        self.agent = User.objects.create_user(
            username='agent',
            email='agent@example.com',
            password='agentpass123',
            is_staff=True,
            is_superuser=True
        )
        
        # Create SupportAgent profile
        self.support_agent = SupportAgent.objects.create(user=self.agent)
        
        # Create API clients
        self.client = APIClient()
        self.regular_client = APIClient()
        self.user2_client = APIClient()
        
    def test_1_create_conversation_guest_and_authenticated(self):
        """Test 1: Conversation oluşturma (guest ve authenticated user)"""
        # Test 1a: Guest user conversation oluşturabilir
        response = self.client.post(
            '/api/support/conversations/create/',
            {'guest_session_id': 'test_guest_123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'waiting')
        self.assertIsNone(response.data['customer'])
        self.assertIsNotNone(response.data['guest_session_id'])
        
        # Test 1b: Authenticated user conversation oluşturabilir
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.post(
            '/api/support/conversations/create/',
            {},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'waiting')
        self.assertEqual(response.data['customer'], self.user.id)
        self.assertIsNone(response.data.get('guest_session_id'))
        
    def test_2_agent_claim_conversation(self):
        """Test 2: Agent conversation claim etme"""
        # Create a conversation
        conversation = Conversation.objects.create(
            customer=None,
            guest_session_id='test_guest',
            status='waiting'
        )
        
        # Test 2a: Normal user claim edemez
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.post(
            f'/api/support/conversations/{conversation.id}/claim/',
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test 2b: Staff/admin kullanıcı claim edebilir
        self.client.force_authenticate(user=self.agent)
        response = self.client.post(
            f'/api/support/conversations/{conversation.id}/claim/',
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'active')
        self.assertEqual(response.data['agent'], self.agent.id)
        
        # Refresh from database
        conversation.refresh_from_db()
        self.assertEqual(conversation.status, 'active')
        self.assertEqual(conversation.agent, self.agent)
        
        # Test 2c: Agent's active conversation count should be updated
        agent_profile = SupportAgent.objects.get(user=self.agent)
        self.assertEqual(agent_profile.active_conversations_count, 1)
        
    def test_3_list_conversations_agent_and_customer_view(self):
        """Test 3: Conversation listeleme (agent ve customer view)"""
        # Create conversations for different users
        conv1 = Conversation.objects.create(
            customer=self.user,
            status='waiting'
        )
        conv2 = Conversation.objects.create(
            customer=self.user2,
            status='active'
        )
        conv3 = Conversation.objects.create(
            customer=None,
            guest_session_id='guest_123',
            status='waiting'
        )
        
        # Test 3a: Normal user sadece kendi conversation'larını görebilir
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.get('/api/support/conversations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], conv1.id)
        self.assertEqual(response.data[0]['customer'], self.user.id)
        
        # Test 3b: Agent tüm conversation'ları görebilir
        self.client.force_authenticate(user=self.agent)
        response = self.client.get('/api/support/conversations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 3)  # At least 3 conversations
        
        # Test 3c: Agent status filter kullanabilir
        response = self.client.get('/api/support/conversations/?status=waiting')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for conv in response.data:
            self.assertEqual(conv['status'], 'waiting')
            
    def test_4_get_conversation_details(self):
        """Test 4: Conversation detaylarını görüntüleme"""
        # Create a conversation with messages
        conversation = Conversation.objects.create(
            customer=self.user,
            status='active'
        )
        
        # Create messages
        message1 = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            is_from_agent=False,
            content='Hello, I need help'
        )
        message2 = Message.objects.create(
            conversation=conversation,
            sender=self.agent,
            is_from_agent=True,
            content='How can I help you?'
        )
        
        # Test 4a: Customer kendi conversation'ını görebilir
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.get(f'/api/support/conversations/{conversation.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], conversation.id)
        self.assertEqual(len(response.data['messages']), 2)
        
        # Test 4b: Başka bir user conversation'ı göremez
        self.user2_client.force_authenticate(user=self.user2)
        response = self.user2_client.get(f'/api/support/conversations/{conversation.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test 4c: Agent herhangi bir conversation'ı görebilir
        self.client.force_authenticate(user=self.agent)
        response = self.client.get(f'/api/support/conversations/{conversation.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], conversation.id)
        self.assertEqual(len(response.data['messages']), 2)
        
        # Verify message content
        messages = response.data['messages']
        self.assertEqual(messages[0]['content'], 'Hello, I need help')
        self.assertEqual(messages[0]['is_from_agent'], False)
        self.assertEqual(messages[1]['content'], 'How can I help you?')
        self.assertEqual(messages[1]['is_from_agent'], True)
        
    def test_5_get_customer_details(self):
        """Test 5: Customer details görüntüleme (agent için)"""
        # Create a conversation
        conversation = Conversation.objects.create(
            customer=self.user,
            agent=self.agent,
            status='active'
        )
        
        # Test 5a: Normal user customer details göremez
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.get(
            f'/api/support/conversations/{conversation.id}/customer-details/'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test 5b: Agent customer details görebilir
        self.client.force_authenticate(user=self.agent)
        response = self.client.get(
            f'/api/support/conversations/{conversation.id}/customer-details/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_id'], self.user.id)
        self.assertEqual(response.data['username'], self.user.username)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertIn('orders', response.data)
        self.assertIn('cart_items', response.data)
        self.assertIn('wishlist_items', response.data)
        self.assertIn('order_count', response.data)
        self.assertIn('cart_item_count', response.data)
        self.assertIn('wishlist_item_count', response.data)
        
        # Test 5c: Guest user conversation için customer details
        guest_conv = Conversation.objects.create(
            customer=None,
            guest_session_id='guest_test',
            status='active'
        )
        response = self.client.get(
            f'/api/support/conversations/{guest_conv.id}/customer-details/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'Guest User')
        self.assertIsNone(response.data['user_id'])
        self.assertEqual(response.data['order_count'], 0)
