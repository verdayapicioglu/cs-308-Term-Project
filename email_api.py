#!/usr/bin/env python
import os
import django
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

# Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.core.mail import send_mail
from django.utils import timezone

@csrf_exempt
@require_http_methods(["POST"])
def send_order_email_api(request):
    """API endpoint for sending order emails"""
    try:
        data = json.loads(request.body)
        user_email = data.get('user_email')
        user_name = data.get('user_name', 'Müşteri')
        order_id = data.get('order_id')
        amount = data.get('amount')
        currency = data.get('currency', 'TRY')
        items = data.get('items', [])
        
        # Ürün listesi oluştur
        items_text = ""
        if items:
            items_text = "\n🛒 Sipariş Edilen Ürünler:\n"
            for item in items:
                item_total = (item.get('quantity', 1) * item.get('price', 0))
                items_text += f"• {item.get('name', 'Ürün')} x{item.get('quantity', 1)} = {item_total} {currency}\n"
        else:
            items_text = "\n🛒 Ürün detayları mevcut değil.\n"
        
        # Email içeriği
        subject = f"🐾 Pet Store - Sipariş Onayı #{order_id}"
        message = f"""
Merhaba {user_name}!

Siparişiniz başarıyla tamamlandı! 🎉

📋 Sipariş Detayları:
• Sipariş No: {order_id}
• Tarih: {timezone.now().strftime('%d.%m.%Y %H:%M')}
{items_text}
💰 Toplam Tutar: {amount} {currency}

Siparişiniz en kısa sürede hazırlanacak ve size ulaştırılacaktır.

Teşekkürler! 🐕🐱
Pet Store Ekibi

---
Bu otomatik bir mesajdır, lütfen yanıtlamayın.
        """
        
        # Email gönder
        send_mail(
            subject=subject,
            message=message,
            from_email='almiraaygun@gmail.com',
            recipient_list=[user_email],
            fail_silently=False,
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Email sent to {user_email}'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

if __name__ == "__main__":
    # Test için
    print("Email API endpoint hazır!")


