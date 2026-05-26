import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// Guarda de rota
onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
        window.location.href = "index.html";
    } else {
        carregarTransacoes(usuario.uid);
    }
});

// Botão sair
document.getElementById('botao-sair').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});

// Alternar parcelas
const seletorPagamento = document.getElementById('tipo-pagamento');
const areaParcelas = document.getElementById('area-parcelas');

seletorPagamento.addEventListener('change', (evento) => {
    if (evento.target.value === 'credito') {
        areaParcelas.style.display = 'block';
    } else {
        areaParcelas.style.display = 'none';
        document.getElementById('parcelas').value = 1;
    }
});

// Submissão do formulário
document.getElementById('formulario-transacao').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!auth.currentUser) {
        alert("Sessão inválida. Faça login novamente.");
        return;
    }

    const botao = document.getElementById('botao-adicionar');
    botao.textContent = 'Salvando...';
    botao.disabled = true;

    const idUsuario = auth.currentUser.uid;
    const descricao = document.getElementById('descricao').value;
    const valorInserido = document.getElementById('valor').value;
    const tipoPagamento = document.getElementById('tipo-pagamento').value;
    const parcelas = document.getElementById('parcelas').value;

    try {
        await addDoc(collection(db, "transacoes"), {
            usuarioId: idUsuario,
            descricao: descricao,
            valor: parseFloat(valorInserido),
            metodoPagamento: tipoPagamento,
            numeroParcelas: tipoPagamento === 'credito' ? parseInt(parcelas) : 1,
            dataHora: serverTimestamp()
        });

        evento.target.reset();
        document.getElementById('area-parcelas').style.display = 'none';

    } catch (erro) {
        console.error("Erro ao gravar dados:", erro);
        alert("Falha de comunicação com o banco de dados.");
    } finally {
        botao.textContent = '+ Adicionar transação';
        botao.disabled = false;
    }
});

// Carregar transações em tempo real
function carregarTransacoes(idUsuario) {
    const transacoesRef = collection(db, "transacoes");
    const q = query(transacoesRef, where("usuarioId", "==", idUsuario));

    onSnapshot(q, (snapshot) => {
        const areaLista = document.getElementById('lista-transacoes');
        const elementoTotal = document.getElementById('valor-total');

        areaLista.innerHTML = '';
        let totalFinancias = 0;

        if (snapshot.empty) {
            areaLista.innerHTML = '<p class="estado-vazio">Nenhuma transação registrada ainda.</p>';
            elementoTotal.innerText = 'R$ 0,00';
            return;
        }

        // Ordenar por data (mais recentes primeiro) — snapshot não garante ordem
        const docs = [];
        snapshot.forEach(d => docs.push(d));

        docs.forEach((documento) => {
            const dados = documento.data();
            const idDoc = documento.id;

            totalFinancias += dados.valor;

            const caixaItem = document.createElement('div');
            caixaItem.className = 'item-transacao';

            let badgeHtml;
            if (dados.metodoPagamento === 'credito') {
                const xLabel = dados.numeroParcelas > 1 ? `${dados.numeroParcelas}x crédito` : 'crédito';
                badgeHtml = `<span class="pill-credito">${xLabel}</span>`;
            } else {
                badgeHtml = `<span class="pill-debito">débito</span>`;
            }

            caixaItem.innerHTML = `
                <div class="detalhes">
                    <span class="descricao">${dados.descricao}</span>
                    <span class="metodo">${badgeHtml}</span>
                </div>
                <div class="acoes">
                    <span class="valor">R$ ${dados.valor.toFixed(2)}</span>
                    <button class="botao-excluir" title="Excluir" aria-label="Excluir transação">×</button>
                </div>
            `;

            const botaoDeletar = caixaItem.querySelector('.botao-excluir');
            botaoDeletar.addEventListener('click', async () => {
                const confirmacao = confirm("Remover esta transação permanentemente?");
                if (confirmacao) {
                    try {
                        await deleteDoc(doc(db, "transacoes", idDoc));
                    } catch (erro) {
                        console.error("Erro ao excluir:", erro);
                        alert("Não foi possível remover a transação.");
                    }
                }
            });

            areaLista.appendChild(caixaItem);
        });

        elementoTotal.innerText = `R$ ${totalFinancias.toFixed(2)}`;
    });
}