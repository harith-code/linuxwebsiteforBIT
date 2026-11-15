import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  addDoc,
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const channels = [
  { id: "general", name: "general", topic: "A place for Linux conversations and community news." },
  { id: "help", name: "help", topic: "Stuck on something? Ask questions and help each other out." },
  { id: "projects", name: "projects", topic: "Share what you’re building with Linux and open source." },
  { id: "events", name: "events", topic: "Meetups, workshops, install fests, and campus events." },
];

const elements = {
  channelList: document.querySelector("#channel-list"),
  channelName: document.querySelector("#active-channel-name"),
  channelTopic: document.querySelector("#channel-topic"),
  messageList: document.querySelector("#message-list"),
  messageForm: document.querySelector("#message-form"),
  messageInput: document.querySelector("#message-input"),
  sendButton: document.querySelector(".send-button"),
  status: document.querySelector("#status-banner"),
  nameDialog: document.querySelector("#name-dialog"),
  nameForm: document.querySelector("#name-form"),
  nameInput: document.querySelector("#name-input"),
  profileName: document.querySelector("#profile-name"),
  profileAvatar: document.querySelector("#profile-avatar"),
  changeName: document.querySelector("#change-name"),
};

let activeChannel = channels[0];
let currentUser = null;
let auth = null;
let displayName = localStorage.getItem("penguinHubDisplayName") ?? "";
let unsubscribeMessages = null;
let sending = false;

function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
  elements.status.hidden = false;
}

function clearStatus() {
  elements.status.hidden = true;
  elements.status.textContent = "";
  elements.status.classList.remove("error");
}

function renderChannels() {
  elements.channelList.replaceChildren();
  for (const channel of channels) {
    const button = document.createElement("button");
    button.className = `channel-button${channel.id === activeChannel.id ? " active" : ""}`;
    button.type = "button";
    button.setAttribute("aria-current", channel.id === activeChannel.id ? "page" : "false");

    const hash = document.createElement("span");
    hash.className = "channel-hash";
    hash.setAttribute("aria-hidden", "true");
    hash.textContent = "#";
    const name = document.createElement("span");
    name.textContent = channel.name;
    button.append(hash, name);
    button.addEventListener("click", () => selectChannel(channel));
    elements.channelList.append(button);
  }
}

function updateProfile() {
  elements.profileName.textContent = displayName || "Choose a name";
  elements.profileAvatar.textContent = displayName.slice(0, 1).toUpperCase() || "?";
}

function selectChannel(channel) {
  activeChannel = channel;
  elements.channelName.textContent = channel.name;
  elements.channelTopic.textContent = channel.topic;
  elements.messageInput.placeholder = `Message #${channel.name}`;
  elements.messageInput.setAttribute("aria-label", `Message #${channel.name}`);
  renderChannels();
  if (currentUser) subscribeToMessages();
}

function formatTime(timestamp) {
  if (!timestamp) return "just now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp.toDate());
}

function createMessage(message) {
  const item = document.createElement("li");
  item.className = "message";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = message.authorName.slice(0, 1).toUpperCase();

  const body = document.createElement("div");
  body.className = "message-body";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const author = document.createElement("span");
  author.className = "message-author";
  author.textContent = message.authorName;
  const time = document.createElement("time");
  time.className = "message-time";
  time.textContent = formatTime(message.createdAt);
  const text = document.createElement("p");
  text.className = "message-text";
  text.textContent = message.text;
  meta.append(author, time);
  body.append(meta, text);
  item.append(avatar, body);
  return item;
}

function subscribeToMessages() {
  if (unsubscribeMessages) unsubscribeMessages();
  elements.messageList.replaceChildren();
  const messageQuery = query(
    collection(getFirestore(), "channels", activeChannel.id, "messages"),
    orderBy("createdAt", "asc"),
    limit(100),
  );
  unsubscribeMessages = onSnapshot(messageQuery, (snapshot) => {
    clearStatus();
    elements.messageList.replaceChildren();
    if (snapshot.empty) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      const heading = document.createElement("strong");
      heading.textContent = `Welcome to #${activeChannel.name}`;
      const hint = document.createElement("span");
      hint.textContent = "Be the first to start a conversation.";
      empty.append(heading, hint);
      elements.messageList.append(empty);
      return;
    }

    for (const documentSnapshot of snapshot.docs) {
      elements.messageList.append(createMessage(documentSnapshot.data()));
    }
    elements.messageList.scrollTop = elements.messageList.scrollHeight;
  }, (error) => {
    console.error("Could not load messages:", error);
    showStatus("Messages could not be loaded. Check your Firebase setup and Firestore rules.", true);
  });
}

function showNameDialog() {
  elements.nameInput.value = displayName;
  elements.nameDialog.showModal();
  elements.nameInput.focus();
}

async function connect() {
  const configReady = ["apiKey", "authDomain", "projectId", "appId"]
    .every((key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].length > 0);

  if (!configReady) {
    showStatus("Add your Firebase web app settings to firebase-config.js, then enable Anonymous sign-in and create a Firestore database.", true);
    return;
  }

  if (!auth) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      elements.messageInput.disabled = !user;
      elements.sendButton.disabled = !user;
      if (user) subscribeToMessages();
    }, (error) => {
      console.error("Firebase authentication failed:", error);
      showStatus("Could not connect to Firebase. Check that Anonymous sign-in is enabled for your project.", true);
    });
  }

  if (displayName) {
    updateProfile();
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Firebase sign-in failed:", error);
      showStatus("Could not join the chat. Check that Anonymous sign-in is enabled for your project.", true);
    }
  } else {
    showNameDialog();
  }
}

elements.nameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const chosenName = elements.nameInput.value.trim();
  if (chosenName.length < 2 || chosenName.length > 32) {
    elements.nameInput.setCustomValidity("Use a display name between 2 and 32 characters.");
    elements.nameInput.reportValidity();
    return;
  }
  elements.nameInput.setCustomValidity("");
  displayName = chosenName;
  localStorage.setItem("penguinHubDisplayName", displayName);
  updateProfile();
  elements.nameDialog.close();
  if (!currentUser) {
    if (auth) {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Firebase sign-in failed:", error);
        showStatus("Could not join the chat. Check that Anonymous sign-in is enabled for your project.", true);
      }
    } else {
      await connect();
    }
  }
});

elements.nameInput.addEventListener("input", () => elements.nameInput.setCustomValidity(""));
elements.changeName.addEventListener("click", showNameDialog);

elements.messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = elements.messageInput.value.trim();
  if (!text || !currentUser || sending) return;
  sending = true;
  elements.sendButton.disabled = true;
  try {
    await addDoc(collection(getFirestore(), "channels", activeChannel.id, "messages"), {
      authorUid: currentUser.uid,
      authorName: displayName,
      text,
      createdAt: serverTimestamp(),
    });
    elements.messageInput.value = "";
    clearStatus();
  } catch (error) {
    console.error("Could not send message:", error);
    showStatus("Your message could not be sent. Check your Firestore rules and connection.", true);
  } finally {
    sending = false;
    elements.sendButton.disabled = !currentUser;
  }
});

renderChannels();
updateProfile();
connect();
