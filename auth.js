let usuarioAtual = null;

// Verifica se já está logado ao iniciar
async function verificarSessao() {
    const { data, error } = await supabase.auth.getSession();
    if (data && data.session) {
        usuarioAtual = data.session.user;
        atualizarUIAuth(true);
        sincronizarComNuvem(); // Baixa os dados ao entrar
    } else {
        atualizarUIAuth(false);
    }

    // Fica escutando mudanças na autenticação
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            usuarioAtual = session.user;
            atualizarUIAuth(true);
        } else {
            usuarioAtual = null;
            atualizarUIAuth(false);
        }
    });
}

// Atualiza o botão de Perfil no topo
function atualizarUIAuth(logado) {
    const btnAuth = document.getElementById('btn-auth');
    if (!btnAuth) return;
    
    if (logado) {
        btnAuth.innerHTML = '👤 Perfil';
        btnAuth.onclick = () => abrirModalAuth(true); // Abre modal de perfil/sair
    } else {
        btnAuth.innerHTML = 'Entrar';
        btnAuth.onclick = () => abrirModalAuth(false); // Abre modal de login
    }
}

async function loginSupabase(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) {
        mostrarModal("Erro no login: " + error.message);
        return false;
    }
    fecharModalAuth();
    mostrarModal("Login realizado com sucesso! Sincronizando dados...");
    await sincronizarComNuvem();
    return true;
}

async function cadastroSupabase(email, password) {
    if (password.length < 6) {
        mostrarModal("A senha deve ter pelo menos 6 caracteres.");
        return false;
    }
    
    mostrarModal("Criando conta..."); // feedback imediato
    
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });
    
    if (error) {
        mostrarModal("Erro no cadastro: " + error.message);
        return false;
    }
    
    fecharModalAuth();
    
    // O Supabase exige confirmação de email por padrão. Se 'session' for nula, o usuário precisa confirmar.
    if (data.session) {
        mostrarModal("Conta criada com sucesso! Sincronizando dados...");
        await pushParaNuvem();
    } else {
        mostrarModal("Conta criada! O Supabase exige que você confirme o link enviado para o seu e-mail antes de fazer o primeiro login.");
    }
    
    return true;
}

async function logoutSupabase() {
    await supabase.auth.signOut();
    usuarioAtual = null;
    fecharModalAuth();
    mostrarModal("Você saiu da conta.");
}

// -----------------------------------------
// SINCRONIZAÇÃO
// -----------------------------------------

// PULL: Pega da nuvem e injeta no LocalStorage
async function sincronizarComNuvem() {
    if (!usuarioAtual) return;

    try {
        const { data, error } = await supabase
            .from('user_sync')
            .select('*')
            .eq('user_id', usuarioAtual.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado (usuário novo)
            console.error('Erro ao sincronizar:', error);
            return;
        }

        if (data) {
            // Nuvem tem dados, vamos mesclar/substituir o localStorage
            if (data.historico) localStorage.setItem('quiz_pm_historico', JSON.stringify(data.historico));
            if (data.savegame) localStorage.setItem('quiz_pm_saves', JSON.stringify(data.savegame));
            if (data.erros) localStorage.setItem('quiz_pm_erros', JSON.stringify(data.erros));
            
            // Recarrega a UI
            gerarBotoesProvas();
            verificarSaveGame();
            if (typeof atualizarContadorErrosUI === 'function') atualizarContadorErrosUI();
            
            console.log("Sincronização PULL concluída.");
        } else {
            // Se o usuário logou pela primeira vez mas tem dados locais, manda os locais pra nuvem
            await pushParaNuvem();
        }
    } catch (e) {
        console.error("Falha no pull:", e);
    }
}

// PUSH: Manda do LocalStorage para a nuvem
async function pushParaNuvem() {
    if (!usuarioAtual) return; // Se não tem login, só salva local e ignora nuvem

    const historico = JSON.parse(localStorage.getItem('quiz_pm_historico')) || {};
    const saves = JSON.parse(localStorage.getItem('quiz_pm_saves')) || {};
    const erros = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];

    try {
        const payload = {
            user_id: usuarioAtual.id,
            historico: historico,
            savegame: saves,
            erros: erros,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('user_sync')
            .upsert(payload, { onConflict: 'user_id' });

        if (error) console.error('Erro ao salvar na nuvem:', error);
        else console.log('Sincronização PUSH concluída.');
    } catch (e) {
        console.error("Falha no push:", e);
    }
}

// =========================================
// MODAL UI
// =========================================
function abrirModalAuth(logado) {
    const overlay = document.getElementById('modal-auth-overlay');
    if (!overlay) return;
    
    if (logado) {
        document.getElementById('auth-user-email').textContent = usuarioAtual.email;
        alternarPainelAuth('logado');
    } else {
        alternarPainelAuth('login');
    }
    
    overlay.classList.remove('hidden');
}

function fecharModalAuth() {
    const overlay = document.getElementById('modal-auth-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function alternarPainelAuth(painel) {
    document.getElementById('auth-panel-login').style.display = painel === 'login' ? 'block' : 'none';
    document.getElementById('auth-panel-cadastro').style.display = painel === 'cadastro' ? 'block' : 'none';
    document.getElementById('auth-panel-logado').style.display = painel === 'logado' ? 'block' : 'none';
}

function toggleSenha(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

function submeterLogin() {
    const email = document.getElementById('auth-email-login').value;
    const senha = document.getElementById('auth-senha-login').value;
    
    if (!email || !senha) {
        mostrarModal("Preencha email e senha!");
        return;
    }
    loginSupabase(email, senha);
}

function submeterCadastro() {
    const email = document.getElementById('auth-email-cad').value;
    const senha = document.getElementById('auth-senha-cad').value;
    const senhaConfirm = document.getElementById('auth-senha-confirm').value;
    
    if (!email || !senha || !senhaConfirm) {
        mostrarModal("Preencha todos os campos!");
        return;
    }
    
    if (senha !== senhaConfirm) {
        mostrarModal("As senhas não coincidem!");
        return;
    }
    
    cadastroSupabase(email, senha);
}

// Inicia verificação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    verificarSessao();
});
