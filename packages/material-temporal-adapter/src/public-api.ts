/// <reference path="./temporal.d.ts" />

// Adapters
export {PlainDateAdapter} from './plain-date/plain-date-adapter';
export {PlainDateTimeAdapter} from './plain-datetime/plain-datetime-adapter';
export {ZonedDateTimeAdapter} from './zoned-datetime/zoned-datetime-adapter';

// Providers
export {providePlainDateAdapter} from './plain-date/provide-plain-date';
export {providePlainDateTimeAdapter} from './plain-datetime/provide-plain-datetime';
export {provideZonedDateTimeAdapter} from './zoned-datetime/provide-zoned-datetime';

// Options & tokens
export {type PlainDateOptions, MAT_TEMPORAL_PLAIN_DATE_OPTIONS} from './plain-date/plain-date-options';
export {type PlainDateTimeOptions, MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS} from './plain-datetime/plain-datetime-options';
export {type ZonedDateTimeOptions, MAT_TEMPORAL_ZONED_OPTIONS} from './zoned-datetime/zoned-datetime-options';

// Shared types
export type {
  TemporalBaseOptions,
  TemporalCalendarId,
  TemporalDisambiguation,
  TemporalOffsetOption,
  TemporalRoundingMode,
  TemporalRoundingUnit,
  TemporalRoundingOptions,
} from './shared/types';

// Helpers
export {isTemporalInvalid} from './shared/invalid';

// Formats
export {MAT_TEMPORAL_DATE_FORMATS} from './formats/date-formats';
export {MAT_TEMPORAL_DATETIME_FORMATS} from './formats/datetime-formats';
export {MAT_TEMPORAL_ZONED_FORMATS} from './formats/zoned-formats';

// Base
export {BaseTemporalAdapter} from './shared/base-temporal-adapter';
