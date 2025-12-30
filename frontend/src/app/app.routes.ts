import { Routes } from '@angular/router';
import { Calls } from './components/calls/calls';
import { CallDetails } from './components/call-details/call-details';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'calls' },
  { path: 'calls', component: Calls, title: 'Calls' },
  { path: 'calls/:id', component: CallDetails, title: 'Call Details' },
  { path: '**', redirectTo: 'calls' },
];
