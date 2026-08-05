# Team Leave Dashboard

A GitHub Pages dashboard for tracking employee vacation and sick leave using Firebase Firestore.

## Included features

- Circular employee profile buttons with initials
- Hover and selected-profile effects
- Combined vacation and sick leave scorecards
- Used, total, remaining, and progress-bar values
- Add employee function
- Add and delete leave entries
- Approved, pending, and cancelled leave statuses
- Weekends and 2026 public holidays excluded from leave-day calculations
- Public holidays displayed separately and not deducted from employee balances
- Responsive layout for desktop and mobile

## Files

- `index.html`
- `style.css`
- `app.js`

## Firebase setup

1. Create or open a Firebase project.
2. Open **Firestore Database** and create a database.
3. Open **Project Settings**, scroll to **Your apps**, and create a Web App.
4. Copy the Firebase configuration.
5. Open `app.js` and replace the placeholder values inside `firebaseConfig`.
6. In Firestore, use these temporary rules while testing:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

These rules allow anyone with the website link to edit the dashboard. For a private internal tool, add Firebase Authentication later and replace the rules.

## Initial employees

After the site is connected to Firebase, click **Add Employee** and add:

- Zyaam Ali, initials `ZI`
- The second employee, initials `VP`

Default annual allowances are 10 vacation days and 5 sick days.

## GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, and `app.js` to the main branch.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/root`, then save.
