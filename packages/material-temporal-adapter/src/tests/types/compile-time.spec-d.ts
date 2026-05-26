import { expectTypeOf } from "expect-type";

import {
  provideZonedDateTimeAdapter,
  type ZonedDateTimeOptions,
} from "../../zoned-datetime";

expectTypeOf<
  Parameters<typeof provideZonedDateTimeAdapter>[0]
>().toEqualTypeOf<ZonedDateTimeOptions>();
expectTypeOf<
  Parameters<typeof provideZonedDateTimeAdapter>[0]
>().not.toEqualTypeOf<undefined>();

provideZonedDateTimeAdapter({ timezone: "UTC" });

// @ts-expect-error timezone is required.
const badOptions: ZonedDateTimeOptions = { calendar: "iso8601" };

// @ts-expect-error timezone is required.
provideZonedDateTimeAdapter({ calendar: "iso8601" });

void badOptions;
