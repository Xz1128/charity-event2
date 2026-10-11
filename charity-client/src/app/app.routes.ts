import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent) },
  { path: 'search', loadComponent: () => import('./components/search/search.component').then((m) => m.SearchComponent) },
  { path: 'event/:id', loadComponent: () => import('./components/event-detail/event-detail.component').then((m) => m.EventDetailComponent) },
  { path: 'register/:id', loadComponent: () => import('./components/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'contact', loadComponent: () => import('./components/contact/contact.component').then((m) => m.ContactComponent) },
  { path: '**', redirectTo: '' }
];
