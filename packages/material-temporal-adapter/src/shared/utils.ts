/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

interface IntlLocaleWithWeekInfo {
  readonly weekInfo?: {readonly firstDay?: number};
  getWeekInfo?: () => {readonly firstDay?: number};
}

interface IntlWithLocale {
  readonly Locale?: new (locale: string) => IntlLocaleWithWeekInfo;
}

export function range(length: number): number[];
export function range(start: number, end: number): number[];
export function range(startOrLength: number, end?: number): number[] {
  const start = end === undefined ? 0 : startOrLength;
  const exclusiveEnd = end === undefined ? startOrLength : end;

  return Array.from({length: Math.max(exclusiveEnd - start, 0)}, (_, i) => start + i);
}

export function getDefaultLocale(): string {
  return Intl.DateTimeFormat().resolvedOptions().locale;
}

export function getLocaleFirstDayOfWeek(locale = getDefaultLocale()): number {
  const Locale = (Intl as IntlWithLocale).Locale;
  if (Locale === undefined) {
    return 1;
  }

  const localeInfo = new Locale(locale);
  return localeInfo.weekInfo?.firstDay ?? localeInfo.getWeekInfo?.().firstDay ?? 1;
}
