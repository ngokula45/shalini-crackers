import { Component, ElementRef, HostListener, Input, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductSelectionService } from '../../services/product-selection.service';
import { QuantitySelectorComponent } from '../quantity-selector/quantity-selector.component';
import { resolveImageUrl } from '../resolve-image-url';

@Component({
  selector: 'app-product-selection',
  standalone: true,
  imports: [CommonModule, QuantitySelectorComponent],
  templateUrl: './product-selection.component.html',
})
export class ProductSelectionComponent {
  private selection = inject(ProductSelectionService);
  private cart = inject(CartService);
  private router = inject(Router);

  @Input() returnCategory: string | null = null;
  @Input() returnQuery: string | null = null;
  @Input() returnOffer = false;
  @ViewChild('reviewPanel') private reviewPanel?: ElementRef<HTMLElement>;
  @ViewChild('reviewCloseButton') private reviewCloseButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('reviewButton') private reviewButton?: ElementRef<HTMLButtonElement>;

  addingToCart = false;
  reviewOpen = false;

  get selectedProductCount(): number { return this.selection.getProductCount(); }
  get selectedProductList(): Product[] { return this.selection.getProducts(); }
  get selectedQuantityCount(): number { return this.selection.getQuantityCount(); }
  get selectionSubtotal(): number { return this.selection.getSubtotal(); }
  get selectionPricesAvailable(): boolean { return !this.selection.hasUnpricedProducts(); }

  getQuantity(product: Product): number {
    return this.selection.getQuantity(product._id);
  }

  getSelectedTotal(product: Product): number {
    return this.selection.getProductTotal(product);
  }

  canShowProductTotal(product: Product): boolean {
    const unitPrice = product.priceMode === 'offer' ? product.offerPrice ?? product.price : product.price;
    return product.showPrice && unitPrice != null;
  }

  getCategoryName(product: Product): string {
    return typeof product.categoryId === 'object' ? product.categoryId.name : 'Product';
  }

  resolveImageUrl(url?: string | null): string {
    return resolveImageUrl(url);
  }

  trackProduct(_index: number, product: Product): string {
    return product._id;
  }

  setQuantity(product: Product, quantity: number) {
    this.selection.setQuantity(product, quantity);
  }

  clearSelection() {
    this.selection.clear();
  }

  openReviewSelection() {
    this.reviewOpen = true;
    setTimeout(() => this.reviewCloseButton?.nativeElement.focus());
  }

  closeReviewSelection() {
    this.reviewOpen = false;
    setTimeout(() => this.reviewButton?.nativeElement.focus());
  }

  removeSelectedProduct(product: Product) {
    this.setQuantity(product, 0);
  }

  addSelectedToCart() {
    if (this.addingToCart) return;
    const items = this.selection.getProducts()
      .map((product) => ({ product, quantity: this.getQuantity(product) }))
      .filter((item) => item.quantity > 0);
    if (!items.length) return;

    this.addingToCart = true;
    this.cart.addMany(items);
    this.selection.clear();
    this.router.navigate(['/cart'], {
      queryParams: {
        returnCategory: this.returnCategory || null,
        returnQ: this.returnQuery || null,
        returnOffer: this.returnOffer ? 'true' : null,
      },
    }).then((navigated) => {
      if (!navigated) this.addingToCart = false;
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleReviewKeydown(event: KeyboardEvent) {
    if (!this.reviewOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeReviewSelection();
      return;
    }
    if (event.key !== 'Tab' || !this.reviewPanel) return;

    const focusable = this.reviewPanel.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
