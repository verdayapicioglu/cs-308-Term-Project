from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Conversation, Message, SupportAgent, CannedResponse


class SupportAgentsTestCase(TestCase):
    """Test cases for Support Agents functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create regular user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
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
        
    def test_3_close_conversation(self):
        """Test 3: Conversation kapatma"""
        # Create an active conversation
        conversation = Conversation.objects.create(
            customer=self.user,
            agent=self.agent,
            status='active'
        )
        
        # Test 3a: Normal user kapatamaz
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.post(
            f'/api/support/conversations/{conversation.id}/close/',
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test 3b: Staff/admin kapatabilir
        self.client.force_authenticate(user=self.agent)
        response = self.client.post(
            f'/api/support/conversations/{conversation.id}/close/',
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'closed')
        self.assertIsNotNone(response.data['closed_at'])
        
        # Refresh from database
        conversation.refresh_from_db()
        self.assertEqual(conversation.status, 'closed')
        self.assertIsNotNone(conversation.closed_at)
        
    def test_4_update_conversation_priority_tags_notes(self):
        """Test 4: Conversation güncelleme (priority, tags, notes)"""
        # Create a conversation
        conversation = Conversation.objects.create(
            customer=self.user,
            agent=self.agent,
            status='active',
            priority='medium',
            tags='',
            internal_notes=''
        )
        
        # Test 4a: Normal user güncelleyemez
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.put(
            f'/api/support/conversations/{conversation.id}/update/',
            {
                'priority': 'high',
                'tags': 'urgent,refund',
                'internal_notes': 'Customer needs urgent help'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test 4b: Staff/admin güncelleyebilir
        self.client.force_authenticate(user=self.agent)
        response = self.client.put(
            f'/api/support/conversations/{conversation.id}/update/',
            {
                'priority': 'high',
                'tags': 'urgent,refund',
                'internal_notes': 'Customer needs urgent help'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 'high')
        self.assertEqual(response.data['tags'], 'urgent,refund')
        self.assertEqual(response.data['internal_notes'], 'Customer needs urgent help')
        
        # Refresh from database
        conversation.refresh_from_db()
        self.assertEqual(conversation.priority, 'high')
        self.assertEqual(conversation.tags, 'urgent,refund')
        self.assertEqual(conversation.internal_notes, 'Customer needs urgent help')
        
    def test_5_canned_responses_crud(self):
        """Test 5: Canned responses CRUD işlemleri"""
        # Test 5a: Normal user erişemez
        self.regular_client.force_authenticate(user=self.user)
        response = self.regular_client.get('/api/support/canned-responses/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test 5b: Staff/admin canned response oluşturabilir
        self.client.force_authenticate(user=self.agent)
        response = self.client.post(
            '/api/support/canned-responses/',
            {
                'title': 'Order Status',
                'content': 'Your order is being processed.',
                'category': 'Order'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Order Status')
        self.assertEqual(response.data['usage_count'], 0)
        canned_response_id = response.data['id']
        
        # Test 5c: Canned response listelenebilmeli
        response = self.client.get('/api/support/canned-responses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        
        # Test 5d: Canned response kullanım sayısı artmalı
        response = self.client.post(
            f'/api/support/canned-responses/{canned_response_id}/use/',
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['usage_count'], 1)
        
        # Use again
        response = self.client.post(
            f'/api/support/canned-responses/{canned_response_id}/use/',
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['usage_count'], 2)
        
        # Test 5e: Canned response güncellenebilmeli
        response = self.client.put(
            f'/api/support/canned-responses/{canned_response_id}/',
            {
                'title': 'Order Status Updated',
                'content': 'Your order has been shipped.',
                'category': 'Order'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Order Status Updated')
        
        # Test 5f: Canned response silinebilmeli
        response = self.client.delete(
            f'/api/support/canned-responses/{canned_response_id}/'
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify it's deleted - check list doesn't contain it
        response = self.client.get('/api/support/canned-responses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        remaining_ids = [item['id'] for item in response.data]
        self.assertNotIn(canned_response_id, remaining_ids)
        
        # Test 5g: Category filter çalışmalı
        # Create another response with different category
        response = self.client.post(
            '/api/support/canned-responses/',
            {
                'title': 'Refund Policy',
                'content': 'Refunds are processed within 5-7 business days.',
                'category': 'Refund'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Filter by category
        response = self.client.get('/api/support/canned-responses/?category=Refund')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['category'], 'Refund')
