import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0xwTlnAmvoezp5WpqcY5ihUbatYloxUE",
  authDomain: "redoxgame1-b5bf0.firebaseapp.com",
  databaseURL: "https://redoxgame1-b5bf0-default-rtdb.firebaseio.com",
  projectId: "redoxgame1-b5bf0",
  storageBucket: "redoxgame1-b5bf0.firebasestorage.app",
  messagingSenderId: "250365886256",
  appId: "1:250365886256:web:4d937b82539209d8ca52f5"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

window._fb = { db, ref, set, get, onValue, update, remove };
