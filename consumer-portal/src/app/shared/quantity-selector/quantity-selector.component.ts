import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-quantity-selector',
  standalone: true,
  templateUrl: './quantity-selector.component.html',
  styleUrl: './quantity-selector.component.css',
})
export class QuantitySelectorComponent {
  @Input({ required: true }) quantity = 1;
  @Input() compact = false;
  @Output() quantityChange = new EventEmitter<number>();

  decrease() {
    this.quantityChange.emit(Math.max(1, this.quantity - 1));
  }

  increase() {
    this.quantityChange.emit(this.quantity + 1);
  }
}
