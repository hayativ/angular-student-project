import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CallsApiService } from '../../api/calls-api.service';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
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

  private qp$ = this.route.queryParamMap.pipe(
    map((p) => ({
      page: asInt(p.get('page'), 1),
      limit: asInt(p.get('limit'), 10),
      from: (p.get('from') ?? '').trim(),
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.qp$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ from }) => {
      if (this.fromCtrl.value !== from) this.fromCtrl.setValue(from, { emitEvent: false });
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
        this.setQuery({ from, page: 1 });
      });
  }

  res$ = this.qp$.pipe(
    switchMap(({ page, limit, from }) =>
      this.api.getCalls({ page, limit, status: 'all', from: from || undefined })
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

  private setQuery(partial: Partial<{ page: number; limit: number; from: string }>) {
    const cur = this.route.snapshot.queryParamMap;

    const merged = {
      page: asInt(cur.get('page'), 1),
      limit: asInt(cur.get('limit'), 10),
      from: (cur.get('from') ?? '').trim(),
      ...partial,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: merged,
      queryParamsHandling: '',
    });
  }
}
