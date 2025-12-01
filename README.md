# Banking in Chat — Prototype

This prototype explores the ideas captured in the image:

![image1](image1)

- Problem: Schedule payments
  - Load bills easily using chat
  - Monthly calendar for bills with prioritization if budget is limited
  - Loan/trust/credit score (mock) indicators
  - Reminders
- Budgeting
- Dashboard
- Stone hit (gamified points)
- Suggestions (financial tips)
- OTP each month (mock refresh)

## Getting Started

1. Download all files and place them in the same folder.
2. Open `index.html` in your browser.

Data is persisted to localStorage automatically. Use the Settings tab to export, import, or reset your data.

## Features

### Persistence (LocalStorage)
- Auto-saves on key actions (bill create/delete/update, payments, budget changes)
- Versioned storage schema with migration support
- Export/Import JSON data
- Reset data with confirmation

### Recurring Bills
- Set bills as recurring (monthly) when creating
- Automatic generation of next month's occurrence when paid
- "R" badge displayed on recurring bills in calendar and table

### Weighted Prioritization
- Toggle between simple and weighted prioritization in Settings
- Weights consider: scheduled status, category importance, amount

### Partial Payments
- Pay bills partially using the "Partial" button
- Track remaining amounts with "P" badge
- Amount displays as "paid/total" format when partially paid

### Subscription Management
- Cancel streaming subscriptions (prevents future recurrence)
- Canceled bills shown with strikethrough styling

## Chat Commands

### Basic Commands
- `Add Meralco 1500 due 2025-12-05` - Add a bill
- `Add recurring Netflix 549 due 2025-12-20 monthly` - Add a recurring bill
- `Schedule payment Meralco 1500 on 2025-12-05` - Schedule a payment
- `Prioritize bills if monthly budget is 3000` - Prioritize bills

### Payment Commands
- `Pay partial Meralco 500` - Make a partial payment

### Prioritization Commands
- `Enable weighted prioritization` - Enable weighted prioritization
- `Disable weighted prioritization` - Disable weighted prioritization

### View Commands
- `Show reminders` - View all reminders
- `Show recurring` - View all recurring bills

### Subscription Commands
- `Cancel subscription Netflix` - Cancel a subscription

### Other
- `Renew OTP` - Renew monthly OTP

## Notes

- Prioritization uses a simple heuristic: scheduled first, lower amounts next, then earlier due dates. It marks items beyond the monthly budget as overflow.
- Weighted prioritization considers category importance (essentials weighted higher).
- Trust score and on-time rate are playful mock metrics for visualization.
- "Stone hit" adds points via a claimable streak button.
- Budgeting form computes allocations and sets the usable monthly bill budget.

This is a concept-only UI to validate flows before backend/API integrations.