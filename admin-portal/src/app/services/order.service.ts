import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface OrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  _id: string;
  customerName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  address?: string;
  source?: string;
  status?: string;
  items: OrderItem[];
  orderPrice?: number;
  packagingPrice?: number;
  totalAmount: number;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/admin/orders`;

  list() {
    return this.http.get<Order[]>(this.base);
  }

  downloadPdf(id: string) {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }

  updateStatus(id: string, status: 'pending' | 'confirmed' | 'completed') {
    return this.http.patch<Order>(`${this.base}/${id}/status`, { status });
  }

  remove(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }

  removeCompleted() {
    return this.http.delete<{ deleted: boolean; deletedCount: number }>(`${this.base}/completed`);
  }
}
