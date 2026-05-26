// Importar apenas as funções necessárias para controle de sessão
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Importar o serviço 'auth' centralizado
import { auth } from "./firebase-config.js";

// 3. Verificação de Segurança (Guarda de Rota)
onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
        // Redireciona para o login se a pessoa não estiver autenticada
        window.location.href = "index.html";
    }
});

// 4. Lógica de Interface: Alternar parcelas
const seletorPagamento = document.getElementById('tipo-pagamento');
const areaParcelas = document.getElementById('area-parcelas');

seletorPagamento.addEventListener('change', (evento) => {
    if (evento.target.value === 'credito') {
        areaParcelas.style.display = 'block'; // Mostra as parcelas
    } else {
        areaParcelas.style.display = 'none';  // Oculta as parcelas
        document.getElementById('parcelas').value = 1; // Retorna ao valor padrão
    }
});

// 5. Lógica de Submissão do Formulário
// 2. Nova Lógica de Submissão do Formulário
document.getElementById('formulario-transacao').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    // Bloqueia o salvamento se não houver conta logada
    if (!auth.currentUser) {
        alert("Sessão inválida. Faça login novamente.");
        return;
    }

    const idUsuario = auth.currentUser.uid;
    const descricao = document.getElementById('descricao').value;
    const valorInserido = document.getElementById('valor').value;
    const tipoPagamento = document.getElementById('tipo-pagamento').value;
    const parcelas = document.getElementById('parcelas').value;

    try {
        // Envio do documento para a coleção "transacoes" no Firestore
        await addDoc(collection(db, "transacoes"), {
            usuarioId: idUsuario,        // Atrela a compra à conta atual
            descricao: descricao,
            valor: parseFloat(valorInserido), // Converte texto para número decimal
            metodoPagamento: tipoPagamento,
            numeroParcelas: tipoPagamento === 'credito' ? parseInt(parcelas) : 1,
            dataHora: serverTimestamp()  // Salva o horário exato do servidor
        });

        alert("Transação registrada com sucesso no banco de dados!");
        
        // Limpa a interface
        evento.target.reset();
        document.getElementById('area-parcelas').style.display = 'none';

    } catch (erro) {
        console.error("Erro ao gravar dados:", erro);
        alert("Falha de comunicação com o banco de dados.");
    }
});