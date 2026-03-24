# Project Conventions

## Translation / i18n

### Structure
- Translation files: `lib/i18n/locales/{locale}.json`
- Supported locales: `en` (English), `id` (Indonesian)
- Namespace-based organization (e.g., `common`, `dashboard`, `worker`, `business`)

### Adding Translation Keys

1. **Always add keys to BOTH locale files** (`en.json` AND `id.json`)
2. **Key format**: Use dot notation for namespacing (e.g., `dashboard.upcomingBookings`)
3. **Key naming conventions**:
   - Use camelCase for key names
   - Use descriptive, specific names (e.g., `noUpcomingBookings` not `noBookings`)
   - Group related keys under shared namespace

### Adding New Namespace
If adding a new namespace (e.g., `dashboard`), add it to **both** files with identical structure:
```json
"dashboard": {
  "key1": "Value 1",
  "key2": "Value 2"
}
```

### Lint Check
Run translation lint before committing:
```bash
npm run lint:translations
```

This will detect:
- Missing keys (keys used in code but not defined in translation file)
- Unused keys (keys defined but not used in code)

### Common Issues
- **Raw text displayed in UI**: Usually means the translation key is missing from the locale files
- **Key not resolving**: Check for typos, correct namespace usage, and that key exists in both locale files

### Important Namespaces
| Namespace | Description |
|-----------|-------------|
| `common` | Shared UI elements (buttons, labels, etc.) |
| `dashboard` | Worker/Business dashboard specific text |
| `worker` | Worker-specific content |
| `business` | Business-specific content |
| `navigation` | Navigation menu items |
| `auth` | Authentication flows |
| `jobs` | Job marketplace |
| `bookings` | Booking management |
| `attendance` | Attendance tracking |
| `wallet` | Wallet/earnings |
| `profile` | User profiles |

## Code Style

- Use `cn()` utility for className merging
- Use `useTranslation` hook from `@/lib/i18n/hooks` for translations
- Prefer Server Components unless `"use client"` directive is needed
