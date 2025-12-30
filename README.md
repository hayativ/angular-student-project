# Final Task — Variant B (Calls)

You will receive the full task statement on paper. Use this README only as a short checklist + run instructions.

---

## How to run

From the **root** directory run:

```bash
npm run install:all
```

- This installs all the dependencies

Then still from the **root** directory run:

```bash
npm run start
```

- This will start **mock-api** + **Angular** together.
- Open the app at: `http://localhost:4200`
- You must see the **Calls list page** working without errors.
- You can start.

---

## Rules

- Do your work **ONLY** in: `frontend/`
- **Do not change** anything in: `mock-api/`
- Keep the **starter folder structure** (create new files inside the existing structure).
- Data models are already prepared here:
  - `frontend/src/app/models`

---

## API endpoints

- `GET /calls?page=&limit=&status=&from=&to=`
- `GET /calls/:id/`
- `POST /calls/:id/start`
- `POST /calls/:id/finish`
- `GET /calls/:id/transcript`

---

## What to do (25 points total)

### 1) Date filter + quick range switcher (5 pts)

Add a **To date** filter and quick range buttons **(only one active at a time)**:

- **Today** (00:00–23:59)
- **This week** (Mon 00:00 – Sun 23:59)
- **This month** (1st day 00:00 – last day 23:59)

### 2) Call details page `/calls/:id` (10 pts)

Create a details view with:

- Full call info (`GET /calls/:id`)
- Transcript **if exists** (`GET /calls/:id/transcript`)
- Buttons to:
  - **Start call** (`POST /calls/:id/start`)
  - **Finish call** (`POST /calls/:id/finish`)
    After start/finish:
- Update the call **status** in the details UI
- Status must also update in the **list page**

### 3) Refactor HTTP usage (5 pts)

- Components must **NOT** use `HttpClient` directly.
- Put all API calls into a dedicated service (e.g. `CallsApiService` / `TicketsApiService`).
- Components must work via **RxJS streams** and call service methods.
- Use RxJS so that:
  - One stream loads the **list** based on filters + pagination + search
  - Another stream handles **actions** (start/finish) with proper loading handling

### 4) Keep UI style consistent (5 pts)

- Match the existing app style (layout, paddings, dropdowns, buttons).

---

## Notes

- Make sure your solution compiles and runs with `npm run start` from the root.
- Keep changes consistent with the starter code.