💸 Finanças

Gerencie suas finanças pessoais com clareza.

Aplicativo web progressivo (PWA) para controle de receitas e despesas, com autenticação segura, histórico em nuvem e painel analítico — tudo acessível no celular ou no navegador, sem instalar nada.

✨ Funcionalidades

Autenticação — login e cadastro via e-mail/senha (Firebase Auth)
Lançamentos — adicione rendas e despesas com descrição, valor, data, categoria, forma de pagamento e observação
Parcelamento — suporte a compras no crédito com divisão automática em parcelas
Dashboard — resumo de rendas, despesas e saldo; gráfico de categorias
Filtros — filtre por tipo (renda / despesa) e por categoria
Edição e exclusão — edite ou remova qualquer transação via modal
PWA — instalável no celular; funciona como app nativo (modo standalone)
Toasts — feedback visual instantâneo para ações e erros, em português


🗂 Estrutura do projeto
app2-main/
├── public/
│   ├── index.html          # Tela de login / cadastro
│   ├── dashboard.html      # Painel principal
│   ├── app.js              # Lógica de autenticação
│   ├── dashboard.js        # Lógica do painel (CRUD, filtros, gráfico)
│   ├── firebase-config.js  # Inicialização do Firebase
│   ├── style.css           # Estilos globais (tema escuro)
│   ├── manifest.json       # Manifesto PWA
│   ├── bump-version.js     # Script para incrementar versão
│   └── version.json        # Versão atual do app
├── firestore.rules         # Regras de segurança do Firestore
├── firestore.indexes.json  # Índices do Firestore
├── firebase.json           # Configuração do Firebase Hosting
└── .firebaserc             # Projeto Firebase vinculado


🚀 Como rodar localmente
Pré-requisitos

Node.js (para o Firebase CLI)
Conta no Firebase com projeto criado

Instalação
# Instale o Firebase CLI globalmente
npm install -g firebase-tools

# Faça login na sua conta
firebase login

# Clone o repositório e entre na pasta
git clone <url-do-repositorio>
cd app2-main

Configuração
Edite public/firebase-config.js com as credenciais do seu projeto Firebase:
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.firebasestorage.app",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};

Rodar em desenvolvimento
firebase serve --only hosting

Acesse http://localhost:5000 no navegador.
Deploy
firebase deploy


🔒 Segurança (Firestore Rules)
Cada usuário só lê e escreve seus próprios documentos:
match /transacoes/{doc} {
  allow read, write: if request.auth != null
                     && request.auth.uid == resource.data.uid;
}


🛠 Tecnologias



Camada
Tecnologia




Frontend
HTML5, CSS3, JavaScript (ES Modules)


Banco de dados
Cloud Firestore


Autenticação
Firebase Auth


Hospedagem
Firebase Hosting


Offline / PWA
Web App Manifest




📦 Versão atual
v1.0.8 — veja public/version.json
Para incrementar a versão:
node public/bump-version.js


📄 Licença
Uso pessoal. Adapte livremente para seus projetos.