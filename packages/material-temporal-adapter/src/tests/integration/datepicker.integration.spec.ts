import { Component, createEnvironmentInjector, NgZone } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { DateAdapter } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { describe, expect, it } from "vitest";

import { PlainDateAdapter, providePlainDateAdapter } from "../../plain-date";

@Component({
  standalone: true,
  imports: [
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <mat-form-field>
      <input matInput [matDatepicker]="picker" [formControl]="control" />
      <mat-datepicker #picker></mat-datepicker>
    </mat-form-field>
  `,
})
class DatepickerHostComponent {
  readonly control = new FormControl<Temporal.PlainDate | null>(null);
}

describe("datepicker integration", () => {
  it("wires MatDatepicker to PlainDateAdapter and typed FormControl values", () => {
    const injector = createEnvironmentInjector(
      [
        {
          provide: NgZone,
          useFactory: () => new NgZone({ enableLongStackTrace: false }),
        },
        ...providePlainDateAdapter(),
      ],
      null,
    );
    const host = new DatepickerHostComponent();
    const adapter = injector.runInContext(
      () => injector.get(DateAdapter) as PlainDateAdapter,
    );
    const date = adapter.createDate(2024, 0, 15);
    host.control.setValue(date);

    expect(injector.get(NgZone)).toBeInstanceOf(NgZone);
    expect(adapter).toBeInstanceOf(PlainDateAdapter);
    expect(date.toString()).toBe("2024-01-15");
    expect(adapter.isDateInstance(host.control.value)).toBe(true);
  });
});
