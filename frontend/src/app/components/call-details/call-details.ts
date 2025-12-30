import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, switchMap, shareReplay, of, EMPTY, Subject, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { CallsApiService } from '../../api/calls-api.service';
import { Call } from '../../models/call.model';
import { CallTranscript } from '../../models/transcript.model';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  selector: 'app-call-details',
  templateUrl: './call-details.html',
  styleUrl: './call-details.css',
})
export class CallDetails {
  private route = inject(ActivatedRoute);
  private api = inject(CallsApiService);

  error: string | null = null;
  actionLoading = false;

  // Trigger for manual refresh after actions
  private refreshTrigger$ = new Subject<void>();

  // Main call data stream
  call$ = merge(
    this.route.paramMap,
    this.refreshTrigger$.pipe(map(() => this.route.snapshot.paramMap))
  ).pipe(
    switchMap(params => {
      const id = params.get('id');
      if (!id) {
        this.error = 'No call ID provided';
        return EMPTY;
      }
      this.error = null;
      return this.api.getCallById(id).pipe(
        catchError(err => {
          this.error = 'Failed to load call details';
          console.error('Error loading call:', err);
          return EMPTY;
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Transcript stream - only loads for completed calls
  transcript$ = this.call$.pipe(
    switchMap(call => {
      if (!call || call.status !== 'completed') {
        return of(null);
      }
      return this.api.getTranscript(call.id).pipe(
        catchError(err => {
          console.log('No transcript available:', err);
          return of(null);
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  onStartCall(id: string) {
    this.actionLoading = true;
    this.error = null;

    this.api.startCall(id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.refreshTrigger$.next();
      },
      error: (err) => {
        this.actionLoading = false;
        this.error = 'Failed to start call';
        console.error('Error starting call:', err);
      }
    });
  }

  onFinishCall(id: string) {
    this.actionLoading = true;
    this.error = null;

    this.api.finishCall(id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.refreshTrigger$.next();
      },
      error: (err) => {
        this.actionLoading = false;
        this.error = 'Failed to finish call';
        console.error('Error finishing call:', err);
      }
    });
  }

  canStart(call: Call): boolean {
    return call.status === 'scheduled';
  }

  canFinish(call: Call): boolean {
    return call.status === 'in_progress';
  }
}
