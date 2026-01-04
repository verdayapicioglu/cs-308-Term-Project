#!/usr/bin/env python
"""
Script to make a user a support agent
Usage: python make_support_agent.py <username>
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.contrib.auth.models import User
from support_agents.models import SupportAgent

def make_support_agent(username):
    try:
        user = User.objects.get(username=username)
        
        # Make user staff
        user.is_staff = True
        user.save()
        print(f"✓ {username} is now staff")
        
        # Create SupportAgent profile
        agent, created = SupportAgent.objects.get_or_create(user=user)
        if created:
            print(f"✓ SupportAgent profile created for {username}")
        else:
            print(f"✓ SupportAgent profile already exists for {username}")
        
        print(f"\n✅ {username} is now a support agent!")
        print(f"   - Staff status: {user.is_staff}")
        print(f"   - Can access: /support/dashboard")
        
    except User.DoesNotExist:
        print(f"❌ User '{username}' not found!")
        print("\nAvailable users:")
        for u in User.objects.all():
            print(f"  - {u.username} (staff: {u.is_staff})")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python make_support_agent.py <username>")
        print("\nAvailable users:")
        for u in User.objects.all():
            print(f"  - {u.username} (staff: {u.is_staff})")
        sys.exit(1)
    
    username = sys.argv[1]
    make_support_agent(username)

