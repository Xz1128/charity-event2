import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Organisation } from '../../models/event';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent implements OnInit {
  organisation: Organisation | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getOrganisation().subscribe({
      next: (org) => (this.organisation = org),
      error: () => {
        // Static fallback keeps the page usable when the API is down.
        this.organisation = {
          organisationId: 1,
          name: 'Harbour Hope Foundation',
          tagline: 'Local hearts. Lasting change.',
          welcomeMessage: '',
          mission: '',
          email: 'hello@harbourhope.org.au',
          phone: '(07) 5550 2140',
          address: '12 Marine Parade, Southport QLD 4215',
          city: 'Gold Coast',
          website: ''
        };
      }
    });
  }

  onSendMessage(): void {
    alert('This feature is currently under construction.');
  }
}
