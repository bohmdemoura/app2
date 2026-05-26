// 1. Importações de Autenticação
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 2. Importações do Banco de Dados (Firestore)
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 3. Importação das conexões centralizadas
import { auth, db } from "./firebase-config.js";

// 3. Verificação de Segurança (Guarda de Rota)
onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
        window.location.href = "index.html";
    } else {
        // Quando a verificação de segurança passa, inicia-se a leitura dos dados
        carregarTransacoes(usuario.uid);
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

// --- FUNÇÃO PARA LISTAR TRANSAÇÕES ---
function carregarTransacoes(idUsuario) {
    const transacoesRef = collection(db, "transacoes");
    const q = query(transacoesRef, where("usuarioId", "==", idUsuario));

 onSnapshot(q, (snapshot) => {
        const areaLista = document.getElementById('lista-transacoes');
        const elementoTotal = document.getElementById('valor-total'); // Captura o h2 do painel
        
        areaLista.innerHTML = ''; 
        let totalFinancias = 0; // Variável matemática que inicia zerada

        // Se não houver dados no banco
        if (snapshot.empty) {
            areaLista.innerHTML = '<p style="text-align: center; color: #888;">Nenhuma transação inserida.</p>';
            elementoTotal.innerText = 'R$ 0.00'; // Zera o painel visualmente
            return;
        }

        // Passa por cada documento
        snapshot.forEach((documento) => {
            const dados = documento.data();
            const idDoc = documento.id; 
            
            // Somatório: adiciona o valor atual à variável totalFinancias
            totalFinancias += dados.valor;

            const caixaItem = document.createElement('div');
            caixaItem.className = 'item-transacao';
            
            let textoPagamento = dados.metodoPagamento === 'credito' ? 'Crédito' : 'Débito';
            if (dados.metodoPagamento === 'credito') {
                textoPagamento += ` (${dados.numeroParcelas}x)`;
            }

            caixaItem.innerHTML = `
                <div class="detalhes">
                    <span class="descricao">${dados.descricao}</span>
                    <span class="metodo">${textoPagamento}</span>
                </div>
                <div class="acoes">
                    <span class="valor">R$ ${dados.valor.toFixed(2)}</span>
                    <button class="botao-excluir" title="Excluir item">X</button>
                </div>
            `;
            
            const botaoDeletar = caixaItem.querySelector('.botao-excluir');
            botaoDeletar.addEventListener('click', async () => {
                const confirmacao = confirm("A exclusão será permanente. Deseja continuar?");
                if (confirmacao) {
                    try {
                        await deleteDoc(doc(db, "transacoes", idDoc));
                    } catch (erro) {
                        console.error("Erro ao excluir:", erro);
                        alert("Falha na tentativa de remover a transação.");
                    }
                }
            });

            areaLista.appendChild(caixaItem);
        });

        // Após passar por todos os itens, atualiza a interface com a soma total
        elementoTotal.innerText = `R$ ${totalFinancias.toFixed(2)}`;
    });}