
// 1. Importar as funções essenciais do Firebase (via CDN)
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 2. Objeto de configuração do projeto (Copiar do painel do Firebase)
// Importar o serviço 'auth' centralizado
import { auth } from "./firebase-config.js";

// --- LÓGICA DA INTERFACE ---

// Elementos do DOM
const titulo = document.getElementById('titulo-form');
const botaoSubmit = document.getElementById('botao-submit');
const textoAlternar = document.getElementById('texto-alternar');
const linkAlternar = document.getElementById('link-alternar');

let modoELogin = true; 

// Evento para alternar entre Login e Cadastro
linkAlternar.addEventListener('click', () => {
    modoELogin = !modoELogin; 
    
    if (modoELogin) {
        titulo.innerText = 'Acessar Conta';
        botaoSubmit.innerText = 'Entrar';
        textoAlternar.innerText = 'Novo por aqui? ';
        linkAlternar.innerText = 'Crie uma conta';
    } else {
        titulo.innerText = 'Criar Conta';
        botaoSubmit.innerText = 'Cadastrar';
        textoAlternar.innerText = 'Já possui cadastro? ';
        linkAlternar.innerText = 'Faça login';
    }
});



// Evento de submissão do formulário
document.getElementById('formulario-auth').addEventListener('submit', (evento) => {
    evento.preventDefault(); 

    // Capturar os valores digitados
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (modoELogin) {
        // Lógica de Login real
        signInWithEmailAndPassword(auth, email, senha)
            .then((credenciais) => {
                alert("Acesso liberado!");
                // Redireciona para a tela principal
                window.location.href = "dashboard.html"; 
            })
            .catch((erro) => {
                const codigoErro = erro.code;
                alert("Falha no login: " + codigoErro);
            });
    } else {
        // Lógica de Cadastro real
        createUserWithEmailAndPassword(auth, email, senha)
            .then((credenciais) => {
                alert("Conta registrada com sucesso!");
                // Redireciona para a tela principal
                window.location.href = "dashboard.html"; 
            })
            .catch((erro) => {
                const codigoErro = erro.code;
                alert("Falha no cadastro: " + codigoErro);
            });
    }
});