#!/usr/bin/env python
import os
import django

# Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.core.mail import send_mail

def send_order_email(user_email, order_details):
    """Basit sipariş onay emaili gönder"""
    subject = "🐾 Pet Store - Sipariş Onayı"
    message = f"""
Merhaba!

Siparişiniz başarıyla alındı! 🎉

Sipariş Detayları:
{order_details}

Teşekkürler!
Pet Store Ekibi
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email='almiraaygun@gmail.com',
            recipient_list=[user_email],
            fail_silently=False,
        )
        print(f"✅ Email gönderildi: {user_email}")
        return True
    except Exception as e:
        print(f"❌ Email hatası: {e}")
        return False

if __name__ == "__main__":
    # Test - Kendi Gmail adresine gönder
    test_email = "almiraaygun@gmail.com"
    test_details = "Test Ürün x1 - 100 TL"
    send_order_email(test_email, test_details)


