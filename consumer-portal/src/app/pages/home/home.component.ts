import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Category } from '../../models/category.model';
import { SiteSettings } from '../../models/site-settings.model';
import { Product } from '../../models/product.model';
import { resolveImageUrl } from '../../shared/resolve-image-url';
import { CartService } from '../../services/cart.service';
import { QuantitySelectorComponent } from '../../shared/quantity-selector/quantity-selector.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, QuantitySelectorComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private cart = inject(CartService);
  private router = inject(Router);
  categories: Category[] = [];
  settings: SiteSettings | null = null;
  loading = true;
  offerProducts: Product[] = [];
  quantities: Record<string, number> = {};

  ngOnInit() {
    this.api.getSiteSettings().subscribe({ next: (s) => (this.settings = s) });
    this.api.getCategories().subscribe({
      next: (c) => {
        this.categories = c;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
    this.api.getProducts().subscribe({
      next: (products) => (this.offerProducts = products.filter((product) => product.priceMode === 'offer').slice(0, 4)),
    });
  }

  resolveCategoryIcon(name: string): string {
    const value = name.toLowerCase();
    if (value.includes('spark')) return '✦';
    if (value.includes('rocket')) return '↗';
    if (value.includes('flower') || value.includes('pot')) return '✹';
    if (value.includes('gift') || value.includes('box')) return '▣';
    return '✷';
  }

  getSavings(product: Product): number | null {
    if (product.priceMode !== 'offer' || product.originalPrice == null || product.offerPrice == null) return null;
    return Math.max(0, product.originalPrice - product.offerPrice);
  }

  resolveImageUrl(url?: string | null): string {
    return resolveImageUrl(url);
  }

  getQuantity(product: Product): number {
    return this.quantities[product._id] ?? 0;
  }

  setQuantity(product: Product, quantity: number) {
    this.quantities[product._id] = Math.max(0, quantity);
  }

  addToCart(product: Product) {
    const quantity = this.getQuantity(product);
    if (quantity < 1) return;
    this.cart.add(product, quantity);
    this.router.navigate(['/cart']);
  }

  getSelectedTotal(product: Product): number {
    return (product.offerPrice ?? product.price ?? 0) * this.getQuantity(product);
  }
}
