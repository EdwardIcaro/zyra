// packages/client/src/main.ts

import { Application, Assets } from 'pixi.js';
import { Game } from './game/Game';
import { ItemRegistry } from '@zyra/shared';

const API_URL = 'http://localhost:2567';

/**
 * Carrega TODOS os assets dinamicamente consultando o servidor
 */
async function loadAllAssets(): Promise<void> {
    console.log('📦 Carregando assets do jogo...');
    
    const folders = ['bodies', 'faces', 'hats'];
    const allAliases: string[] = [];

    for (const folder of folders) {
        try {
            const res = await fetch(`${API_URL}/api/admin/assets/${folder}`);
            
            if (!res.ok) {
                console.warn(`⚠️ Não foi possível carregar ${folder}`);
                continue;
            }

            const files: string[] = await res.json();
            
            console.log(`✅ Encontrados ${files.length} arquivos em ${folder}`);

            files.forEach((file: string) => {
                // Remove extensão .png para criar alias
                const alias = file.replace('.png', '').replace('.jpg', '');
                
                Assets.add({ 
                    alias, 
                    src: `/assets/sprites/${folder}/${file}` 
                });
                
                allAliases.push(alias);
            });
        } catch (e) {
            console.error(`❌ Erro ao carregar ${folder}:`, e);
        }
    }

    // Adicionar sprite vazio (para quando não houver equipamento)
    Assets.add({ 
        alias: 'none', 
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' 
    });
    allAliases.push('none');

    // Carregar todos de uma vez
    console.log(`🔄 Carregando ${allAliases.length} assets...`);
    
    try {
        await Assets.load(allAliases);
        console.log('✅ Todos os assets foram carregados com sucesso!');
    } catch (e) {
        console.error('❌ Erro ao carregar assets:', e);
        throw e;
    }
}

/**
 * Inicialização principal
 */
async function syncGameData() {
    try {
        console.log("📦 Sincronizando templates com o servidor...");
        const response = await fetch('http://localhost:2567/api/items');
        const items = await response.json();
        
        // Alimenta o registro do cliente com os dados do banco
        ItemRegistry.setTemplates(items);
        
        console.log(`✅ ${items.length} itens carregados do servidor.`);
        
        // ✅ Log de itens equipáveis no client
        items.forEach((item: any) => {
            if (item.isEquipable) {
                console.log(`   ✓ ${item.id} → slot: ${item.equipSlot}`);
            }
        });
    } catch (e) {
        console.error("❌ Falha ao sincronizar itens:", e);
    }
}

// ✅ Chamar ANTES de iniciar o jogo
async function init() {
    const app = new Application();
    
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true
    });

    document.body.appendChild(app.canvas as HTMLCanvasElement);

    app.canvas.style.position = "absolute";
    app.canvas.style.top = "0";
    app.canvas.style.left = "0";
    app.canvas.style.zIndex = "1";
    
    try {
        await loadAllAssets();
        await syncGameData(); // ✅ NOVO: Sincronizar itens do servidor
    } catch (e) {
        console.error('❌ Falha crítica ao carregar recursos!');
        alert('Erro ao carregar recursos do jogo. Verifique o console.');
        return;
    }

    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');

    const game = new Game(app);
    game.start();

    window.addEventListener('resize', () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        game.onResize(window.innerWidth, window.innerHeight);
    });
}

// ✅ Manter focus handler
window.addEventListener('mousedown', () => {
    window.focus();
});

init();