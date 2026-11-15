# Penguin Hub

A small, real-time chat starter for a college Linux community. It uses plain HTML, CSS, and JavaScript with Firebase Authentication and Cloud Firestore.

## Set up Firebase

1. Create a Firebase project and register a **Web app** in the Firebase console.
2. Copy the web app configuration into `firebase-config.js`.
3. In **Authentication → Sign-in method**, enable **Anonymous**.
4. Create a **Cloud Firestore** database.
5. Publish the rules in `firestore.rules` using the Firestore Rules console, or deploy them with the Firebase CLI.
6. In **Authentication → Settings → Authorized domains**, add the hostname you will use to serve the site.

The Firebase web configuration is intended to be present in a browser app. Firestore rules—not hiding the web config—protect access to chat data.

## Run locally

Serve this folder over HTTP; opening `index.html` directly as a `file://` URL will not work with JavaScript modules.

For example, with Python installed:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Install and sign in to the Firebase CLI, then run:

```sh
firebase deploy --only hosting,firestore:rules
```

The configured Hosting root is this folder. If you add private files later, move the public site into a dedicated folder and update `firebase.json`.

## Starter limitations

- Sign-in is anonymous; names are display names, not verified college identities.
- The four channels are currently fixed in `app.js`.
- The latest 100 messages are shown per channel. There is no message editing, moderation UI, or persistent user profile yet.
- Set up Firebase App Check, college-domain sign-in, and moderation before using this as a public or official community service.
