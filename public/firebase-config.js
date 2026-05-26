// Importar as funções essenciais do Firebase (via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Objeto de configuração único para todo o projeto
const firebaseConfig = {
  apiKey: "AIzaSyBHKhSdK-d19Z0QxH1WJLLlvYWju9uqX1o",
  authDomain: "organizador-de-financias.firebaseapp.com",
  projectId: "organizador-de-financias",
  storageBucket: "organizador-de-financias.firebasestorage.app",
  messagingSenderId: "49499632413",
  appId: "1:49499632413:web:3ba28cffc46511d32b67f4",
  measurementId: "G-7NBYRNM5ZL"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Exportar o serviço de Autenticação para ser usado nos outros arquivos
export const auth = getAuth(app);

// 2. Exportar a conexão com o banco de dados
export const db = getFirestore(app);