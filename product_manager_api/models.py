from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone



class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    
    class Meta:
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200)
    model = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    quantity_in_stock = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    warranty_status = models.CharField(max_length=200, blank=True)
    distributor = models.CharField(max_length=200, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    image_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.model})"
    
    def save(self, *args, **kwargs):
        if not self.cost and self.price:
            self.cost = self.price * 0.5
        super().save(*args, **kwargs)


class Order(models.Model):
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('in-transit', 'In Transit'),
        ('delivered', 'Delivered'),
    ]
    
    delivery_id = models.CharField(max_length=50, unique=True, db_index=True)
    customer_id = models.CharField(max_length=50, db_index=True)
    customer_name = models.CharField(max_length=200)
    customer_email = models.EmailField()
    # Product details moved to OrderItem
    total_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    delivery_address = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing', db_index=True)
    order_date = models.DateField()
    delivery_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-order_date', '-created_at']
        indexes = [
            models.Index(fields=['status', 'order_date']),
            models.Index(fields=['customer_id', 'order_date']),
        ]
    
    def __str__(self):
        return f"Order {self.delivery_id} - {self.customer_name} ({self.status})"
    
    def mark_as_delivered(self):
        if self.status != 'delivered':
            self.status = 'delivered'
            if not self.delivery_date:
                self.delivery_date = timezone.now().date()
            self.save()


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product_id = models.IntegerField()
    product_name = models.CharField(max_length=200)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    def __str__(self):
        return f"{self.quantity} x {self.product_name} in Order {self.order.delivery_id}"


class Review(models.Model):
    """Product reviews/comments that require approval"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    product_id = models.IntegerField(db_index=True)
    product_name = models.CharField(max_length=200)
    user_id = models.CharField(max_length=50, db_index=True)
    user_name = models.CharField(max_length=200)
    user_email = models.EmailField()
    rating = models.IntegerField(
        help_text='Rating from 1 to 5',
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product_id', 'status']),
            models.Index(fields=['user_id', 'product_id']),
        ]
    
    def __str__(self):
        return f"Review for {self.product_name} by {self.user_name} ({self.status})"


from django.contrib.auth.models import User

class Delivery(models.Model):
    """
    Specific Delivery List table as requested.
    Linked to Order, Product, and Customer (User).
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='deliveries')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deliveries', null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='deliveries')
    quantity = models.IntegerField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2) 
    delivery_address = models.TextField()
    is_completed = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Delivery"

    def __str__(self):
        return f"Delivery for Order {self.order.delivery_id} - {self.product.name}"


# Signal to sync Delivery status when Order is updated (e.g. from Admin)
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Order)
def sync_delivery_status(sender, instance, **kwargs):
    """
    When Order status changes, update linked Delivery items.
    """
    is_completed = (instance.status == 'delivered')
    # Update all linked delivery items
    instance.deliveries.update(is_completed=is_completed)



