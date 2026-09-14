let usuarioAtual = null;

// Verifica se já está logado ao iniciar
async function verificarSessao() {
    const { data, error } = await window.supabaseApp.auth.getSession();
    if (data && data.session) {
        usuarioAtual = data.session.user;
        atualizarUIAuth(true);
        sincronizarComNuvem(); // Baixa os dados ao entrar
        fecharModalAuth(); // Se estiver logado, esconde
    } else {
        atualizarUIAuth(false);
        // MODO OBRIGADO A LOGAR: Limpa o storage local solto e prende na tela de login
        localStorage.removeItem('quiz_pm_historico');
        localStorage.removeItem('quiz_pm_saves');
        localStorage.removeItem('quiz_pm_erros');
        abrirModalAuth(false);
    }

    // Fica escutando mudanças na autenticação
    window.supabaseApp.auth.onAuthStateChange((event, session) => {
        if (session) {
            usuarioAtual = session.user;
            atualizarUIAuth(true);
            sincronizarComNuvem();
            fecharModalAuth();
        } else {
            usuarioAtual = null;
            atualizarUIAuth(false);
            localStorage.removeItem('quiz_pm_historico');
            localStorage.removeItem('quiz_pm_saves');
            localStorage.removeItem('quiz_pm_erros');
            // Zera a tela caso estivesse no meio de uma prova
            if (typeof voltarAoMenu === 'function') voltarAoMenu();
            abrirModalAuth(false);
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

function traduzirErroSupabase(msg) {
    if (!msg) return 'Erro desconhecido.';
    if (msg.includes('Email not confirmed')) return 'Você precisa confirmar seu e-mail antes de entrar. Cheque sua caixa de entrada ou spam!';
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    return msg;
}

async function loginSupabase(email, password) {
    if (!window.supabaseApp) {
        mostrarModal("❌ Erro: O servidor do banco de dados (Supabase) não pôde ser carregado. Verifique sua conexão, VPN ou se há algum bloqueador de anúncios (AdBlock) ativo na página.");
        return false;
    }
    
    mostrarModal("Entrando... Aguarde.");
    
    try {
        const { data, error } = await window.supabaseApp.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            mostrarModal("❌ Falha no login: " + traduzirErroSupabase(error.message));
            return false;
        }
        
        fecharModalAuth();
        mostrarModal("✅ Login realizado com sucesso! Sincronizando dados...");
        await sincronizarComNuvem();
        return true;
    } catch (e) {
        mostrarModal("❌ Erro interno: " + (e.message || e.toString()));
        console.error(e);
        return false;
    }
}

async function cadastroSupabase(email, password) {
    if (!window.supabaseApp) {
        mostrarModal("❌ Erro: O servidor do banco de dados (Supabase) não pôde ser carregado. Verifique sua conexão, VPN ou se há algum bloqueador de anúncios (AdBlock) ativo na página.");
        return false;
    }

    if (password.length < 6) {
        mostrarModal("A senha deve ter pelo menos 6 caracteres.");
        return false;
    }
    
    mostrarModal("Criando conta... Aguarde."); // feedback imediato
    
    try {
        const { data, error } = await window.supabaseApp.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            mostrarModal("❌ Erro no cadastro: " + traduzirErroSupabase(error.message));
            return false;
        }
        
        fecharModalAuth();
        
        // Se a conta for criada e já logar (confirm email desativado)
        if (data.session) {
            usuarioAtual = data.session.user; // garante que tem o usuário atual setado antes do push
            mostrarModal("✅ Conta criada com sucesso! Sincronizando dados...");
            await pushParaNuvem();
        } else if (data.user) {
            // Conta criada, mas precisa confirmar e-mail
            mostrarModal("⚠️ Conta criada! O Supabase exige que você clique no link enviado para o seu e-mail antes de fazer o login.");
        }
        
        return true;
    } catch (e) {
        mostrarModal("❌ Erro interno no cadastro: " + (e.message || e.toString()));
        console.error(e);
        return false;
    }
}

async function logoutSupabase() {
    await window.supabaseApp.auth.signOut();
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
        const { data, error } = await window.supabaseApp
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

        const { error } = await window.supabaseApp
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
