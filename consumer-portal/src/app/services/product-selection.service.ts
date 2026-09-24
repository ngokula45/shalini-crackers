import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductSelectionService {
  private selectedProducts = new Map<string, Product>();
  private quantities: Record<string, number> = {};

  getQuantity(productId: string): number {
    return this.quantities[productId] ?? 0;
  }

  setQuantity(product: Product, quantity: number) {
    const selectedQuantity = Math.max(0, Math.floor(quantity));
    this.quantities[product._id] = selectedQuantity;
    if (selectedQuantity > 0) this.selectedProducts.set(product._id, product);
    else this.selectedProducts.delete(product._id);
  }

  getProducts(): Product[] {
    return [...this.selectedProducts.values()];
  }

  getProductCount(): number {
    return this.selectedProducts.size;
  }

  getQuantityCount(): number {
    return [...this.selectedProducts.keys()].reduce((total, id) => total + this.getQuantity(id), 0);
  }

  getProductTotal(product: Product): number {
    const unitPrice = product.priceMode === 'offer' ? (product.offerPrice ?? product.price ?? 0) : (product.price ?? 0);
    return unitPrice * this.getQuantity(product._id);
  }

  hasUnpricedProducts(): boolean {
    return this.getProducts().some((product) => {
      const unitPrice = product.priceMode === 'offer' ? product.offerPrice ?? product.price : product.price;
      return !product.showPrice || unitPrice == null;
    });
  }

  getSubtotal(): number {
    return this.getProducts().reduce((total, product) => total + this.getProductTotal(product), 0);
  }

  clear() {
    this.quantities = {};
    this.selectedProducts.clear();
  }
}
