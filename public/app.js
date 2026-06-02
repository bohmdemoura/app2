import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase-config.js";

// ── Mensagens de erro Firebase em português ──────────
const erroFirebase = {
  'auth/invalid-email':          'E-mail inválido.',
  'auth/user-not-found':         'Nenhuma conta encontrada com este e-mail.',
  'auth/wrong-password':         'Senha incorreta.',
  'auth/invalid-credential':     'E-mail ou senha incorretos.',
  'auth/email-already-in-use':   'Este e-mail já está cadastrado.',
  'auth/weak-password':          'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests':      'Muitas tentativas. Tente novamente mais tarde.',
  'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
};

// ── Toast ────────────────────────────────────────────
function showToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visivel'));
  setTimeout(() => {
    toast.classList.remove('visivel');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
}

// ── DOM ──────────────────────────────────────────────
const titulo       = document.getElementById('titulo-form');
const botaoSubmit  = document.getElementById('botao-submit');
const textoAlternar = document.getElementById('texto-alternar');
const linkAlternar  = document.getElementById('link-alternar');

let modoELogin = true;

linkAlternar.addEventListener('click', () => {
  modoELogin = !modoELogin;
  if (modoELogin) {
    titulo.innerText        = 'Acessar conta';
    botaoSubmit.innerText   = 'Entrar';
    textoAlternar.innerText = 'Novo por aqui? ';
    linkAlternar.innerText  = 'Crie uma conta';
  } else {
    titulo.innerText        = 'Criar conta';
    botaoSubmit.innerText   = 'Cadastrar';
    textoAlternar.innerText = 'Já possui cadastro? ';
    linkAlternar.innerText  = 'Faça login';
  }
});

document.getElementById('formulario-auth').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  botaoSubmit.disabled     = true;
  botaoSubmit.textContent  = modoELogin ? 'Entrando...' : 'Cadastrando...';

  try {
    if (modoELogin) {
      await signInWithEmailAndPassword(auth, email, senha);
    } else {
      await createUserWithEmailAndPassword(auth, email, senha);
    }
    window.location.href = 'dashboard.html';
  } catch (erro) {
    const msg = erroFirebase[erro.code] || 'Ocorreu um erro. Tente novamente.';
    showToast(msg, 'erro');
  } finally {
    botaoSubmit.disabled    = false;
    botaoSubmit.textContent = modoELogin ? 'Entrar' : 'Cadastrar';
  }
});