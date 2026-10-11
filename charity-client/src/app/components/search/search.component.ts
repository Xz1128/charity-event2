import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Category, Event } from '../../models/event';
import { EventCardComponent } from '../../shared/event-card/event-card.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EventCardComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit {
  form: FormGroup;
  categories: Category[] = [];
  results: Event[] = [];
  loading = false;
  message = '';
  messageType: 'error' | 'empty' | 'info' = 'info';
  searched = false;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      date: [''],
      location: [''],
      categoryId: ['']
    });
  }

  ngOnInit(): void {
    this.api.getCategories().subscribe({
      next: (categories) => (this.categories = categories),
      error: () => {
        this.showMessage('Categories could not be loaded, but you can still search by date or location.', 'error');
      }
    });
  }

  onSubmit(): void {
    const { date, location, categoryId } = this.form.value;
    if (!date && !location && !categoryId) {
      this.showMessage('Select at least one filter before searching: date, location, or category.', 'error');
      return;
    }

    this.loading = true;
    this.results = [];
    this.message = '';
    this.searched = true;

    this.api.searchEvents({ date, location, categoryId }).subscribe({
      next: (events) => {
        this.results = events;
        this.loading = false;
        if (!events.length) {
          this.showMessage('No events matched those filters. Try another date, suburb, or category.', 'empty');
        } else {
          this.showMessage(`${events.length} event${events.length === 1 ? '' : 's'} found.`, 'info');
        }
      },
      error: (err: Error) => {
        this.loading = false;
        this.showMessage(err.message || 'Search failed. Please check your filters and try again.', 'error');
      }
    });
  }

  clearFilters(): void {
    this.form.reset({ date: '', location: '', categoryId: '' });
    this.results = [];
    this.message = '';
    this.searched = false;
  }

  private showMessage(text: string, type: 'error' | 'empty' | 'info'): void {
    this.message = text;
    this.messageType = type;
  }
}
