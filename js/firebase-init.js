/* ============================================================
   PUNTO LÍMITE — firebase-init.js
   Inicialización compartida de Firebase
   ============================================================ */
var firebaseConfig = {
  apiKey:            "AIzaSyDikKPo-jMlmJF0X7Cpq9GtTuZYnbexIS0",
  authDomain:        "punto-limite.firebaseapp.com",
  projectId:         "punto-limite",
  storageBucket:     "punto-limite.firebasestorage.app",
  messagingSenderId: "217001102203",
  appId:             "1:217001102203:web:7138e31e3b14977db7cbde"
};
firebase.initializeApp(firebaseConfig);
var db      = firebase.firestore();
var storage = firebase.storage();
