import {NgZone, type Provider} from '@angular/core';
import {MAT_DATE_LOCALE} from '@angular/material/core';

/** Common providers for adapter unit/integration tests. */
export function testInjectorProviders(...providers: Provider[]): Provider[] {
  return [
    {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
    {provide: MAT_DATE_LOCALE, useValue: 'en-US'},
    ...providers,
  ];
}
