
import os
import django
import sys
import re

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from product_manager_api.models import Product

def normalize(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())

def sync_images():
    images_dir = os.path.join(os.getcwd(), 'public', 'images')
    if not os.path.exists(images_dir):
        print("Images directory not found")
        return

    current_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    file_map = {}
    for f in current_files:
        norm = normalize(os.path.splitext(f)[0])
        file_map[norm] = f

    products = Product.objects.all()
    updated = 0
    
    for product in products:
        p_name = normalize(product.name)
        match = None
        
        if p_name in file_map:
            match = file_map[p_name]
        else:
            for norm_f, real_f in file_map.items():
                if p_name in norm_f or norm_f in p_name:
                    match = real_f
                    break
        
        if match:
            new_url = f"/images/{match}"
            # Force update if null or different
            if product.image_url != new_url:
                product.image_url = new_url
                product.save()
                print(f"Updated {product.name} -> {new_url}")
                updated += 1
        
    print(f"Sync complete. Updated {updated} products.")

if __name__ == '__main__':
    sync_images()
