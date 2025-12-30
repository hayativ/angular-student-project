import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CallsApiService } from '../../api/calls-api.service';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

function asInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
type PageBtn = { type: 'page'; key: string; value: number } | { type: 'dots'; key: string };

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  selector: 'app-calls',
  templateUrl: './calls.html',
  styleUrl: './calls.css',
})
export class Calls {
  private api = inject(CallsApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  fromCtrl = new FormControl('', { nonNullable: true });
  toCtrl = new FormControl('', { nonNullable: true });
  activeRange: 'today' | 'week' | 'month' | null = null;

  private qp$ = this.route.queryParamMap.pipe(
    map((p) => ({
      page: asInt(p.get('page'), 1),
      limit: asInt(p.get('limit'), 10),
      from: (p.get('from') ?? '').trim(),
      to: (p.get('to') ?? '').trim(),
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.qp$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ from, to }) => {
      if (this.fromCtrl.value !== from) this.fromCtrl.setValue(from, { emitEvent: false });
      if (this.toCtrl.value !== to) this.toCtrl.setValue(to, { emitEvent: false });
    });

    this.fromCtrl.valueChanges
      .pipe(
        startWith(this.fromCtrl.value),
        map((v) => v.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((from) => {
        this.activeRange = null; // Clear range when user manually edits
        this.setQuery({ from, page: 1 });
      });

    this.toCtrl.valueChanges
      .pipe(
        startWith(this.toCtrl.value),
        map((v) => v.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((to) => {
        this.activeRange = null; // Clear range when user manually edits
        this.setQuery({ to, page: 1 });
      });
  }

  // Refresh trigger - combines initial load with updates from other components
  private refreshTrigger$ = merge(
    of(null), // Initial trigger
    this.api.callUpdated$.pipe(
      filter(call => call !== null),
      map(() => null)
    )
  );

  res$ = combineLatest([this.qp$, this.refreshTrigger$]).pipe(
    switchMap(([{ page, limit, from, to }]) =>
      this.api.getCalls({ page, limit, status: 'all', from: from || undefined, to: to || undefined })
    ),
    catchError(() => of(null)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  setPage(page: number) {
    if (page < 1) return;
    this.setQuery({ page });
  }

  pageButtons(page: number, total: number): PageBtn[] {
    if (total <= 1) return [];

    const out: PageBtn[] = [];
    const clamp = (v: number) => Math.max(1, Math.min(total, v));

    const core = new Set<number>([1, 2, total - 1, total, clamp(page - 1), page, clamp(page + 1)]);

    const pages = Array.from(core)
      .filter((n) => n >= 1 && n <= total)
      .sort((a, b) => a - b);

    let prev = 0;
    for (const p of pages) {
      if (prev && p - prev > 1) out.push({ type: 'dots', key: `d${prev}_${p}` });
      out.push({ type: 'page', key: `p${p}`, value: p });
      prev = p;
    }

    return out;
  }

  setToday() {
    const today = this.formatDate(new Date());
    this.activeRange = 'today';
    this.setQuery({ from: today, to: today, page: 1 });
  }

  setThisWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const monday = new Date(now);
    // Calculate days to subtract to get to Monday (ISO week starts on Monday)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(now.getDate() - daysToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    this.activeRange = 'week';
    this.setQuery({ from: this.formatDate(monday), to: this.formatDate(sunday), page: 1 });
  }

  setThisMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.activeRange = 'month';
    this.setQuery({ from: this.formatDate(firstDay), to: this.formatDate(lastDay), page: 1 });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private setQuery(partial: Partial<{ page: number; limit: number; from: string; to: string }>) {
    const cur = this.route.snapshot.queryParamMap;

    const merged = {
      page: asInt(cur.get('page'), 1),
      limit: asInt(cur.get('limit'), 10),
      from: (cur.get('from') ?? '').trim(),
      to: (cur.get('to') ?? '').trim(),
      ...partial,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: merged,
      queryParamsHandling: '',
    });
  }
}
