import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { SiteSettings } from '../models/site-settings.model';

// Thin wrapper around HttpClient for all public (unauthenticated) endpoints
// the consumer portal needs. Keeping this centralized makes it trivial to
// swap the base URL per environment (see src/environments/*).
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  // These public catalogue values are read by several components during one
  // visit (the header, home page and products page). Keep one shared request
  // and its response for the lifetime of the open site, instead of making the
  // visitor download the same data again when navigating between pages.
  private categoriesRequest?: Observable<Category[]>;
  private settingsRequest?: Observable<SiteSettings>;
  private productRequests = new Map<string, Observable<Product[]>>();

  getCategories() {
    this.categoriesRequest ??= this.http
      .get<Category[]>(`${this.base}/categories`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.categoriesRequest;
  }

  getCategory(slug: string) {
    return this.http.get<Category>(`${this.base}/categories/${slug}`);
  }

  getProducts(params?: { category?: string; q?: string }) {
    let query = '';
    if (params?.category || params?.q) {
      const usp = new URLSearchParams();
      if (params.category) usp.set('category', params.category);
      if (params.q) usp.set('q', params.q);
      query = `?${usp.toString()}`;
    }
    const key = query || 'all';
    let request = this.productRequests.get(key);
    if (!request) {
      request = this.http
        .get<Product[]>(`${this.base}/products${query}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.productRequests.set(key, request);
    }
    return request;
  }

  getProduct(slug: string) {
    return this.http.get<Product>(`${this.base}/products/${slug}`);
  }

  getSiteSettings() {
    this.settingsRequest ??= this.http
      .get<SiteSettings>(`${this.base}/site-settings/public`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.settingsRequest;
  }
}
