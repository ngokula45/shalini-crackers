import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { resolveImageUrl } from '../../shared/resolve-image-url';
import { CartService } from '../../services/cart.service';
import { QuantitySelectorComponent } from '../../shared/quantity-selector/quantity-selector.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QuantitySelectorComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cart = inject(CartService);

  products: Product[] = [];
  categories: Category[] = [];
  activeCategory = '';
  searchTerm = '';
  offerOnly = false;
  loading = true;
  quantities: Record<string, number> = {};

  ngOnInit() {
    this.api.getCategories().subscribe({ next: (c) => (this.categories = c) });

    this.route.queryParams.subscribe((params) => {
      this.activeCategory = params['category'] || '';
      this.searchTerm = params['q'] || '';
      this.offerOnly = params['offer'] === 'true';
      this.loadProducts();
    });
  }

  loadProducts() {
    this.loading = true;
    this.api
      .getProducts({ category: this.activeCategory || undefined, q: this.searchTerm || undefined })
      .subscribe({
        next: (p) => {
          this.products = this.offerOnly ? p.filter((product) => product.priceMode === 'offer') : p;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  selectCategory(slug: string) {
    this.router.navigate(['/products'], { queryParams: { category: slug || null, q: this.searchTerm || null } });
  }

  onSearch() {
    this.router.navigate(['/products'], { queryParams: { category: this.activeCategory || null, q: this.searchTerm || null } });
  }

  resolveImageUrl(url?: string | null): string {
    return resolveImageUrl(url);
  }

  getDisplayPrice(product: Product): string {
    if (!product.showPrice) return '—';
    if (product.priceMode === 'offer') {
      const offer = product.offerPrice ?? product.price;
      const original = product.originalPrice ?? product.price;
      return offer != null ? `₹${offer}` : original != null ? `₹${original}` : '—';
    }
    return product.price != null ? `₹${product.price}` : '—';
  }

  getOriginalPrice(product: Product): number | null {
    if (product.priceMode === 'offer') {
      return product.originalPrice ?? product.price ?? null;
    }
    return product.price ?? null;
  }

  getSavings(product: Product): number | null {
    if (product.priceMode !== 'offer' || product.originalPrice == null || product.offerPrice == null) return null;
    return Math.max(0, product.originalPrice - product.offerPrice);
  }

  getQuantity(product: Product): number {
    return this.quantities[product._id] ?? 1;
  }

  setQuantity(product: Product, quantity: number) {
    this.quantities[product._id] = Math.max(1, quantity);
  }

  addToCart(product: Product) {
    this.cart.add(product, this.getQuantity(product));
    this.router.navigate(['/cart']);
  }
}
