# @arlequins/utils

Small shared utilities for TypeScript/JavaScript projects.

**Requirements:** Node.js >= 24.x

## Installation

```sh
npm install @arlequins/utils
```

## Exports

The package entry re-exports:

### Date (`date.ts`, dayjs)

- Constants: `DATETIME_FORMAT`, `DATE_FORMAT`, `TIME_FORMAT`
- `setTime`, `isDayJs`, `getDaysBetween` — dayjs is configured with UTC, timezone, Japanese locale, and quarter-of-year plugins.

### Transform (`transform.ts`)

- `convertKeysToSnakeCase`, `convertKeysToCamelCase` — recursively convert plain object keys (skips class instances, `Date`, etc.).

## License

MIT
