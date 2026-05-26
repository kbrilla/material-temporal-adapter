import {JsonPipe} from '@angular/common';
import {Component, Input, OnChanges, SimpleChanges, inject} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DateAdapter} from '@angular/material/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSelectModule} from '@angular/material/select';
import {MatTimepickerModule} from '@angular/material/timepicker';
import {Temporal} from 'temporal-polyfill';

export type TemporalDemoValue =
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime;

interface AdapterTestResult {
  name: string;
  category: string;
  expected: string;
  actual: string;
  passed: boolean;
}

@Component({
  selector: 'demo-temporal-datepicker',
  imports: [
    JsonPipe,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>{{ title }}</mat-card-title>
        <mat-card-subtitle>{{ subtitle }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field appearance="outline">
          <mat-label>Select a date</mat-label>
          <input matInput [matDatepicker]="picker" [formControl]="dateControl" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker [startView]="startView" />
        </mat-form-field>

        <section class="info-section">
          <h4>Selected Value:</h4>
          <pre>{{ dateControl.value | json }}</pre>

          @if (dateControl.value; as date) {
            <h4>Adapter Methods:</h4>
            <ul>
              <li><strong>Year:</strong> {{ adapter.getYear(date) }}</li>
              <li><strong>Month (0-indexed):</strong> {{ adapter.getMonth(date) }}</li>
              <li><strong>Day:</strong> {{ adapter.getDate(date) }}</li>
              <li><strong>Day of Week:</strong> {{ adapter.getDayOfWeek(date) }}</li>
              <li><strong>ISO String:</strong> {{ adapter.toIso8601(date) }}</li>
              <li><strong>Is Valid:</strong> {{ adapter.isValid(date) }}</li>
            </ul>
          }
        </section>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      mat-card {
        max-width: 560px;
        margin: 20px auto;
      }

      mat-form-field {
        width: 100%;
      }

      .info-section {
        background: #f5f5f5;
        border-radius: 4px;
        margin-top: 16px;
        padding: 16px;
      }

      pre {
        background: white;
        border-radius: 4px;
        overflow-x: auto;
        padding: 8px;
      }

      ul {
        list-style: none;
        padding: 0;
      }
    `,
  ],
})
export class TemporalDatepickerDemoComponent implements OnChanges {
  protected readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly dateControl = new FormControl<TemporalDemoValue | null>(null);

  @Input() title = 'Temporal Datepicker Demo';
  @Input() subtitle = 'Using a split Temporal adapter';
  @Input() startView: 'month' | 'year' | 'multi-year' = 'month';
  @Input() initialValue = '2026-05-26';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue']) {
      this.setInitialValue();
    }
  }

  protected setInitialValue(): void {
    const parsed = this.adapter.parse(this.initialValue, null);
    this.dateControl.setValue(parsed);
  }
}

@Component({
  selector: 'demo-temporal-timepicker',
  imports: [
    JsonPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTimepickerModule,
    ReactiveFormsModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>{{ title }}</mat-card-title>
        <mat-card-subtitle>{{ subtitle }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field appearance="outline">
          <mat-label>Select a time</mat-label>
          <input matInput [matTimepicker]="picker" [formControl]="timeControl" />
          <mat-timepicker-toggle matIconSuffix [for]="picker" />
          <mat-timepicker #picker />
        </mat-form-field>

        <section class="info-section">
          <h4>Selected Time:</h4>
          @if (timeControl.value; as time) {
            <div class="time-display">
              {{ padZero(adapter.getHours(time)) }}:{{ padZero(adapter.getMinutes(time)) }}:{{
                padZero(adapter.getSeconds(time))
              }}
            </div>

            <h4>Time Components:</h4>
            <ul>
              <li><strong>Hours:</strong> {{ adapter.getHours(time) }}</li>
              <li><strong>Minutes:</strong> {{ adapter.getMinutes(time) }}</li>
              <li><strong>Seconds:</strong> {{ adapter.getSeconds(time) }}</li>
            </ul>
          }
        </section>

        <section class="raw-value">
          <h4>Raw Temporal Value:</h4>
          <pre>{{ timeControl.value | json }}</pre>
        </section>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      mat-card {
        max-width: 560px;
        margin: 20px auto;
      }

      mat-form-field {
        width: 100%;
      }

      .info-section,
      .raw-value {
        border-radius: 4px;
        margin-top: 16px;
        padding: 16px;
      }

      .info-section {
        background: #f5f5f5;
      }

      .raw-value {
        background: #fff3e0;
      }

      .time-display {
        background: #1976d2;
        border-radius: 4px;
        color: white;
        font-family: monospace;
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 16px;
        padding: 16px;
        text-align: center;
      }

      pre {
        background: white;
        border-radius: 4px;
        overflow-x: auto;
        padding: 8px;
      }
    `,
  ],
})
export class TemporalTimepickerDemoComponent {
  protected readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly timeControl = new FormControl(this.adapter.today());

  @Input() title = 'Temporal Timepicker Demo';
  @Input() subtitle = 'Using a time-capable split Temporal adapter';

  protected padZero(value: number): string {
    return value.toString().padStart(2, '0');
  }
}

@Component({
  selector: 'demo-temporal-calendar-arithmetic',
  imports: [
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Calendar Arithmetic Demo</mat-card-title>
        <mat-card-subtitle>Add and subtract days, months, and years</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field appearance="outline">
          <mat-label>Base date</mat-label>
          <input matInput [matDatepicker]="picker" [formControl]="dateControl" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>

        @if (dateControl.value; as date) {
          <section class="operations">
            <h4>Calendar Operations:</h4>
            <div class="operation-row">
              <span>+7 days:</span>
              <code>{{ formatDate(adapter.addCalendarDays(date, 7)) }}</code>
            </div>
            <div class="operation-row">
              <span>-7 days:</span>
              <code>{{ formatDate(adapter.addCalendarDays(date, -7)) }}</code>
            </div>
            <div class="operation-row">
              <span>+1 month:</span>
              <code>{{ formatDate(adapter.addCalendarMonths(date, 1)) }}</code>
            </div>
            <div class="operation-row">
              <span>-1 month:</span>
              <code>{{ formatDate(adapter.addCalendarMonths(date, -1)) }}</code>
            </div>
            <div class="operation-row">
              <span>+1 year:</span>
              <code>{{ formatDate(adapter.addCalendarYears(date, 1)) }}</code>
            </div>
            <div class="operation-row">
              <span>-1 year:</span>
              <code>{{ formatDate(adapter.addCalendarYears(date, -1)) }}</code>
            </div>
          </section>

          <section class="info-section">
            <h4>Month Info:</h4>
            <p><strong>Days in month:</strong> {{ adapter.getNumDaysInMonth(date) }}</p>
            <p><strong>First day of week:</strong> {{ dayName(adapter.getFirstDayOfWeek()) }}</p>
          </section>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      mat-card {
        max-width: 560px;
        margin: 20px auto;
      }

      mat-form-field {
        width: 100%;
      }

      .operations,
      .info-section {
        border-radius: 4px;
        margin-top: 16px;
        padding: 16px;
      }

      .operations {
        background: #e3f2fd;
      }

      .info-section {
        background: #f5f5f5;
      }

      .operation-row {
        border-bottom: 1px solid #bbdefb;
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }
    `,
  ],
})
export class TemporalCalendarArithmeticComponent {
  protected readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly dateControl = new FormControl(this.adapter.today());
  private readonly dayNames = this.adapter.getDayOfWeekNames('long');

  protected formatDate(date: TemporalDemoValue): string {
    return this.adapter.format(date, {year: 'numeric', month: 'short', day: 'numeric'});
  }

  protected dayName(index: number): string {
    return this.dayNames[index] ?? String(index);
  }
}

@Component({
  selector: 'demo-temporal-date-range',
  imports: [
    JsonPipe,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Date Range Picker Demo</mat-card-title>
        <mat-card-subtitle>Select start and end dates</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field appearance="outline">
          <mat-label>Enter a date range</mat-label>
          <mat-date-range-input [rangePicker]="rangePicker">
            <input matStartDate [formControl]="startDate" placeholder="Start date" />
            <input matEndDate [formControl]="endDate" placeholder="End date" />
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="rangePicker" />
          <mat-date-range-picker #rangePicker />
        </mat-form-field>

        <section class="info-section">
          <h4>Selected Range:</h4>
          <div class="range-info">
            <div class="date-box">
              <span class="label">Start:</span>
              <span>{{ startDate.value ? formatDate(startDate.value) : 'Not selected' }}</span>
            </div>
            <div class="date-box">
              <span class="label">End:</span>
              <span>{{ endDate.value ? formatDate(endDate.value) : 'Not selected' }}</span>
            </div>
          </div>

          @if (startDate.value && endDate.value) {
            <h4>Duration:</h4>
            <p class="duration">{{ calculateDuration() }} days</p>
          }
        </section>

        <section class="raw-values">
          <h4>Raw Temporal Values:</h4>
          <pre>Start: {{ startDate.value | json }}</pre>
          <pre>End: {{ endDate.value | json }}</pre>
        </section>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      mat-card {
        max-width: 560px;
        margin: 20px auto;
      }

      mat-form-field {
        width: 100%;
      }

      .info-section,
      .raw-values {
        border-radius: 4px;
        margin-top: 16px;
        padding: 16px;
      }

      .info-section {
        background: #f5f5f5;
      }

      .raw-values {
        background: #e8f5e9;
      }

      .range-info {
        display: flex;
        gap: 16px;
      }

      .date-box {
        background: white;
        border-radius: 4px;
        flex: 1;
        padding: 12px;
        text-align: center;
      }

      .label {
        color: #666;
        display: block;
        font-size: 12px;
      }

      .duration {
        color: #1976d2;
        font-size: 24px;
        font-weight: 700;
      }
    `,
  ],
})
export class TemporalDateRangeDemoComponent {
  protected readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly startDate = new FormControl<TemporalDemoValue | null>(null);
  protected readonly endDate = new FormControl<TemporalDemoValue | null>(null);

  protected formatDate(date: TemporalDemoValue): string {
    return this.adapter.format(date, {year: 'numeric', month: 'short', day: 'numeric'});
  }

  protected calculateDuration(): number {
    if (!this.startDate.value || !this.endDate.value) {
      return 0;
    }

    let days = 0;
    let current = this.adapter.clone(this.startDate.value);

    while (this.adapter.compareDate(current, this.endDate.value) < 0 && days < 10000) {
      days++;
      current = this.adapter.addCalendarDays(current, 1);
    }

    return days;
  }
}

@Component({
  selector: 'demo-adapter-explorer',
  imports: [
    JsonPipe,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <mat-card class="wide-card">
      <mat-card-header>
        <mat-card-title>Adapter Method Explorer</mat-card-title>
        <mat-card-subtitle>Interactive controls for common adapter operations</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <section>
          <h3>Base Date</h3>
          <mat-form-field appearance="outline">
            <mat-label>Select base date</mat-label>
            <input matInput [matDatepicker]="picker" [formControl]="baseDateControl" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
        </section>

        @if (baseDateControl.value; as base) {
          <section class="grid">
            <div>
              <span class="label">getYear()</span>
              <strong>{{ adapter.getYear(base) }}</strong>
            </div>
            <div>
              <span class="label">getMonth()</span>
              <strong>{{ adapter.getMonth(base) }}</strong>
            </div>
            <div>
              <span class="label">getDate()</span>
              <strong>{{ adapter.getDate(base) }}</strong>
            </div>
            <div>
              <span class="label">getNumDaysInMonth()</span>
              <strong>{{ adapter.getNumDaysInMonth(base) }}</strong>
            </div>
          </section>

          <section class="operation">
            <h3>Calendar Arithmetic</h3>
            <div>
              {{ adapter.toIso8601(base) }} + {{ amountControl.value }} {{ unitControl.value }} =
              <strong>{{ adapter.toIso8601(calculatedDate()) }}</strong>
            </div>
          </section>
        }

        <section>
          <h3>Date Comparison</h3>
          <mat-form-field appearance="outline">
            <mat-label>Compare with</mat-label>
            <input matInput [matDatepicker]="comparePicker" [formControl]="compareDateControl" />
            <mat-datepicker-toggle matIconSuffix [for]="comparePicker" />
            <mat-datepicker #comparePicker />
          </mat-form-field>

          @if (baseDateControl.value && compareDateControl.value) {
            <div class="method">
              <code>compareDate(base, compare)</code>
              <strong>{{ adapter.compareDate(baseDateControl.value, compareDateControl.value) }}</strong>
            </div>
          }
        </section>

        <section>
          <h3>Parsing</h3>
          <mat-form-field appearance="outline">
            <mat-label>Parse string</mat-label>
            <input matInput [formControl]="parseInputControl" placeholder="2026-05-26" />
          </mat-form-field>

          @if (parsedDate(); as parsed) {
            <p><strong>Parsed:</strong> {{ adapter.toIso8601(parsed) }}</p>
          }
        </section>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .wide-card {
        max-width: 900px;
        margin: 20px auto;
      }

      mat-form-field {
        width: 100%;
      }

      section {
        margin-bottom: 20px;
      }

      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .grid > div,
      .operation,
      .method {
        background: #f5f5f5;
        border-radius: 4px;
        padding: 12px;
      }

      .label {
        color: #666;
        display: block;
        font-size: 12px;
      }

      code {
        margin-right: 12px;
      }
    `,
  ],
})
export class AdapterExplorerDemoComponent {
  protected readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly baseDateControl = new FormControl(this.adapter.createDate(2026, 4, 26));
  protected readonly compareDateControl = new FormControl<TemporalDemoValue | null>(null);
  protected readonly amountControl = new FormControl(1);
  protected readonly unitControl = new FormControl<'days' | 'months' | 'years'>('years');
  protected readonly parseInputControl = new FormControl('2026-05-26');

  protected calculatedDate(): TemporalDemoValue {
    const base = this.baseDateControl.value ?? this.adapter.today();
    const amount = this.amountControl.value ?? 0;

    switch (this.unitControl.value) {
      case 'days':
        return this.adapter.addCalendarDays(base, amount);
      case 'months':
        return this.adapter.addCalendarMonths(base, amount);
      case 'years':
      default:
        return this.adapter.addCalendarYears(base, amount);
    }
  }

  protected parsedDate(): TemporalDemoValue | null {
    return this.adapter.parse(this.parseInputControl.value, null);
  }
}

@Component({
  selector: 'demo-material-examples',
  imports: [
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTimepickerModule,
  ],
  template: `
    <div class="examples-container">
      <h1>Material Components Demo Copy</h1>
      <p>Examples adapted from Angular Material documentation and backed by split Temporal adapters.</p>

      <mat-card>
        <mat-card-header><mat-card-title>Basic Datepicker</mat-card-title></mat-card-header>
        <mat-card-content>
          <mat-form-field>
            <mat-label>Choose a date</mat-label>
            <input matInput [matDatepicker]="picker" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header><mat-card-title>Datepicker with Min and Max</mat-card-title></mat-card-header>
        <mat-card-content>
          <mat-form-field>
            <mat-label>Choose a date</mat-label>
            <input matInput [min]="minDate" [max]="maxDate" [matDatepicker]="rangeLimitedPicker" />
            <mat-datepicker-toggle matIconSuffix [for]="rangeLimitedPicker" />
            <mat-datepicker #rangeLimitedPicker />
          </mat-form-field>
          <p>Min: {{ adapter.toIso8601(minDate) }}<br />Max: {{ adapter.toIso8601(maxDate) }}</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header><mat-card-title>Date Range Picker</mat-card-title></mat-card-header>
        <mat-card-content>
          <mat-form-field>
            <mat-label>Enter a date range</mat-label>
            <mat-date-range-input [rangePicker]="rangePicker">
              <input matStartDate placeholder="Start date" />
              <input matEndDate placeholder="End date" />
            </mat-date-range-input>
            <mat-datepicker-toggle matIconSuffix [for]="rangePicker" />
            <mat-date-range-picker #rangePicker />
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      @if (showTimepicker) {
        <mat-card>
          <mat-card-header><mat-card-title>Basic Timepicker</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-form-field>
              <mat-label>Pick a time</mat-label>
              <input matInput [matTimepicker]="timepicker" />
              <mat-timepicker-toggle matIconSuffix [for]="timepicker" />
              <mat-timepicker #timepicker />
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .examples-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px;
      }

      mat-card {
        max-width: 560px;
      }
    `,
  ],
})
export class MaterialExamplesDemoComponent {
  protected readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly minDate = this.adapter.addCalendarDays(this.adapter.today(), -7);
  protected readonly maxDate = this.adapter.addCalendarDays(this.adapter.today(), 7);

  @Input() showTimepicker = false;
}

@Component({
  selector: 'demo-temporal-playground',
  imports: [
    JsonPipe,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTimepickerModule,
    ReactiveFormsModule,
  ],
  template: `
    <div class="playground">
      <mat-card>
        <mat-card-header><mat-card-title>Datepicker</mat-card-title></mat-card-header>
        <mat-card-content>
          <mat-form-field>
            <mat-label>Choose a date</mat-label>
            <input matInput [matDatepicker]="picker" [formControl]="dateControl" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header><mat-card-title>Date Range</mat-card-title></mat-card-header>
        <mat-card-content>
          <mat-form-field>
            <mat-label>Enter a date range</mat-label>
            <mat-date-range-input [rangePicker]="rangePicker">
              <input matStartDate placeholder="Start date" />
              <input matEndDate placeholder="End date" />
            </mat-date-range-input>
            <mat-datepicker-toggle matIconSuffix [for]="rangePicker" />
            <mat-date-range-picker #rangePicker />
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      @if (showTimepicker) {
        <mat-card>
          <mat-card-header><mat-card-title>Timepicker</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-form-field>
              <mat-label>Choose time</mat-label>
              <input matInput [matTimepicker]="timepicker" [formControl]="dateControl" />
              <mat-timepicker-toggle matIconSuffix [for]="timepicker" />
              <mat-timepicker #timepicker />
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      }

      <section class="adapter-info">
        <h4>Adapter State</h4>
        <pre>{{ adapterState() | json }}</pre>
      </section>
    </div>
  `,
  styles: [
    `
      .playground {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        padding: 24px;
      }

      .adapter-info {
        background: #f5f5f5;
        border-radius: 4px;
        grid-column: 1 / -1;
        padding: 16px;
      }
    `,
  ],
})
export class TemporalPlaygroundDemoComponent {
  protected readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly dateControl = new FormControl(this.adapter.today());

  @Input() showTimepicker = false;
  @Input() label = 'PlainDate';

  protected adapterState(): Record<string, string | boolean> {
    const today = this.adapter.today();

    return {
      adapter: this.label,
      today: this.adapter.toIso8601(today),
      valid: this.adapter.isValid(today),
      formatted: this.adapter.format(today, {year: 'numeric', month: 'short', day: 'numeric'}),
    };
  }
}

@Component({
  selector: 'demo-edge-cases',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Edge Cases Test Suite</mat-card-title>
        <mat-card-subtitle>Boundary conditions and invalid value handling</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <button mat-raised-button color="primary" (click)="runTests()">Run Edge Case Tests</button>

        @if (tests.length > 0) {
          <div class="summary">
            {{ passedCount() }}/{{ tests.length }} passed
            <mat-icon [style.color]="allPassed() ? 'green' : 'red'">
              {{ allPassed() ? 'check_circle' : 'error' }}
            </mat-icon>
          </div>

          <mat-accordion>
            @for (test of tests; track test.name) {
              <mat-expansion-panel [class.passed]="test.passed" [class.failed]="!test.passed">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <mat-icon [style.color]="test.passed ? 'green' : 'red'">
                      {{ test.passed ? 'check' : 'close' }}
                    </mat-icon>
                    {{ test.name }}
                  </mat-panel-title>
                </mat-expansion-panel-header>
                <p><strong>Expected:</strong> {{ test.expected }}</p>
                <p><strong>Actual:</strong> {{ test.actual }}</p>
              </mat-expansion-panel>
            }
          </mat-accordion>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      mat-card {
        max-width: 840px;
        margin: 20px auto;
      }

      .summary {
        align-items: center;
        display: flex;
        font-size: 18px;
        font-weight: 500;
        gap: 8px;
        margin: 16px 0;
      }

      mat-expansion-panel.passed {
        border-left: 4px solid green;
      }

      mat-expansion-panel.failed {
        border-left: 4px solid red;
      }
    `,
  ],
})
export class EdgeCasesDemoComponent {
  private readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected tests: AdapterTestResult[] = [];

  protected passedCount(): number {
    return this.tests.filter((test) => test.passed).length;
  }

  protected allPassed(): boolean {
    return this.tests.every((test) => test.passed);
  }

  protected runTests(): void {
    const leapDay = this.adapter.createDate(2024, 1, 29);
    const invalid = this.adapter.invalid();
    const jan31 = this.adapter.createDate(2024, 0, 31);
    const feb29 = this.adapter.addCalendarMonths(jan31, 1);
    const parsedNull = this.adapter.parse(null, null);

    this.tests = [
      {
        name: 'Leap year February',
        category: 'Calendar',
        expected: '29 days',
        actual: `${this.adapter.getNumDaysInMonth(leapDay)} days`,
        passed: this.adapter.getNumDaysInMonth(leapDay) === 29,
      },
      {
        name: 'Jan 31 + 1 month',
        category: 'Overflow',
        expected: 'February 29',
        actual: this.adapter.toIso8601(feb29),
        passed: this.adapter.getMonth(feb29) === 1 && this.adapter.getDate(feb29) === 29,
      },
      {
        name: 'Invalid date handling',
        category: 'Invalid',
        expected: 'isValid false',
        actual: String(this.adapter.isValid(invalid)),
        passed: !this.adapter.isValid(invalid),
      },
      {
        name: 'Null parsing',
        category: 'Parsing',
        expected: 'null',
        actual: String(parsedNull),
        passed: parsedNull === null,
      },
    ];
  }
}

@Component({
  selector: 'demo-matrix-test-suite',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTimepickerModule,
    ReactiveFormsModule,
  ],
  template: `
    <mat-card class="test-suite">
      <mat-card-header>
        <mat-card-title>Temporal Adapter Matrix Test Suite</mat-card-title>
        <mat-card-subtitle>
          <mat-chip-set>
            <mat-chip>{{ adapterLabel }}</mat-chip>
            <mat-chip>{{ calendarLabel }}</mat-chip>
          </mat-chip-set>
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="summary-bar">
          <span class="score">{{ passedCount() }}/{{ tests.length }} tests passed</span>
          <mat-progress-bar
            mode="determinate"
            [value]="tests.length > 0 ? (passedCount() / tests.length) * 100 : 0"
          />
          <span [class]="allPassed() ? 'status-pass' : 'status-fail'">
            {{ allPassed() ? '✓ All Passed' : '✗ Some Failed' }}
          </span>
        </div>

        <button mat-raised-button color="primary" (click)="runAllTests()">Run All Tests</button>

        <div class="component-row">
          <mat-form-field appearance="outline">
            <mat-label>Datepicker</mat-label>
            <input matInput [matDatepicker]="picker" [formControl]="dateControl" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>

          @if (includeTimepicker) {
            <mat-form-field appearance="outline">
              <mat-label>Timepicker</mat-label>
              <input matInput [matTimepicker]="timePicker" [formControl]="dateControl" />
              <mat-timepicker-toggle matIconSuffix [for]="timePicker" />
              <mat-timepicker #timePicker />
            </mat-form-field>
          }
        </div>

        <mat-accordion class="test-results">
          @for (test of tests; track test.name) {
            <mat-expansion-panel [class.passed]="test.passed" [class.failed]="!test.passed">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>{{ test.passed ? 'check' : 'close' }}</mat-icon>
                  <span class="test-name">{{ test.name }}</span>
                </mat-panel-title>
                <mat-panel-description>{{ test.category }}</mat-panel-description>
              </mat-expansion-panel-header>
              <div><strong>Expected:</strong> <code>{{ test.expected }}</code></div>
              <div><strong>Actual:</strong> <code>{{ test.actual }}</code></div>
            </mat-expansion-panel>
          }
        </mat-accordion>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .test-suite {
        max-width: 1000px;
        margin: 20px auto;
      }

      .summary-bar {
        align-items: center;
        background: #f5f5f5;
        border-radius: 8px;
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
        padding: 12px;
      }

      .summary-bar mat-progress-bar {
        flex: 1;
      }

      .status-pass {
        color: #4caf50;
        font-weight: 600;
      }

      .status-fail {
        color: #f44336;
        font-weight: 600;
      }

      .component-row {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin: 24px 0;
      }

      .component-row mat-form-field {
        flex: 1;
        min-width: 250px;
      }

      mat-expansion-panel.passed {
        border-left: 4px solid #4caf50;
      }

      mat-expansion-panel.failed {
        border-left: 4px solid #f44336;
      }
    `,
  ],
})
export class MatrixTestSuiteDemoComponent {
  private readonly adapter = inject(DateAdapter<TemporalDemoValue>);
  protected readonly dateControl = new FormControl(this.adapter.today());
  protected tests: AdapterTestResult[] = [];

  @Input() adapterLabel = 'PlainDate';
  @Input() calendarLabel = 'iso8601';
  @Input() includeTimepicker = false;

  protected passedCount(): number {
    return this.tests.filter((test) => test.passed).length;
  }

  protected allPassed(): boolean {
    return this.tests.length > 0 && this.tests.every((test) => test.passed);
  }

  protected runAllTests(): void {
    const today = this.adapter.today();
    const created = this.adapter.createDate(2026, 4, 26);
    const plusWeek = this.adapter.addCalendarDays(created, 7);
    const clone = this.adapter.clone(created);
    const invalid = this.adapter.invalid();
    const parsed = this.adapter.parse(this.adapter.toIso8601(created), null);

    this.tests = [
      {
        name: 'createDate returns configured value',
        category: 'Core API',
        expected: '2026-05-26',
        actual: this.adapter.toIso8601(created),
        passed: this.adapter.getYear(created) === 2026 && this.adapter.getDate(created) === 26,
      },
      {
        name: 'addCalendarDays advances a week',
        category: 'Arithmetic',
        expected: '7 days later',
        actual: this.adapter.toIso8601(plusWeek),
        passed: this.adapter.compareDate(plusWeek, created) > 0,
      },
      {
        name: 'clone preserves date equality',
        category: 'Core API',
        expected: 'sameDate true',
        actual: String(this.adapter.sameDate(created, clone)),
        passed: this.adapter.sameDate(created, clone),
      },
      {
        name: 'invalid is not valid',
        category: 'Invalid',
        expected: 'false',
        actual: String(this.adapter.isValid(invalid)),
        passed: !this.adapter.isValid(invalid),
      },
      {
        name: 'parse round-trips ISO text',
        category: 'Parsing',
        expected: 'sameDate true',
        actual: parsed ? this.adapter.toIso8601(parsed) : 'null',
        passed: parsed !== null && this.adapter.sameDate(created, parsed),
      },
      {
        name: 'today returns a valid adapter instance',
        category: 'Integration',
        expected: 'valid Temporal value',
        actual: this.adapter.toIso8601(today),
        passed: this.adapter.isDateInstance(today) && this.adapter.isValid(today),
      },
    ];
  }
}
