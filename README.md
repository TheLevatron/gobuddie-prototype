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

No backend is required; all data is stored in-memory for demonstration.

## Chat Commands

- `Add Meralco 1500 due 2025-12-05`
- `Schedule payment Meralco 1500 on 2025-12-05`
- `Prioritize bills if monthly budget is 3000`
- `Show reminders`
- `Renew OTP`

## Notes

- Prioritization uses a simple heuristic: scheduled first, lower amounts next, then earlier due dates. It marks items beyond the monthly budget as overflow.
- Trust score and on-time rate are playful mock metrics for visualization.
- "Stone hit" adds points via a claimable streak button.
- Budgeting form computes allocations and sets the usable monthly bill budget.

This is a concept-only UI to validate flows before backend/API integrations.