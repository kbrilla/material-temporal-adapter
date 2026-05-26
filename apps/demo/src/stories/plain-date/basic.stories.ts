import {Component} from '@angular/core';
import {ReactiveFormsModule, FormControl} from '@angular/forms';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';
import {Temporal} from 'temporal-polyfill';

import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

@Component({
  selector: 'demo-plain-date-datepicker',
  imports: [MatDatepickerModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>PlainDate</mat-label>
      <input matInput [matDatepicker]="picker" [formControl]="date" />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker />
      <mat-hint>Selected value: {{ isoValue }}</mat-hint>
    </mat-form-field>
  `,
})
class PlainDateDatepickerStory {
  protected readonly date = new FormControl<Temporal.PlainDate | null>(
    Temporal.PlainDate.from('2026-05-26'),
  );

  protected get isoValue(): string {
    return this.date.value?.toString() ?? 'none';
  }
}

const meta: Meta<PlainDateDatepickerStory> = {
  title: 'PlainDate/Basic',
  component: PlainDateDatepickerStory,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync(), providePlainDateAdapter()],
    }),
  ],
};

export default meta;

type Story = StoryObj<PlainDateDatepickerStory>;

export const Basic: Story = {};
