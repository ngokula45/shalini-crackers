import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'cracker-shop-cart';

  private read(): CartItem[] {
    const raw = localStorage.getItem(this.storageKey);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private write(items: CartItem[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  getItems(): CartItem[] {
    return this.read();
  }

  add(product: Product, quantity = 1) {
    const amount = Math.max(1, Math.floor(quantity) || 1);
    this.addMany([{ product, quantity: amount }]);
  }

  addMany(entries: { product: Product; quantity: number }[]) {
    const items = this.read();
    for (const { product, quantity } of entries) {
      const amount = Math.max(0, Math.floor(quantity));
      if (!amount) continue;

      const existing = items.find((item) => item.product._id === product._id);
      if (existing) {
        existing.quantity += amount;
      } else {
        items.push({ product, quantity: amount });
      }
    }
    if (entries.length) this.write(items);
  }

  remove(productId: string) {
    const items = this.read().filter((item) => item.product._id !== productId);
    this.write(items);
  }

  updateQuantity(productId: string, quantity: number) {
    const items = this.read();
    const item = items.find((entry) => entry.product._id === productId);
    if (!item) return;
    item.quantity = Math.max(1, quantity);
    this.write(items);
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }

  getTotal(): number {
    return this.getItems().reduce((sum, item) => {
      const price = item.product.priceMode === 'offer' ? (item.product.offerPrice ?? item.product.price) : item.product.price;
      return sum + ((price ?? 0) * item.quantity);
    }, 0);
  }
}
