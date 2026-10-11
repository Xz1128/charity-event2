import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Event } from '../../models/event';
import { formatDate, formatMoney } from '../../utils/format';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  event: Event | null = null;
  form: FormGroup;
  loading = true;
  error = '';
  success = '';
  submitting = false;
  eventId: number | null = null;

  formatDate = formatDate;
  formatMoney = formatMoney;

  constructor(private route: ActivatedRoute, private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      phone: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(40)]],
      tickets: [1, [Validators.required, Validators.min(1), Validators.max(10)]]
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.error = 'No valid event was selected. Return to Search events and choose an event.';
      this.loading = false;
      return;
    }
    this.eventId = id;

    this.api.getEvent(id).subscribe({
      next: (event) => {
        this.event = event;
        this.loading = false;
        if (event.status === 'past') {
          this.error = 'Registration is closed for this past event.';
        }
      },
      error: (err: Error) => {
        this.error = err.message || 'Unable to load the selected event.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    this.error = '';
    this.success = '';
    if (!this.event || !this.eventId) {
      this.error = 'Please select a valid event first.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Please check your name, email, phone number, and ticket quantity (1–10).';
      return;
    }

    const { fullName, email, phone, tickets } = this.form.value;
    this.submitting = true;

    this.api.register(this.eventId, { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), tickets }).subscribe({
      next: () => {
        this.submitting = false;
        this.success = `Thank you, ${fullName.trim()}! Your registration is confirmed for ${this.event?.name}. You registered for ${tickets} ticket${tickets === 1 ? '' : 's'}.`;
        this.form.reset({ tickets: 1 });
      },
      error: (err: Error) => {
        this.submitting = false;
        this.error = err.message || 'Registration failed. Please try again.';
      }
    });
  }
}
