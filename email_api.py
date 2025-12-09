#!/usr/bin/env python
import os
import django
import json
import base64
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.mail import EmailMessage
from django.utils import timezone

# Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

@csrf_exempt
@require_http_methods(["POST"])
def send_order_email_api(request):
    """API endpoint for sending order emails with PDF attachment"""
    try:
        data = json.loads(request.body)
        user_email = data.get('user_email')
        user_name = data.get('user_name', 'Customer')  # 'Müşteri' -> 'Customer'
        order_id = data.get('order_id')
        amount = data.get('amount')
        currency = data.get('currency', 'TRY')
        items = data.get('items', [])
        pdf_base64 = data.get('pdf_base64')
        
        # Build item list string
        items_text = ""
        if items:
            items_text = "\n🛒 Ordered Items:\n"
            for item in items:
                item_total = (item.get('quantity', 1) * item.get('price', 0))
                # Using English formatting for item details
                items_text += f"• {item.get('name', 'Product')} x{item.get('quantity', 1)} = {item_total} {currency}\n"
        
        # Email Content in English
        subject = f"🐾 Pet Store - Order Confirmation #{order_id}"
        message_body = f"""
Hello {user_name}!

Your order has been successfully completed! 🎉

Your order details and invoice are attached (PDF).

📋 Order Summary:
• Order No: {order_id}
• Date: {timezone.now().strftime('%d.%m.%Y %H:%M')}
{items_text}
💰 Total Amount: {amount} {currency}

Thank you for choosing us! 🐕🐱
Pet Store Team
        """
        
        # Create Email Object
        email = EmailMessage(
            subject=subject,
            body=message_body,
            from_email='almiraaygun@gmail.com',
            to=[user_email],
        )

        # Attach PDF if available
        if pdf_base64:
            try:
                # Decode Base64 string to binary
                pdf_data = base64.b64decode(pdf_base64)
                email.attach(f'Invoice-{order_id}.pdf', pdf_data, 'application/pdf')
            except Exception as pdf_err:
                print(f"PDF attachment error: {pdf_err}")

        # Send Email
        email.send(fail_silently=False)
        
        return JsonResponse({
            'success': True,
            'message': f'Email with PDF sent to {user_email}'
        })
        
    except Exception as e:
        print("API Error:", str(e))
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

if __name__ == "__main__":
    print("Email API (English) ready!")