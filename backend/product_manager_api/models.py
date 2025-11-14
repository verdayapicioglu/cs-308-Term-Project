from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

class Product(models.Model):
    name = models.CharField(max_length=200)
    model = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    quantity_in_stock = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    warranty_status = models.CharField(max_length=200, blank=True)
    distributor = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=100)
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
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
    product_id = models.IntegerField()
    product_name = models.CharField(max_length=200)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
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

