import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Order, OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  // no sanitizer used — map preview intentionally omitted in admin orders

  orders: Order[] = [];
  loading = true;
  statusOptions: Array<'pending' | 'confirmed' | 'completed'> = ['pending', 'confirmed', 'completed'];
  selectedFilter: 'all' | 'pending' | 'confirmed' | 'completed' = 'all';

  ngOnInit() {
    this.load();
  }

  get filteredOrders(): Order[] {
    if (this.selectedFilter === 'all') return this.orders;
    return this.orders.filter(o => (o.status || 'pending') === this.selectedFilter);
  }

  get completedOrdersCount(): number {
    return this.orders.filter((order) => order.status === 'completed').length;
  }

  // getMapEmbed removed — admin view will not render embedded maps

  load() {
    this.loading = true;
    this.orderService.list().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  updateStatus(order: Order, status: 'pending' | 'confirmed' | 'completed') {
    if (!order?._id) return;
    this.orderService.updateStatus(order._id, status).subscribe({
      next: () => this.load(),
      error: () => this.load(),
    });
  }

  deleteOrder(order: Order) {
    if (!order?._id) return;
    const ok = confirm(`Delete order for ${order.customerName || 'this customer'}? This cannot be undone.`);
    if (!ok) return;
    this.orderService.remove(order._id).subscribe({
      next: () => this.load(),
      error: () => alert('Failed to delete order'),
    });
  }

  deleteCompleted() {
    const completedCount = this.completedOrdersCount;
    if (!completedCount) return;
    const ok = confirm(`Permanently delete all ${completedCount} completed orders? This cannot be undone.`);
    if (!ok) return;
    this.orderService.removeCompleted().subscribe({
      next: () => this.load(),
      error: () => alert('Failed to delete completed orders'),
    });
  }
}
