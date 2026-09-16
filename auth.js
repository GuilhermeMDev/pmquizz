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
        // Não apagar o storage aqui! Se a internet estiver ruim, o getSession falha por timeout,
        // mas o usuário ainda pode estar com a sessão válida no aparelho.
        // Só forçamos o modal de login:
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
            // Só zera a tela (a limpeza do storage agora é exclusiva do botão de Sair)
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
        mostrarToast("O servidor do banco de dados não pôde ser carregado.", "error");
        return false;
    }
    
    mostrarToast("Entrando... Aguarde.", "loading");
    
    try {
        const { data, error } = await window.supabaseApp.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        removerToastLoading();
        if (error) {
            mostrarToast(traduzirErroSupabase(error.message), "error");
            return false;
        }
        
        fecharModalAuth();
        mostrarToast("Login realizado com sucesso! Sincronizando...", "success");
        await sincronizarComNuvem();
        return true;
    } catch (e) {
        removerToastLoading();
        mostrarToast("Erro interno: " + (e.message || e.toString()), "error");
        console.error(e);
        return false;
    }
}

async function cadastroSupabase(email, password) {
    if (!window.supabaseApp) {
        mostrarToast("O servidor do banco de dados não pôde ser carregado.", "error");
        return false;
    }

    if (password.length < 6) {
        mostrarToast("A senha deve ter pelo menos 6 caracteres.", "warn");
        return false;
    }
    
    mostrarToast("Criando conta... Aguarde.", "loading");
    
    try {
        const { data, error } = await window.supabaseApp.auth.signUp({
            email: email,
            password: password
        });
        
        removerToastLoading();
        if (error) {
            mostrarToast(traduzirErroSupabase(error.message), "error");
            return false;
        }
        
        fecharModalAuth();
        
        if (data.session) {
            usuarioAtual = data.session.user;
            mostrarToast("Conta criada com sucesso! Sincronizando...", "success");
            await pushParaNuvem();
        } else if (data.user) {
            mostrarToast("Conta criada! Confirme no seu e-mail antes de logar.", "warn");
        }
        
        return true;
    } catch (e) {
        removerToastLoading();
        mostrarToast("Erro interno no cadastro: " + (e.message || e.toString()), "error");
        console.error(e);
        return false;
    }
}

async function logoutSupabase() {
    localStorage.removeItem('quiz_pm_historico');
    localStorage.removeItem('quiz_pm_saves');
    localStorage.removeItem('quiz_pm_erros');
    localStorage.removeItem('quiz_pm_ciclo');
    
    await window.supabaseApp.auth.signOut();
    usuarioAtual = null;
    fecharModalAuth();
    mostrarToast("Você saiu da conta.", "info");
}

// -----------------------------------------
// SINCRONIZAÇÃO
// -----------------------------------------

// PULL: Pega da nuvem e injeta no LocalStorage
async function sincronizarComNuvem() {
    if (!usuarioAtual) return;
    if (!navigator.onLine) {
        console.log("Offline: Pulando sincronização PULL para não travar.");
        return;
    }

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
            if (data.ciclo) localStorage.setItem('quiz_pm_ciclo', JSON.stringify(data.ciclo));
            
            // Recarrega a UI
            gerarBotoesProvas();
            verificarSaveGame();
            if (typeof atualizarContadorErrosUI === 'function') atualizarContadorErrosUI();
            if (typeof atualizarCicloUI === 'function') atualizarCicloUI();
            
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
    if (!navigator.onLine) {
        console.log("Offline: Pulando PUSH (será enviado quando voltar a internet).");
        return;
    }

    const historico = JSON.parse(localStorage.getItem('quiz_pm_historico')) || {};
    const saves = JSON.parse(localStorage.getItem('quiz_pm_saves')) || {};
    const erros = JSON.parse(localStorage.getItem('quiz_pm_erros')) || [];
    const ciclo = JSON.parse(localStorage.getItem('quiz_pm_ciclo')) || {
        ciclosCompletos: 0,
        provasNoAtual: []
    };

    try {
        const payload = {
            user_id: usuarioAtual.id,
            historico: historico,
            savegame: saves,
            erros: erros,
            ciclo: ciclo,
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
    document.getElementById('auth-panel-reset').style.display = painel === 'reset' ? 'block' : 'none';
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
        mostrarToast("Preencha email e senha!", "warn");
        return;
    }
    loginSupabase(email, senha);
}

function submeterCadastro() {
    const email = document.getElementById('auth-email-cad').value;
    const senha = document.getElementById('auth-senha-cad').value;
    const senhaConfirm = document.getElementById('auth-senha-confirm').value;
    
    if (!email || !senha || !senhaConfirm) {
        mostrarToast("Preencha todos os campos!", "warn");
        return;
    }
    
    if (senha !== senhaConfirm) {
        mostrarToast("As senhas não coincidem!", "warn");
        return;
    }
    
    cadastroSupabase(email, senha);
}

// Inicia verificação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    verificarSessao();
});

async function redefinirSenhaSupabase() {
    const email = document.getElementById('auth-email-reset').value;
    if (!email) {
        mostrarToast("Digite seu e-mail primeiro.", "warn");
        return;
    }

    if (!window.supabaseApp) {
        mostrarToast("Erro: Conexão com o banco falhou.", "error");
        return;
    }

    mostrarToast("Enviando link... Aguarde.", "loading");
    
    try {
        const { data, error } = await window.supabaseApp.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });

        removerToastLoading();
        if (error) {
            mostrarToast(traduzirErroSupabase(error.message), "error");
        } else {
            mostrarToast("Link enviado! Verifique sua caixa de entrada.", "success");
            alternarPainelAuth('login');
        }
    } catch (e) {
        removerToastLoading();
        mostrarToast("Erro interno: " + (e.message || e.toString()), "error");
    }
}

// -----------------------------------------
// SINCRONIZAÇÃO AUTOMÁTICA PÓS-OFFLINE
// -----------------------------------------
window.addEventListener('online', () => {
    if (usuarioAtual) {
        console.log("Internet voltou! Sincronizando dados locais pra nuvem...");
        pushParaNuvem();
        mostrarToast("Conexão restaurada. Progresso sincronizado.", "success");
    }
});
