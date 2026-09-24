import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { resolveImageUrl } from '../../shared/resolve-image-url';
import { ProductSelectionService } from '../../services/product-selection.service';
import { QuantitySelectorComponent } from '../../shared/quantity-selector/quantity-selector.component';
import { ProductSelectionComponent } from '../../shared/product-selection/product-selection.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QuantitySelectorComponent, ProductSelectionComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private selection = inject(ProductSelectionService);

  products: Product[] = [];
  categories: Category[] = [];
  activeCategory = '';
  searchTerm = '';
  offerOnly = false;
  loading = true;
  get hasSelection(): boolean { return this.selection.getProductCount() > 0; }

  get categoryGroups(): { category: Category | null; products: Product[] }[] {
    const groups = new Map<string, { category: Category | null; products: Product[] }>();
    for (const category of this.categories) groups.set(category._id, { category, products: [] });

    for (const product of this.products) {
      const category = typeof product.categoryId === 'object'
        ? product.categoryId
        : this.categories.find((candidate) => candidate._id === product.categoryId) ?? null;
      const key = category?._id ?? 'uncategorized';
      if (!groups.has(key)) groups.set(key, { category, products: [] });
      groups.get(key)!.products.push(product);
    }

    return [...groups.values()].filter((group) => group.products.length > 0);
  }

  trackCategoryGroup(_index: number, group: { category: Category | null }): string {
    return group.category?._id ?? 'uncategorized';
  }

  trackProduct(_index: number, product: Product): string {
    return product._id;
  }

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
    return this.selection.getQuantity(product._id);
  }

  setQuantity(product: Product, quantity: number) {
    this.selection.setQuantity(product, quantity);
  }

  getSelectedTotal(product: Product): number {
    return this.selection.getProductTotal(product);
  }
}
