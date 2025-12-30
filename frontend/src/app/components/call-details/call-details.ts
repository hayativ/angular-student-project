import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-call-details',
  templateUrl: './call-details.html',
  styleUrl: './call-details.css',
})
export class CallDetails {
  private route = inject(ActivatedRoute);
  id$ = this.route.paramMap.pipe(map((p) => p.get('id') || ''));
  constructor() {}
}
