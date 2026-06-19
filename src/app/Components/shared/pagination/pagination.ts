import { Component, EventEmitter, Input, Output } from '@angular/core';
import { getPageNumbers } from '../../../core/utils/pagination';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() totalItems = 0;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    return getPageNumbers(this.currentPage, this.totalPages);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }
}
