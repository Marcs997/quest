/* ============================================================
   QUEST — initialisation Firebase partagée (app unique).
   Plusieurs modules de jeu (td-sync, morpion-sync) importent `db`
   d'ici : appeler initializeApp deux fois lèverait
   « Firebase App named '[DEFAULT]' already exists ».
   La apiKey n'est PAS un secret (client) ; sécurité = règles RTDB.
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

var firebaseConfig = {
  apiKey: "AIzaSyCXEon4cTLYxCWVDjKceRabli0vV4ZtDTM",
  authDomain: "quest-66c62.firebaseapp.com",
  databaseURL: "https://quest-66c62-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quest-66c62",
  storageBucket: "quest-66c62.firebasestorage.app",
  messagingSenderId: "136055446331",
  appId: "1:136055446331:web:26adbcca8fcac0e857751e"
};

export var db = getDatabase(initializeApp(firebaseConfig));
